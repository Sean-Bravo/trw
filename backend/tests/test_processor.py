"""
Tests for handlers/processor.py — focused on the AI insights tier routing
added in the Tiered AI Insights wire-up.
"""

import json
import logging
import sys
import os
from unittest.mock import MagicMock, patch

import pytest

# Patch external deps before import.
# pandas/numpy/chardet are saved here and restored after the import below:
# without the restore, these module-level MagicMocks leak through
# sys.modules and break parser/engine tests collected later in the same
# pytest process (they need the real libraries).
_REAL_DATA_LIBS = {name: sys.modules.get(name) for name in ("pandas", "numpy", "chardet")}
sys.modules["boto3"] = MagicMock()
mock_psycopg2 = MagicMock()
sys.modules["psycopg2"] = mock_psycopg2
sys.modules["psycopg2.extras"] = MagicMock()
sys.modules["psycopg2.pool"] = MagicMock()
sys.modules["pandas"] = MagicMock()
sys.modules["numpy"] = MagicMock()
sys.modules["chardet"] = MagicMock()

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "services"))

from handlers import processor as processor_module
from handlers.processor import generate_ai_insights, run_shadow_insights, process_message

# Restore real data libs so later-collected test modules import them
# instead of the MagicMocks installed above.
for _name, _mod in _REAL_DATA_LIBS.items():
    if _mod is not None:
        sys.modules[_name] = _mod
    else:
        sys.modules.pop(_name, None)


# ---------------------------------------------------------------------------
# generate_ai_insights — free-tier size cap (Phase A6 of Tiered AI Insights)
# ---------------------------------------------------------------------------

class TestFreeTierSizeCap:
    """The 5000-row cap exists to prevent unbounded Gemini prompt sizes on free."""

    @patch("handlers.processor.get_secrets", return_value={})
    def test_free_tier_at_or_below_cap_proceeds_to_ai(self, mock_secrets):
        records = [{"date": "2024-01-01", "amount": 100}] * 5000

        with patch("ai_insights.generate_quick_stats", return_value={"total_transactions": 5000}), \
             patch("ai_insights.generate_insights", return_value={
                 "success": True,
                 "insights": {"summary": "ok"},
                 "model": "gemini-2.5-flash",
                 "provider": "google",
             }):
            result = generate_ai_insights(records, "free")

        assert result["success"] is True
        assert result["ai_insights"] == {"summary": "ok"}
        assert result.get("ai_error") is None
        assert result["tier"] == "free"

    @patch("handlers.processor.get_secrets", return_value={})
    def test_free_tier_over_cap_short_circuits(self, mock_secrets):
        records = [{"date": "2024-01-01", "amount": 100}] * 5001

        with patch("ai_insights.generate_quick_stats", return_value={"total_transactions": 5001}) as mock_qs, \
             patch("ai_insights.generate_insights") as mock_ai:
            result = generate_ai_insights(records, "free")

        assert result["success"] is True
        assert result["ai_insights"] is None
        assert result["ai_error"] == "free_tier_size_limit"
        assert result["tier"] == "free"
        # Quick stats still computed; AI provider must NOT be called.
        mock_qs.assert_called_once()
        mock_ai.assert_not_called()

    @patch("handlers.processor.get_secrets", return_value={})
    def test_starter_tier_over_cap_still_calls_ai(self, mock_secrets):
        # Starter is paid (Gemini-backed). The cap is free-only — paid tiers
        # never short-circuit, regardless of which model they route to.
        records = [{"date": "2024-01-01", "amount": 100}] * 5001

        with patch("ai_insights.generate_quick_stats", return_value={"total_transactions": 5001}), \
             patch("ai_insights.generate_insights", return_value={
                 "success": True,
                 "insights": {"summary": "ok"},
                 "model": "gemini-2.5-flash",
                 "provider": "google",
             }) as mock_ai:
            result = generate_ai_insights(records, "starter")

        assert result["success"] is True
        assert result["ai_insights"] == {"summary": "ok"}
        assert result["tier"] == "starter"
        mock_ai.assert_called_once()

    @patch("handlers.processor.get_secrets", return_value={})
    def test_growth_tier_over_cap_still_calls_ai(self, mock_secrets):
        records = [{"date": "2024-01-01", "amount": 100}] * 5001

        with patch("ai_insights.generate_quick_stats", return_value={"total_transactions": 5001}), \
             patch("ai_insights.generate_insights", return_value={
                 "success": True,
                 "insights": {"summary": "deep"},
                 "model": "claude-sonnet-4-6",
                 "provider": "anthropic",
             }) as mock_ai:
            result = generate_ai_insights(records, "growth")

        assert result["success"] is True
        assert result["ai_insights"] == {"summary": "deep"}
        assert result["tier"] == "growth"
        mock_ai.assert_called_once()

    @patch("handlers.processor.get_secrets", return_value={})
    def test_business_tier_over_cap_still_calls_ai(self, mock_secrets):
        records = [{"date": "2024-01-01", "amount": 100}] * 10000

        with patch("ai_insights.generate_quick_stats", return_value={"total_transactions": 10000}), \
             patch("ai_insights.generate_insights", return_value={
                 "success": True,
                 "insights": {"summary": "opus"},
                 "model": "claude-opus-4-7",
                 "provider": "anthropic",
             }) as mock_ai:
            result = generate_ai_insights(records, "business")

        assert result["success"] is True
        assert result["tier"] == "business"
        mock_ai.assert_called_once()


