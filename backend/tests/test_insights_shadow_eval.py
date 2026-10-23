"""
Tests for scripts/insights_shadow_eval.py's summary step. On 2026-10-23 every
call returned 401 (invalid Anthropic key); failed calls carry "usage": None
and the summary crashed, so the run wrote no report at all.
"""

import importlib.util
import os
import sys

HERE = os.path.dirname(__file__)
SCRIPT = os.path.join(HERE, "..", "scripts", "insights_shadow_eval.py")

spec = importlib.util.spec_from_file_location("insights_shadow_eval", SCRIPT)
shadow_eval = importlib.util.module_from_spec(spec)
sys.modules["insights_shadow_eval"] = shadow_eval
spec.loader.exec_module(shadow_eval)


def _failed_call():
    return {"success": False, "refusal": None, "model": "claude-opus-4-7", "usage": None, "agreement": None}


def _ok_call(cost):
    return {
        "success": True, "refusal": None, "model": "claude-opus-4-7",
        "usage": {"cost_usd": cost, "latency_ms": 1000, "cache_read_tokens": 10, "cache_creation_tokens": 0},
    }


def test_summary_survives_calls_that_all_failed():
    rows = [{"production": _failed_call(), "shadow": _failed_call()} for _ in range(3)]

    prod = shadow_eval._summarize(rows, "production")
    assert prod["calls"] == 3 and prod["errors"] == 3 and prod["success"] == 0
    assert prod["cost_usd_p90"] is None and prod["cost_usd_total"] == 0

    agreement = shadow_eval._agreement_summary(rows)
    assert isinstance(agreement, dict)


def test_summary_counts_successes_next_to_failures():
    rows = [{"production": _ok_call(0.05)}, {"production": _failed_call()}]

    prod = shadow_eval._summarize(rows, "production")
    assert prod["success"] == 1 and prod["errors"] == 1
    assert prod["cost_usd_total"] == 0.05
    assert prod["calls_with_cache_read"] == 1
