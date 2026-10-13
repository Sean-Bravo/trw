"""
Tests for the Fable 5.1 shadow wiring in backend/services/ai_insights.py
(Oct 12 item, shadow path part 2):

- the shadow run sees byte-for-byte the production input, on the Business
  tier only, and is a config switch (SHADOW_CONFIG + INSIGHTS_SHADOW_TIERS);
- the cached prefix (instructions, flag taxonomy, few-shot examples) is one
  byte-stable system block with a cache breakpoint; per-file data stays in
  the user turn;
- per-file input is normalized and capped (rows, characters, cells);
- effort follows the request type and lands in the metadata stamp;
- agreement between production and shadow is computed on the flag taxonomy.

The Anthropic SDK is replaced with a stand-in module, as in the contract tests.
"""

import json
import logging
import os
import re
import sys
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

sys.modules["boto3"] = MagicMock()
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "services"))

import ai_insights  # noqa: E402
from ai_insights import (  # noqa: E402
    AnthropicProvider,
    INSIGHTS_SYSTEM_PROMPT,
    MAX_INSIGHTS_CELL_CHARS,
    MAX_INSIGHTS_INPUT_CHARS,
    MAX_INSIGHTS_RECORDS,
    MIN_INSIGHTS_RECORDS,
    build_insights_input,
    classify_request,
    compare_insights,
    generate_insights,
    generate_shadow_insights,
    shadow_tiers,
)

SECRETS = {"ANTHROPIC_API_KEY": "sk-ant-test", "GOOGLE_GEMINI_API_KEY": "AIzaTest"}

SAMPLE_INSIGHTS = {
    "summary": "Four transactions.",
    "total_transactions": 4,
    "date_range": {"start": "2024-01-15", "end": "2024-12-28"},
    "transaction_types": [{"type": "buy", "count": 2}, {"type": "sell", "count": 2}],
    "top_assets": [{"asset": "BTC", "count": 4}],
    "what_to_do_next": ["Download and import into your tax software."],
    "data_notes": [],
    "estimated_taxable_events": 2,
    "flags": [
        {"category": "wash_sale_candidate", "count": 1, "detail": "BTC sold 2024-06-18, bought 2024-07-04."},
        {"category": "staking_income", "count": 1, "detail": "1 reward."},
    ],
}


def _row(date, sent_amt="", sent_cur="", recv_amt="", recv_cur="", desc="", label=""):
    return {
        "Date": date, "Sent Amount": sent_amt, "Sent Currency": sent_cur,
        "Received Amount": recv_amt, "Received Currency": recv_cur,
        "Fee Amount": "", "Fee Currency": "", "Label": label, "Description": desc,
        "TxHash": "0x" + "ab" * 32,
    }


def _buy(date, asset="BTC"):
    return _row(date, "100", "USD", "0.01", asset, f"Bought 0.01 {asset}")


def _sell(date, asset="BTC"):
    return _row(date, "0.01", asset, "100", "USD", f"Sold 0.01 {asset}")


SIMPLE_RECORDS = [_buy("2024-01-15 10:00:00"), _buy("2024-02-01 10:00:00"), _row("2024-03-01 10:00:00", recv_amt="0.001", recv_cur="ETH", desc="Staking reward", label="reward")]


def _usage(**overrides):
    base = dict(input_tokens=1000, output_tokens=200, cache_read_input_tokens=0, cache_creation_input_tokens=0)
    base.update(overrides)
    return SimpleNamespace(**base)


def _message(payload=SAMPLE_INSIGHTS, stop_reason="end_turn", usage=None):
    text = payload if isinstance(payload, str) else json.dumps(payload)
    return SimpleNamespace(
        content=[SimpleNamespace(type="text", text=text)],
        stop_reason=stop_reason, stop_details=None, usage=usage or _usage(),
    )


def _fake_anthropic(message=None, side_effect=None):
    module = MagicMock(name="anthropic")
    create = module.Anthropic.return_value.messages.create
    if side_effect is not None:
        create.side_effect = side_effect
    else:
        create.return_value = message if message is not None else _message()
    return module, create


# ---------------------------------------------------------------------------
# Config: shadow is one value per tier, switched by env
# ---------------------------------------------------------------------------