# ---------------------------------------------------------------------------
# generate_ai_insights — happy path & failure modes (regression coverage)
# ---------------------------------------------------------------------------

class TestGenerateAiInsights:
    @patch("handlers.processor.get_secrets", return_value={})
    def test_happy_path_returns_full_shape(self, mock_secrets):
        records = [{"x": 1}]

        with patch("ai_insights.generate_quick_stats", return_value={"total_transactions": 1}), \
             patch("ai_insights.generate_insights", return_value={
                 "success": True,
                 "insights": {"summary": "good"},
                 "model": "gemini-2.5-flash",
                 "provider": "google",
             }):
            result = generate_ai_insights(records, "free")

        assert result["success"] is True
        assert "quick_stats" in result
        assert result["ai_insights"] == {"summary": "good"}
        assert result["model"] == "gemini-2.5-flash"
        assert result["provider"] == "google"
        assert result["tier"] == "free"

    @patch("handlers.processor.get_secrets", return_value={})
    def test_ai_failure_returns_quick_stats_only(self, mock_secrets):
        records = [{"x": 1}]

        with patch("ai_insights.generate_quick_stats", return_value={"total_transactions": 1}), \
             patch("ai_insights.generate_insights", return_value={
                 "success": False,
                 "error": "rate_limited",
             }):
            result = generate_ai_insights(records, "growth")

        # Outer success is True (quick stats always works); ai_insights is None
        # and the underlying error is surfaced via ai_error.
        assert result["success"] is True
        assert result["ai_insights"] is None
        assert result["ai_error"] == "rate_limited"
        assert result["tier"] == "growth"

    @patch("handlers.processor.get_secrets", return_value={})
    def test_refusal_returns_deterministic_parse_with_unavailable_warning(self, mock_secrets):
        # stop_reason "refusal" surfaces from ai_insights as a failed result
        # carrying refusal=True and no insights key. The user gets the
        # deterministic quick stats and an "insights unavailable" ai_error —
        # never a partial flag set.
        from ai_insights import INSIGHTS_UNAVAILABLE

        records = [{"x": 1}]
        quick = {"total_transactions": 1, "transaction_types": {"buy": 1}}

        with patch("ai_insights.generate_quick_stats", return_value=quick), \
             patch("ai_insights.generate_insights", return_value={
                 "success": False,
                 "refusal": True,
                 "error": INSIGHTS_UNAVAILABLE,
                 "model": "claude-opus-4-7",
                 "provider": "anthropic",
             }):
            result = generate_ai_insights(records, "business")

        assert result["success"] is True
        assert result["quick_stats"] == quick
        assert result["ai_insights"] is None
        assert result["ai_error"] == "insights unavailable"
        assert result["tier"] == "business"

    @patch("handlers.processor.get_secrets", return_value={})
    def test_metadata_passes_through_on_success_and_failure(self, mock_secrets):
        # The reproducibility stamp (model id, prompt version, effort) travels
        # with the result into insights.json whether the call succeeded or not.
        records = [{"x": 1}]
        metadata = {
            "model": "claude-opus-4-7",
            "provider": "anthropic",
            "prompt_version": "2026-10-09",
            "effort": None,
        }

        with patch("ai_insights.generate_quick_stats", return_value={"total_transactions": 1}), \
             patch("ai_insights.generate_insights", return_value={
                 "success": True,
                 "insights": {"summary": "good"},
                 "model": "claude-opus-4-7",
                 "provider": "anthropic",
                 "metadata": metadata,
             }):
            ok = generate_ai_insights(records, "business")

        with patch("ai_insights.generate_quick_stats", return_value={"total_transactions": 1}), \
             patch("ai_insights.generate_insights", return_value={
                 "success": False,
                 "refusal": True,
                 "error": "insights unavailable",
                 "metadata": metadata,
             }):
            refused = generate_ai_insights(records, "business")

        assert ok["metadata"] == metadata
        assert refused["metadata"] == metadata
        assert refused["ai_insights"] is None


