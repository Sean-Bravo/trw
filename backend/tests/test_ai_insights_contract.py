"""
Tests for the insights contract in backend/services/ai_insights.py — the
schema the model must satisfy and how the response is turned into the
insights dict the processor uploads.

The Anthropic SDK is replaced with a stand-in module so the request the
provider builds can be inspected without a network call or an API key.
"""

import io
import json
import re
import sys
import os
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

# Patch external deps before import
sys.modules["boto3"] = MagicMock()

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "services"))

import ai_insights  # noqa: E402
from ai_insights import (  # noqa: E402
    AnthropicProvider,
    GoogleProvider,
    INSIGHTS_INVALID,
    INSIGHTS_SCHEMA,
    INSIGHTS_TRUNCATED,
    INSIGHTS_UNAVAILABLE,
    _normalize_insights,
)


SAMPLE_INSIGHTS = {
    "summary": "Your Coinbase export contains 4 transactions.",
    "total_transactions": 4,
    "date_range": {"start": "2024-01-15", "end": "2024-12-28"},
    "transaction_types": [
        {"type": "buy", "count": 2},
        {"type": "sell", "count": 1},
        {"type": "staking", "count": 1},
    ],
    "top_assets": [{"asset": "BTC", "count": 3}, {"asset": "ETH", "count": 1}],
    "what_to_do_next": ["Download and import into your tax software"],
    "data_notes": ["Found 1 staking reward (taxable as income)"],
    "estimated_taxable_events": 2,
}


def _usage(**overrides):
    base = dict(
        input_tokens=1000,
        output_tokens=200,
        cache_read_input_tokens=0,
        cache_creation_input_tokens=0,
    )
    base.update(overrides)
    return SimpleNamespace(**base)


def _message(text=None, stop_reason="end_turn", stop_details=None, usage=None, content=None):
    """A Messages API response shaped like anthropic.types.Message."""
    if content is None:
        content = [] if text is None else [SimpleNamespace(type="text", text=text)]
    return SimpleNamespace(
        content=content,
        stop_reason=stop_reason,
        stop_details=stop_details,
        usage=usage or _usage(),
    )


def _fake_anthropic(message=None, side_effect=None):
    """Stand-in for the `anthropic` module: returns (module, messages.create mock)."""
    module = MagicMock(name="anthropic")
    create = module.Anthropic.return_value.messages.create
    if side_effect is not None:
        create.side_effect = side_effect
    else:
        create.return_value = message
    return module, create


def _analyze(provider, message=None, side_effect=None):
    module, create = _fake_anthropic(message, side_effect)
    with patch.dict(sys.modules, {"anthropic": module}):
        result = provider.analyze("prompt", "data")
    return result, create


def _opus():
    return AnthropicProvider("sk-ant-test", "claude-opus-4-7", 4096)


# ---------------------------------------------------------------------------
# Structured outputs against the flag schema; nothing forced
# ---------------------------------------------------------------------------

class TestStructuredOutputRequest:

    def test_request_uses_structured_output_schema(self):
        result, create = _analyze(_opus(), _message(json.dumps(SAMPLE_INSIGHTS)))

        assert result["success"] is True
        kwargs = create.call_args.kwargs
        assert kwargs["model"] == "claude-opus-4-7"
        assert kwargs["output_config"]["format"] == {
            "type": "json_schema",
            "schema": INSIGHTS_SCHEMA,
        }

    def test_request_offers_no_tools_and_forces_no_tool_choice(self):
        # Fable 5.1 returns 400 on a forced tool_choice; the insights are data,
        # not an action, so the request carries neither tools nor tool_choice.
        _, create = _analyze(_opus(), _message(json.dumps(SAMPLE_INSIGHTS)))

        kwargs = create.call_args.kwargs
        assert "tool_choice" not in kwargs
        assert "tools" not in kwargs

    def test_wire_request_through_real_sdk(self):
        # Drive the pinned SDK (anthropic==1.11.0, installed in CI) with a mocked
        # transport: output_config must reach the wire as-is, with no beta
        # header, no tools and no tool_choice. Skips only where the SDK's
        # vendored HTTP client is absent.
        httpx = pytest.importorskip("httpx2")
        import anthropic

        captured = {}

        def handler(request):
            captured["body"] = json.loads(request.content)
            captured["headers"] = dict(request.headers)
            return httpx.Response(200, json={
                "id": "msg_1", "type": "message", "role": "assistant",
                "model": "claude-opus-4-7",
                "content": [{"type": "text", "text": json.dumps(SAMPLE_INSIGHTS)}],
                "stop_reason": "end_turn", "stop_sequence": None,
                "usage": {"input_tokens": 10, "output_tokens": 5,
                          "cache_read_input_tokens": 0, "cache_creation_input_tokens": 0},
            })

        client = anthropic.Anthropic(
            api_key="sk-ant-test",
            http_client=httpx.Client(transport=httpx.MockTransport(handler)),
        )
        with patch.object(anthropic, "Anthropic", return_value=client):
            result = _opus().analyze("prompt", "data")

        assert result["success"] is True
        assert result["insights"]["transaction_types"] == {"buy": 2, "sell": 1, "staking": 1}
        body = captured["body"]
        assert body["output_config"]["format"] == {"type": "json_schema", "schema": INSIGHTS_SCHEMA}
        assert "tool_choice" not in body and "tools" not in body
        assert captured["headers"].get("anthropic-beta") is None

    def test_module_source_never_forces_tool_choice(self):
        # Guard against a forced tool_choice ({"type": "any"} / {"type": "tool"})
        # re-entering the module in any provider.
        src = open(ai_insights.__file__, encoding="utf-8").read()
        forced = re.search(r'tool_choice\s*=\s*\{[^}]*"type"\s*:\s*"(any|tool)"', src)
        assert forced is None, forced.group(0)

    def test_schema_stays_within_structured_output_subset(self):
        # Structured outputs reject these keywords with a 400; keep the
        # contract inside the supported subset so a schema edit cannot take
        # the Business path down.
        unsupported = {"minimum", "maximum", "multipleOf", "minLength", "maxLength",
                       "maxItems", "pattern", "patternProperties"}

        def walk(node):
            assert not (unsupported & set(node)), unsupported & set(node)
            if node.get("type") == "object":
                assert node.get("additionalProperties") is False
                props = node.get("properties", {})
                # Every field is part of the contract — nothing optional.
                assert sorted(node.get("required", [])) == sorted(props)
                for child in props.values():
                    walk(child)
            if node.get("type") == "array":
                walk(node["items"])

        walk(INSIGHTS_SCHEMA)

    def test_schema_covers_every_field_the_prompt_promises(self):
        expected = {
            "summary", "total_transactions", "date_range", "transaction_types",
            "top_assets", "what_to_do_next", "data_notes", "estimated_taxable_events",
        }
        assert set(INSIGHTS_SCHEMA["properties"]) == expected