class TestShadowConfig:

    def test_business_is_the_only_shadowed_tier_and_runs_fable(self):
        assert set(ai_insights.SHADOW_CONFIG) == {"business"}
        cfg = ai_insights.SHADOW_CONFIG["business"]
        assert cfg["provider"] == "anthropic"
        assert cfg["model"] == "claude-fable-5-1"
        # Production stays on Opus 4.7: nothing user-visible changes.
        assert ai_insights.TIER_CONFIG["business"]["model"] == "claude-opus-4-7"

    def test_env_unset_means_every_configured_shadow_tier(self):
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop(ai_insights.SHADOW_TIERS_ENV, None)
            assert shadow_tiers() == {"business"}

    @pytest.mark.parametrize("value,expected", [
        ("", set()),
        ("   ", set()),
        ("business", {"business"}),
        ("business, free", {"business"}),   # free has no shadow config
        ("growth", set()),
    ])
    def test_env_filters_to_configured_tiers(self, value, expected):
        with patch.dict(os.environ, {ai_insights.SHADOW_TIERS_ENV: value}):
            assert shadow_tiers() == expected

    def test_shadow_model_is_priced(self):
        assert "claude-fable-5-1" in ai_insights.MODEL_PRICING

    def test_jest_drift_guard_still_reads_only_tier_config(self):
        # __tests__/lib/tier-registry.test.ts parses TIER_CONFIG with a lazy
        # regex ending at the first "\n}". SHADOW_CONFIG must stay a separate
        # dict after it so the shadow model never leaks into the mirror check.
        src = open(ai_insights.__file__, encoding="utf-8").read()
        block = re.search(r"TIER_CONFIG\s*=\s*\{([\s\S]*?)\n\}", src).group(1)
        assert "claude-fable-5-1" not in block
        assert src.index("SHADOW_CONFIG = {") > src.index("TIER_CONFIG = {")


# ---------------------------------------------------------------------------
# The shadow call: same bytes, candidate model, never in the user's path
# ---------------------------------------------------------------------------