# ---------------------------------------------------------------------------
# run_shadow_insights — shadow model run, never in the user's path
# ---------------------------------------------------------------------------

class TestRunShadowInsights:

    RECORDS = [{"Date": "2024-01-01 00:00:00", "Sent Amount": "1", "Sent Currency": "USD",
                "Received Amount": "0.1", "Received Currency": "BTC", "Description": "buy"}]
    PRODUCTION = {"success": True, "ai_insights": {"summary": "ok", "flags": []}}

    def test_uploads_shadow_result_to_its_own_key(self):
        shadow = {"success": True, "role": "shadow", "insights": {"summary": "shadow"}}
        with patch("ai_insights.generate_shadow_insights", return_value=shadow) as gen, \
             patch.object(processor_module, "get_secrets", return_value={"ANTHROPIC_API_KEY": "k"}), \
             patch.object(processor_module, "s3_client") as s3, \
             patch.object(processor_module, "RESULTS_BUCKET", "results-bucket"):
            run_shadow_insights(self.RECORDS, "business", "job-1", self.PRODUCTION)

        gen.assert_called_once_with(
            self.RECORDS, "business", {"ANTHROPIC_API_KEY": "k"},
            production_insights=self.PRODUCTION["ai_insights"],
        )
        put = s3.put_object.call_args.kwargs
        assert put["Bucket"] == "results-bucket"
        assert put["Key"] == "results/job-1/insights_shadow.json"
        assert put["Key"] != "results/job-1/insights.json"
        assert json.loads(put["Body"]) == shadow

    def test_nothing_is_written_when_the_tier_is_not_shadowed(self):
        with patch("ai_insights.generate_shadow_insights", return_value=None), \
             patch.object(processor_module, "get_secrets", return_value={}), \
             patch.object(processor_module, "s3_client") as s3:
            run_shadow_insights(self.RECORDS, "free", "job-1", self.PRODUCTION)
        s3.put_object.assert_not_called()

    def test_failures_are_swallowed_with_the_error_class_only(self, caplog):
        with patch("ai_insights.generate_shadow_insights", side_effect=ValueError("cell value 123.45")), \
             patch.object(processor_module, "get_secrets", return_value={}), \
             patch.object(processor_module, "s3_client"), \
             caplog.at_level(logging.WARNING, logger=""):
            run_shadow_insights(self.RECORDS, "business", "job-1", self.PRODUCTION)   # must not raise

        msgs = [r.getMessage() for r in caplog.records if "insights_shadow_error" in r.getMessage()]
        assert msgs and "error_class=ValueError" in msgs[0] and "job_id=job-1" in msgs[0]
        assert "123.45" not in msgs[0]           # retention: never the message
        assert all(r.levelno < logging.ERROR for r in caplog.records)

    def test_s3_failure_is_swallowed_too(self, caplog):
        with patch("ai_insights.generate_shadow_insights", return_value={"success": True}), \
             patch.object(processor_module, "get_secrets", return_value={}), \
             patch.object(processor_module, "s3_client") as s3, \
             caplog.at_level(logging.WARNING, logger=""):
            s3.put_object.side_effect = RuntimeError("s3 down")
            run_shadow_insights(self.RECORDS, "business", "job-1", self.PRODUCTION)
        assert any("insights_shadow_error" in r.getMessage() for r in caplog.records)


