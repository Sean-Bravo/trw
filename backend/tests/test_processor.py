"""
Tests for handlers/processor.py — focused on the AI insights tier routing
added in the Tiered AI Insights wire-up.
"""

import sys
import os
from unittest.mock import MagicMock, patch

import pytest

# Patch external deps before import
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

from handlers.processor import generate_ai_insights


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