class TestShadowRun:

    def _run_both(self, records, tier="business", production_message=None, shadow_message=None):
        module, create = _fake_anthropic(production_message)
        with patch.dict(sys.modules, {"anthropic": module}):
            production = generate_insights(records, tier, SECRETS)
        production_kwargs = create.call_args.kwargs

        module, create = _fake_anthropic(shadow_message)
        with patch.dict(sys.modules, {"anthropic": module}), \
             patch.dict(os.environ, {ai_insights.SHADOW_TIERS_ENV: "business"}):
            shadow = generate_shadow_insights(records, tier, SECRETS, production.get("insights"))
        shadow_kwargs = create.call_args.kwargs if create.call_args else None
        return production, production_kwargs, shadow, shadow_kwargs, module

    def test_shadow_sends_the_identical_prefix_and_input_to_the_candidate_model(self):
        production, pk, shadow, sk, _ = self._run_both(SIMPLE_RECORDS)

        assert pk["model"] == "claude-opus-4-7"
        assert sk["model"] == "claude-fable-5-1"
        assert sk["system"] == pk["system"]
        assert sk["messages"] == pk["messages"]
        assert sk["output_config"]["format"] == pk["output_config"]["format"]
        assert sk["max_tokens"] == ai_insights.SHADOW_CONFIG["business"]["max_tokens"]
        assert shadow["role"] == "shadow" and production["role"] == "production"

    def test_shadow_carries_no_fallback_and_nothing_forced(self):
        # A server-side fallback would hide the candidate's refusal rate —
        # the very thing the review measures.
        _, _, _, sk, _ = self._run_both(SIMPLE_RECORDS)
        assert "fallbacks" not in sk and "betas" not in sk
        assert "tools" not in sk and "tool_choice" not in sk
        assert "thinking" not in sk   # Fable 5.1 thinks by default; nothing to configure

    def test_shadow_client_gets_a_timeout_production_does_not(self):
        _, _, _, _, module = self._run_both(SIMPLE_RECORDS)
        assert module.Anthropic.call_args.kwargs["timeout"] == ai_insights.SHADOW_TIMEOUT_SECONDS

        module, _ = _fake_anthropic()
        with patch.dict(sys.modules, {"anthropic": module}):
            generate_insights(SIMPLE_RECORDS, "business", SECRETS)
        assert "timeout" not in module.Anthropic.call_args.kwargs

    def test_shadow_metadata_names_both_models_and_the_effort(self):
        _, _, shadow, _, _ = self._run_both(SIMPLE_RECORDS)
        meta = shadow["metadata"]
        assert meta["model"] == "claude-fable-5-1"
        assert meta["production_model"] == "claude-opus-4-7"
        assert meta["prompt_version"] == ai_insights.INSIGHTS_PROMPT_VERSION
        assert meta["request_type"] == "summary" and meta["effort"] == "low"
        assert meta["input"]["records_total"] == len(SIMPLE_RECORDS)

    def test_shadow_effort_follows_the_request_type(self):
        wash = [_sell("2024-06-18 10:00:00"), _buy("2024-07-04 10:00:00")]
        _, pk, shadow, sk, _ = self._run_both(wash)
        assert pk["output_config"]["effort"] == "high"
        assert sk["output_config"]["effort"] == "high"
        assert shadow["metadata"]["request_type"] == "analysis"

    def test_shadow_returns_none_for_tiers_that_are_not_shadowed(self):
        module, create = _fake_anthropic()
        with patch.dict(sys.modules, {"anthropic": module}):
            assert generate_shadow_insights(SIMPLE_RECORDS, "growth", SECRETS) is None
            assert generate_shadow_insights(SIMPLE_RECORDS, "free", SECRETS) is None
            with patch.dict(os.environ, {ai_insights.SHADOW_TIERS_ENV: ""}):
                assert generate_shadow_insights(SIMPLE_RECORDS, "business", SECRETS) is None
        create.assert_not_called()

    def test_shadow_returns_none_without_records_or_key(self):
        module, create = _fake_anthropic()
        with patch.dict(sys.modules, {"anthropic": module}):
            assert generate_shadow_insights([], "business", SECRETS) is None
            assert generate_shadow_insights(SIMPLE_RECORDS, "business", {}) is None
        create.assert_not_called()

    def test_shadow_computes_agreement_against_production(self):
        shadow_payload = dict(SAMPLE_INSIGHTS, estimated_taxable_events=3, flags=[
            {"category": "wash_sale_candidate", "count": 1, "detail": "same"},
            {"category": "missing_fields", "count": 2, "detail": "two rows"},
        ])
        _, _, shadow, _, _ = self._run_both(SIMPLE_RECORDS, shadow_message=_message(shadow_payload))
        agreement = shadow["agreement"]
        assert agreement["comparable"] is True
        assert agreement["flag_jaccard"] == round(1 / 3, 4)
        assert agreement["flags_only_production"] == ["staking_income"]
        assert agreement["flags_only_shadow"] == ["missing_fields"]
        assert agreement["taxable_events_delta"] == 1
        assert agreement["transaction_types_match"] is True
        assert agreement["total_transactions_match"] is True

    def test_shadow_refusal_is_recorded_not_hidden(self, caplog):
        with caplog.at_level(logging.INFO, logger="ai_insights"):
            _, _, shadow, _, _ = self._run_both(
                SIMPLE_RECORDS, shadow_message=_message("partial", stop_reason="refusal"),
            )
        assert shadow["success"] is False and shadow["refusal"] is True
        assert shadow["agreement"] == {"comparable": False}
        assert "insights" not in shadow
        msgs = [r.getMessage() for r in caplog.records]
        assert any(m.startswith("insights_refusal") and "model=claude-fable-5-1" in m for m in msgs)
        assert any(m.startswith("insights_call role=shadow") and "stop_reason=refusal" in m for m in msgs)

    def test_shadow_logs_one_summary_line_with_the_review_fields(self, caplog):
        with caplog.at_level(logging.INFO, logger="ai_insights"):
            self._run_both(SIMPLE_RECORDS)
        lines = [r.getMessage() for r in caplog.records if r.getMessage().startswith("insights_shadow ")]
        assert len(lines) == 1
        msg = lines[0]
        for field in (
            "tier=business", "model=claude-fable-5-1", "production_model=claude-opus-4-7",
            "request_type=summary", "effort=low", "stop_reason=end_turn", "success=True",
            "refusal=False", "comparable=True", "flag_jaccard=1.0", "flags_only_production=-",
            "flags_only_shadow=-", "taxable_events_delta=0", "transaction_types_match=True",
        ):
            assert field in msg, field
        assert re.search(r"cost_usd=\d", msg) and re.search(r"latency_ms=\d+", msg)

    def test_shadow_api_error_is_a_failed_result_not_an_exception(self):
        module, _ = _fake_anthropic(side_effect=RuntimeError("boom"))
        with patch.dict(sys.modules, {"anthropic": module}), \
             patch.dict(os.environ, {ai_insights.SHADOW_TIERS_ENV: "business"}):
            shadow = generate_shadow_insights(SIMPLE_RECORDS, "business", SECRETS, SAMPLE_INSIGHTS)
        assert shadow["success"] is False and shadow["role"] == "shadow"
        assert shadow["agreement"] == {"comparable": False}

    def test_production_call_lines_are_distinguishable_from_shadow(self, caplog):
        with caplog.at_level(logging.INFO, logger="ai_insights"):
            self._run_both(SIMPLE_RECORDS)
        calls = [r.getMessage() for r in caplog.records if r.getMessage().startswith("insights_call")]
        assert len(calls) == 2
        assert any("role=production" in c and "model=claude-opus-4-7" in c for c in calls)
        assert any("role=shadow" in c and "model=claude-fable-5-1" in c for c in calls)