class TestProcessMessageShadowOrder:
    """The shadow run starts only after the user's insights.json is stored,
    and a shadow failure cannot fail the job."""

    MESSAGE = {"job_id": "job-9", "s3_bucket": "uploads", "s3_key": "uploads/job-9/f.csv",
               "filename": "f.csv", "user_id": "u"}

    def _run(self, shadow_side_effect=None):
        order = []
        insights_result = {"success": True, "quick_stats": {"total_transactions": 1}, "ai_insights": {"summary": "ok"}}
        with patch.object(processor_module, "get_secrets", return_value={}), \
             patch.object(processor_module, "resolve_job_tier", return_value="business"), \
             patch.object(processor_module, "download_file", return_value=b"csv"), \
             patch.object(processor_module, "process_csv", return_value={
                 "success": True, "csv_output": "Date,Description\n2024-01-01,buy\n", "record_count": 1, "exchange": "coinbase",
             }), \
             patch.object(processor_module, "upload_result", return_value="results/job-9/output.csv"), \
             patch.object(processor_module, "upload_result_json"), \
             patch.object(processor_module, "generate_ai_insights", return_value=insights_result), \
             patch.object(processor_module, "upload_insights", side_effect=lambda *a: order.append("upload_insights")), \
             patch.object(processor_module, "run_shadow_insights",
                          side_effect=lambda *a: (order.append("run_shadow_insights"), shadow_side_effect and (_ for _ in ()).throw(shadow_side_effect))) as shadow:
            result = process_message(self.MESSAGE)
        return result, order, shadow

    def test_shadow_runs_after_the_users_insights_are_stored(self):
        result, order, shadow = self._run()
        assert result["success"] is True and result["has_insights"] is True
        assert order == ["upload_insights", "run_shadow_insights"]
        args = shadow.call_args.args
        assert args[1] == "business" and args[2] == "job-9"
        assert args[0] == [{"Date": "2024-01-01", "Description": "buy"}]
        assert args[3]["ai_insights"] == {"summary": "ok"}


# ---------------------------------------------------------------------------
# Tier resolved from the job owner's row in Neon (issue #6)
# ---------------------------------------------------------------------------

class _FakeDb:
    """Stands in for storage.get_db_connection: one cursor, one canned row."""

    def __init__(self, row=None, error=None, no_database=False):
        self.row, self.error, self.no_database = row, error, no_database
        self.cursor = MagicMock()
        self.cursor.fetchone.return_value = row
        if error:
            self.cursor.execute.side_effect = error

    def __call__(self):
        from contextlib import contextmanager

        @contextmanager
        def connection():
            if self.no_database:
                yield None
                return
            conn = MagicMock()
            conn.cursor.return_value.__enter__ = MagicMock(return_value=self.cursor)
            conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
            yield conn
        return connection()