# ---------------------------------------------------------------------------
# Output shape: the frontend still sees transaction_types as {type: count}
# ---------------------------------------------------------------------------

class TestOutputShape:

    def test_anthropic_transaction_types_fold_into_dict(self):
        result, _ = _analyze(_opus(), _message(json.dumps(SAMPLE_INSIGHTS)))

        insights = result["insights"]
        assert insights["transaction_types"] == {"buy": 2, "sell": 1, "staking": 1}
        # Everything else passes through as the model wrote it.
        assert insights["top_assets"] == SAMPLE_INSIGHTS["top_assets"]
        assert insights["estimated_taxable_events"] == 2

    def test_normalize_sums_duplicate_types_and_skips_malformed_items(self):
        out = _normalize_insights({
            "transaction_types": [
                {"type": "buy", "count": 2},
                {"type": "buy", "count": 3},
                {"type": "sell", "count": "lots"},   # not an int — dropped
                {"count": 9},                        # no type — dropped
                "transfer",                          # not an object — dropped
            ]
        })
        assert out["transaction_types"] == {"buy": 5}

    def test_normalize_leaves_dict_and_non_dict_untouched(self):
        assert _normalize_insights({"transaction_types": {"buy": 1}}) == {"transaction_types": {"buy": 1}}
        assert _normalize_insights({"summary": "x"}) == {"summary": "x"}
        assert _normalize_insights("not json") == "not json"

    def test_gemini_output_is_folded_the_same_way(self):
        # Free/Starter follow the prompt example, which now shows the array
        # form; the dict shape must survive for them too.
        gemini_body = json.dumps({
            "candidates": [{"content": {"parts": [{"text": json.dumps(SAMPLE_INSIGHTS)}]}}],
            "usageMetadata": {"promptTokenCount": 10, "candidatesTokenCount": 5},
        }).encode("utf-8")

        class _Resp(io.BytesIO):
            def __enter__(self):
                return self

            def __exit__(self, *exc):
                return False

        with patch("urllib.request.urlopen", return_value=_Resp(gemini_body)):
            result = GoogleProvider("AIzaTest", "gemini-2.5-flash", 1024).analyze("prompt", "data")

        assert result["success"] is True
        assert result["insights"]["transaction_types"] == {"buy": 2, "sell": 1, "staking": 1}


# ---------------------------------------------------------------------------
# Refusal branch: never emit partial flags
# ---------------------------------------------------------------------------

class TestRefusalBranch:

    def test_refusal_discards_partial_output(self):
        # A refusal is HTTP 200 with stop_reason "refusal"; content may hold a
        # half-written answer. None of it may reach the user as insights.
        partial = json.dumps(SAMPLE_INSIGHTS)[:40]
        result, _ = _analyze(_opus(), _message(partial, stop_reason="refusal"))

        assert result["success"] is False
        assert result["refusal"] is True
        assert result["error"] == INSIGHTS_UNAVAILABLE
        assert "insights" not in result
        assert result["model"] == "claude-opus-4-7"

    def test_refusal_with_empty_content_does_not_crash(self):
        result, _ = _analyze(_opus(), _message(content=[], stop_reason="refusal"))

        assert result["success"] is False
        assert result["refusal"] is True
        assert "insights" not in result

    def test_max_tokens_truncation_is_not_emitted_as_insights(self):
        truncated = json.dumps(SAMPLE_INSIGHTS)[:-25]
        result, _ = _analyze(_opus(), _message(truncated, stop_reason="max_tokens"))

        assert result["success"] is False
        assert result["error"] == INSIGHTS_TRUNCATED
        assert "insights" not in result
        assert "refusal" not in result

    def test_unparseable_text_is_a_failure_not_a_summary(self):
        # Previously wrapped as {"summary": raw_text}; with a schema-bound
        # response that text is not a flag set we can stand behind.
        result, _ = _analyze(_opus(), _message("Sorry, here is prose instead of JSON."))

        assert result["success"] is False
        assert result["error"] == INSIGHTS_INVALID
        assert "insights" not in result

    def test_end_turn_with_valid_json_still_succeeds(self):
        result, _ = _analyze(_opus(), _message(json.dumps(SAMPLE_INSIGHTS), stop_reason="end_turn"))

        assert result["success"] is True
        assert result["insights"]["summary"] == SAMPLE_INSIGHTS["summary"]