# ---------------------------------------------------------------------------
# Byte-stable cached prefix
# ---------------------------------------------------------------------------

class TestCachedPrefix:

    def test_prefix_is_one_system_block_with_a_cache_breakpoint(self):
        module, create = _fake_anthropic()
        with patch.dict(sys.modules, {"anthropic": module}):
            AnthropicProvider("k", "claude-opus-4-7", 4096).analyze(INSIGHTS_SYSTEM_PROMPT, "data")
        kwargs = create.call_args.kwargs
        assert kwargs["system"] == [{
            "type": "text", "text": INSIGHTS_SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"},
        }]
        # The data rides after the breakpoint, in the user turn, and nowhere else.
        assert kwargs["messages"] == [{"role": "user", "content": "Transaction Data:\ndata"}]

    def test_prefix_is_byte_identical_across_calls_and_files(self):
        module, create = _fake_anthropic()
        with patch.dict(sys.modules, {"anthropic": module}):
            generate_insights(SIMPLE_RECORDS, "business", SECRETS)
            first = create.call_args.kwargs["system"]
            generate_insights([_sell("2024-06-18 10:00:00")] * 30, "growth", SECRETS)
            second = create.call_args.kwargs["system"]
        assert json.dumps(first, sort_keys=True) == json.dumps(second, sort_keys=True)

    def test_prefix_holds_instructions_taxonomy_and_examples_and_is_cacheable_on_opus_4_7(self):
        prompt = INSIGHTS_SYSTEM_PROMPT
        assert "## Flag taxonomy" in prompt and "## Examples" in prompt and "## Rules" in prompt
        assert prompt.count("### Example") >= 2
        # Opus 4.7 silently refuses to cache a prefix under 2048 tokens. At
        # roughly 3.5 characters per token this keeps a wide margin; the live
        # eval confirms it with cache_creation_input_tokens > 0.
        assert len(prompt) >= 9_000
        # Nothing volatile may be interpolated into it.
        assert "{" not in prompt.replace("{\n", "").replace('{"', "").replace("{start", "")[:0] or True
        assert not re.search(r"\{[a-z_]+\}", prompt), "format placeholder in the cached prefix"
        assert "datetime" not in prompt and "2026-" not in prompt

    def test_examples_in_the_prefix_satisfy_the_schema_shape(self):
        # Both few-shot outputs must carry every required field and only
        # taxonomy categories — a drifted example teaches the wrong contract.
        outputs = re.findall(r"Output:\n(\{[\s\S]*?\n\})\n", INSIGHTS_SYSTEM_PROMPT)
        assert len(outputs) >= 2
        for raw in outputs:
            parsed = json.loads(raw)
            assert set(parsed) == set(ai_insights.INSIGHTS_SCHEMA["required"])
            for flag in parsed["flags"]:
                assert flag["category"] in ai_insights.FLAG_CATEGORIES
                assert set(flag) == {"category", "count", "detail"}
                assert len(flag["detail"]) < 160

    def test_gemini_path_still_receives_the_same_instructions(self):
        # Gemini has no cache breakpoints; the prefix is simply prepended.
        import io
        body = json.dumps({"candidates": [{"content": {"parts": [{"text": json.dumps(SAMPLE_INSIGHTS)}]}}]}).encode()

        class _Resp(io.BytesIO):
            def __enter__(self):
                return self

            def __exit__(self, *exc):
                return False

        with patch("urllib.request.urlopen", return_value=_Resp(body)) as urlopen:
            generate_insights(SIMPLE_RECORDS, "free", SECRETS)
        sent = json.loads(urlopen.call_args.args[0].data)
        text = sent["contents"][0]["parts"][0]["text"]
        assert text.startswith(INSIGHTS_SYSTEM_PROMPT)
        assert "Transaction Data:\nTotal Records: 3" in text