class TestJobTierFromNeon:

    KEY = "uploads/job-5/f.csv"

    def test_owner_with_a_business_key_gets_business(self):
        db = _FakeDb(row=("business",))
        with patch("storage.get_db_connection", db):
            assert processor_module.resolve_job_tier(self.KEY) == "business"
        sql, params = db.cursor.execute.call_args.args
        assert params == (self.KEY, self.KEY)
        assert "pending_uploads" in sql and "uploads" in sql and "api_keys" in sql

    def test_no_owner_row_is_free(self):
        with patch("storage.get_db_connection", _FakeDb(row=None)):
            assert processor_module.resolve_job_tier(self.KEY) == "free"

    def test_lookup_failure_is_free(self):
        with patch("storage.get_db_connection", _FakeDb(error=RuntimeError("neon down"))):
            assert processor_module.resolve_job_tier(self.KEY) == "free"

    def test_no_database_is_free(self):
        with patch("storage.get_db_connection", _FakeDb(no_database=True)):
            assert processor_module.resolve_job_tier(self.KEY) == "free"

    def test_unknown_tier_value_is_free(self):
        with patch("storage.get_db_connection", _FakeDb(row=("platinum",))):
            assert processor_module.resolve_job_tier(self.KEY) == "free"

    def test_missing_key_is_free_without_a_query(self):
        db = _FakeDb(row=("business",))
        with patch("storage.get_db_connection", db):
            assert processor_module.resolve_job_tier(None) == "free"
        db.cursor.execute.assert_not_called()

    def test_anonymous_message_claiming_business_gets_the_free_model(self):
        """An anonymous upload has no pending_uploads or uploads row. Whatever
        the message says, insights run on the free model and no shadow runs."""
        from ai_insights import TIER_CONFIG

        message = {"job_id": "job-5", "s3_bucket": "uploads", "s3_key": self.KEY,
                   "filename": "f.csv", "user_id": "anon-203.0.113.9", "user_tier": "business"}
        insights_tiers, shadow_tiers = [], []

        def fake_generate_insights(records, tier, secrets):
            insights_tiers.append(tier)
            return {"success": True, "insights": {"summary": "ok"},
                    "model": TIER_CONFIG[tier]["model"], "provider": TIER_CONFIG[tier]["provider"]}

        def fake_shadow(records, tier, secrets, production_insights=None):
            shadow_tiers.append(tier)
            return None

        with patch("storage.get_db_connection", _FakeDb(row=None)), \
             patch.object(processor_module, "get_secrets", return_value={}), \
             patch.object(processor_module, "download_file", return_value=b"csv"), \
             patch.object(processor_module, "process_csv", return_value={
                 "success": True, "csv_output": "Date,Description\n2024-01-01,buy\n", "record_count": 1,
                 "exchange": "coinbase",
             }), \
             patch.object(processor_module, "upload_result"), \
             patch.object(processor_module, "upload_result_json"), \
             patch.object(processor_module, "upload_insights") as upload_insights, \
             patch("ai_insights.generate_quick_stats", return_value={"total_transactions": 1}), \
             patch("ai_insights.generate_insights", side_effect=fake_generate_insights), \
             patch("ai_insights.generate_shadow_insights", side_effect=fake_shadow):
            result = process_message(message)

        assert result["success"] is True
        assert insights_tiers == ["free"]
        stored = upload_insights.call_args.args[2]
        assert stored["tier"] == "free"
        assert stored["model"] == TIER_CONFIG["free"]["model"]
        assert stored["model"] != TIER_CONFIG["business"]["model"]
        assert shadow_tiers == ["free"]   # generate_shadow_insights returns None for free


# ---------------------------------------------------------------------------
# Parse outcome recording — result.json / error.json carry what the review reads
# ---------------------------------------------------------------------------

class TestParseOutcomeRecording:

    MESSAGE = {"job_id": "job-7", "s3_bucket": "uploads", "s3_key": "uploads/job-7/f.csv",
               "filename": "f.csv", "user_id": "u", "user_tier": "business"}

    def test_insights_outcome_shape(self):
        from handlers.processor import _insights_outcome
        assert _insights_outcome(None) is None
        assert _insights_outcome({}) is None
        out = _insights_outcome({
            "success": True, "ai_insights": {"summary": "x"}, "ai_error": None,
            "metadata": {"model": "claude-opus-4-7", "provider": "anthropic", "prompt_version": "2026-10-13",
                         "effort": "low", "request_type": "summary", "input": {"records_total": 3}},
        })
        assert out == {"model": "claude-opus-4-7", "provider": "anthropic", "prompt_version": "2026-10-13",
                       "effort": "low", "request_type": "summary", "ai_error": None}
        # A failed insights run still says which model declined and why.
        out = _insights_outcome({"success": True, "ai_insights": None, "ai_error": "insights unavailable",
                                 "metadata": {"model": "claude-opus-4-7"}})
        assert out["ai_error"] == "insights unavailable" and out["model"] == "claude-opus-4-7"

    def test_success_writes_parser_version_and_insights_into_result_json(self):
        insights_result = {"success": True, "quick_stats": {}, "ai_insights": {"summary": "ok"}, "ai_error": None,
                           "metadata": {"model": "claude-opus-4-7", "provider": "anthropic",
                                        "prompt_version": "2026-10-13", "effort": "high", "request_type": "analysis"}}
        with patch.object(processor_module, "get_secrets", return_value={}), \
             patch.object(processor_module, "download_file", return_value=b"csv"), \
             patch.object(processor_module, "process_csv", return_value={
                 "success": True, "csv_output": "Date,Description\n2024-01-01,buy\n", "record_count": 1,
                 "exchange": "coinbase", "meta": {"parser_version": "2.3.1"},
             }), \
             patch.object(processor_module, "upload_result"), \
             patch.object(processor_module, "upload_insights"), \
             patch.object(processor_module, "run_shadow_insights"), \
             patch.object(processor_module, "generate_ai_insights", return_value=insights_result), \
             patch.object(processor_module, "upload_result_json") as result_json:
            process_message(self.MESSAGE)

        payload = result_json.call_args.args[2]
        assert payload["exchange"] == "coinbase"
        assert payload["parser_version"] == "2.3.1"
        assert payload["insights"] == {"model": "claude-opus-4-7", "provider": "anthropic",
                                       "prompt_version": "2026-10-13", "effort": "high",
                                       "request_type": "analysis", "ai_error": None}
        # Diff data for the job page is untouched.
        assert set(payload) >= {"record_count", "original", "processed", "columns"}

    def test_failure_writes_reason_exchange_and_parser_version_into_error_json(self):
        with patch.object(processor_module, "get_secrets", return_value={}), \
             patch.object(processor_module, "download_file", return_value=b"csv"), \
             patch.object(processor_module, "process_csv", return_value={
                 "success": False, "error": "Could not auto-detect exchange format",
                 "errors": [{"message": "Could not auto-detect exchange format"}], "warnings": [],
                 "exchange": None, "meta": {"parser_version": "2.3.1"},
             }), \
             patch.object(processor_module, "upload_error") as upload_error:
            result = process_message(self.MESSAGE)

        assert result["success"] is False
        payload = upload_error.call_args.args[2]
        assert payload["reason"] == "detection_failed"
        assert payload["parser_version"] == "2.3.1"
        assert payload["exchange"] is None
        assert payload["error"] == "Could not auto-detect exchange format"

    def test_exception_path_records_reason_exception_without_the_message(self):
        with patch.object(processor_module, "get_secrets", return_value={}), \
             patch.object(processor_module, "download_file", side_effect=RuntimeError("cell value 123.45")), \
             patch.object(processor_module, "upload_error") as upload_error:
            result = process_message(self.MESSAGE)

        assert result["success"] is False
        payload = upload_error.call_args.args[2]
        assert payload["reason"] == "exception"