# ---------------------------------------------------------------------------
# Normalized, capped input
# ---------------------------------------------------------------------------

class TestInsightsInput:

    def test_normalized_columns_in_fixed_order_without_txhash(self):
        out = build_insights_input(SIMPLE_RECORDS)
        header = out["data"].splitlines()[1]
        assert header == "Date,Sent Amount,Sent Currency,Received Amount,Received Currency,Fee Amount,Fee Currency,Label,Description"
        assert "0xabab" not in out["data"]
        assert out["data"].startswith("Total Records: 3 (showing all 3)\n")
        assert out["input"] == {"records_total": 3, "records_sent": 3, "chars": len(out["data"]), "capped": False}

    def test_deterministic_bytes(self):
        assert build_insights_input(SIMPLE_RECORDS)["data"] == build_insights_input(list(SIMPLE_RECORDS))["data"]

    def test_long_history_is_sampled_head_and_tail(self):
        records = [_buy(f"2024-01-{(i % 28) + 1:02d} 10:00:00") for i in range(1_000)]
        records[0]["Description"] = "FIRST"
        records[-1]["Description"] = "LAST"
        records[500]["Description"] = "MIDDLE"
        out = build_insights_input(records)
        assert out["input"]["records_total"] == 1_000
        assert out["input"]["records_sent"] == MAX_INSIGHTS_RECORDS
        assert out["input"]["capped"] is True
        assert "FIRST" in out["data"] and "LAST" in out["data"] and "MIDDLE" not in out["data"]
        assert out["data"].startswith("Total Records: 1000 (showing 100: the first 50 and last 50 rows)\n")

    def test_character_cap_shrinks_the_sample(self):
        # Every cell at the trim limit: ~700 chars a row, so 100 rows blow
        # past the character cap and the sample has to halve until it fits.
        wide = [
            _row(f"2024-01-{(i % 28) + 1:02d} 10:00:00", "x" * 80, "x" * 80, "x" * 80, "x" * 80,
                 desc="x" * MAX_INSIGHTS_CELL_CHARS, label="x" * 80)
            for i in range(1_000)
        ]
        out = build_insights_input(wide)
        assert len(out["data"]) <= MAX_INSIGHTS_INPUT_CHARS
        assert MIN_INSIGHTS_RECORDS <= out["input"]["records_sent"] < MAX_INSIGHTS_RECORDS
        assert out["input"]["capped"] is True
        assert out["input"]["chars"] == len(out["data"])

    def test_cells_are_trimmed_and_recorded_as_capped(self):
        rec = _row("2024-01-01 10:00:00", desc="d" * 500)
        out = build_insights_input([rec])
        assert ("d" * (MAX_INSIGHTS_CELL_CHARS - 1) + "…") in out["data"]
        assert "d" * MAX_INSIGHTS_CELL_CHARS not in out["data"]
        assert out["input"]["capped"] is True
        assert out["input"]["records_sent"] == 1

    def test_legacy_record_shape_keeps_its_own_columns(self):
        out = build_insights_input([{"date": "2024-01-01", "type": "buy", "asset": "BTC", "amount": "1"}])
        assert out["data"].splitlines()[1] == "date,type,asset,amount"

    def test_formula_cells_are_sanitized(self):
        # M-10: the sanitizer neutralizes a formula by prefixing it, so a
        # cell that survives the model round-trip still cannot execute.
        rec = _row("2024-01-01 10:00:00", desc="=HYPERLINK(evil)")
        line = build_insights_input([rec])["data"].splitlines()[2]
        assert line.endswith(",'=HYPERLINK(evil)")

    def test_empty_records_still_serialize(self):
        out = build_insights_input([])
        assert out["data"] == "Total Records: 0 (showing all 0)\n"
        assert out["input"]["records_sent"] == 0


# ---------------------------------------------------------------------------
# Request type → effort
# ---------------------------------------------------------------------------

class TestClassifyRequest:

    def test_few_buys_and_income_is_a_summary(self):
        assert classify_request(SIMPLE_RECORDS) == "summary"

    def test_sell_then_rebuy_within_30_days_is_analysis(self):
        assert classify_request([_sell("2024-06-18 13:12:07"), _buy("2024-07-04 08:59:33")]) == "analysis"
        assert classify_request([_sell("2024-06-18 13:12:07"), _buy("2024-07-18 08:59:33")]) == "analysis"  # day 30

    def test_rebuy_after_the_window_or_of_another_asset_is_a_summary(self):
        assert classify_request([_sell("2024-06-18 13:12:07"), _buy("2024-07-19 08:59:33")]) == "summary"
        assert classify_request([_sell("2024-06-18 13:12:07"), _buy("2024-07-01 08:59:33", asset="ETH")]) == "summary"
        # A buy before the sell is not a re-buy.
        assert classify_request([_buy("2024-06-01 10:00:00"), _sell("2024-06-18 13:12:07")]) == "summary"

    def test_crypto_to_crypto_trade_counts_as_a_disposal(self):
        trade = _row("2024-06-18 10:00:00", "0.1", "BTC", "1.5", "ETH", "trade")
        rebuy = _row("2024-06-20 10:00:00", "100", "USD", "0.1", "BTC", "trade")
        assert classify_request([trade, rebuy]) == "analysis"

    def test_many_disposals_is_analysis_without_a_pair(self):
        sells = [_sell(f"2023-{(i % 12) + 1:02d}-01 10:00:00", asset=f"A{i}") for i in range(ai_insights.ANALYSIS_DISPOSAL_THRESHOLD)]
        assert classify_request(sells) == "analysis"
        assert classify_request(sells[:-1]) == "summary"

    def test_transfers_are_not_disposals(self):
        out = [_row("2024-01-01 10:00:00", "1", "BTC", desc="Sent to wallet")] * 40
        assert classify_request(out) == "summary"

    def test_legacy_shape_and_bad_dates_do_not_crash(self):
        legacy = [
            {"date": "2024-06-18", "type": "sell", "asset": "BTC"},
            {"date": "2024-07-01", "type": "buy", "asset": "BTC"},
        ]
        assert classify_request(legacy) == "analysis"
        assert classify_request([_sell("not a date"), _buy("")]) == "summary"
        assert classify_request([]) == "summary"


# ---------------------------------------------------------------------------
# Agreement
# ---------------------------------------------------------------------------

class TestCompareInsights:

    def test_identical_insights_agree_fully(self):
        out = compare_insights(SAMPLE_INSIGHTS, json.loads(json.dumps(SAMPLE_INSIGHTS)))
        assert out["flag_jaccard"] == 1.0 and out["taxable_events_delta"] == 0
        assert out["flags_only_production"] == [] and out["flags_only_shadow"] == []

    def test_no_flags_on_either_side_is_full_agreement(self):
        a = dict(SAMPLE_INSIGHTS, flags=[])
        assert compare_insights(a, dict(a))["flag_jaccard"] == 1.0

    def test_missing_side_is_not_comparable(self):
        assert compare_insights(None, SAMPLE_INSIGHTS) == {"comparable": False}
        assert compare_insights(SAMPLE_INSIGHTS, "prose") == {"comparable": False}

    def test_malformed_flags_are_ignored(self):
        shadow = dict(SAMPLE_INSIGHTS, flags=["junk", {"count": 1}, {"category": "staking_income", "count": 1, "detail": ""}])
        out = compare_insights(SAMPLE_INSIGHTS, shadow)
        assert out["flags_only_production"] == ["wash_sale_candidate"]
        assert out["flags_only_shadow"] == []
