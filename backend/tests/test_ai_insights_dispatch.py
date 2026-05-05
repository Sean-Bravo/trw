"""
Tests for backend/services/ai_insights.py — focused on the unified-tier
dispatcher in get_ai_provider. Each tier must route to the right provider
and model ID, including the regression-critical model strings post-Option-A.
"""

import sys
import os
from unittest.mock import MagicMock

# Patch external deps before import
sys.modules["boto3"] = MagicMock()

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "services"))

from ai_insights import get_ai_provider, TIER_CONFIG, AnthropicProvider, GoogleProvider


SECRETS = {
    "ANTHROPIC_API_KEY": "sk-ant-test",
    "GOOGLE_GEMINI_API_KEY": "AIzaTest",
}


class TestTierConfig:
    """The dispatch table itself — pin the model IDs so a typo doesn't ship
    a stale Claude version to paid customers."""

    def test_free_routes_to_gemini(self):
        config = TIER_CONFIG["free"]
        assert config["provider"] == "google"
        assert config["model"] == "gemini-2.5-flash"

    def test_starter_routes_to_gemini(self):
        # Starter shares Gemini with Free; the upgrade is quota+RPM, not AI.
        config = TIER_CONFIG["starter"]
        assert config["provider"] == "google"
        assert config["model"] == "gemini-2.5-flash"

    def test_growth_routes_to_claude_sonnet_4_6(self):
        config = TIER_CONFIG["growth"]
        assert config["provider"] == "anthropic"
        assert config["model"] == "claude-sonnet-4-6"

    def test_business_routes_to_claude_opus_4_7(self):
        config = TIER_CONFIG["business"]
        assert config["provider"] == "anthropic"
        assert config["model"] == "claude-opus-4-7"


class TestGetAiProvider:
    """End-to-end provider construction for each tier."""

    def test_free_returns_google_provider(self):
        provider = get_ai_provider("free", SECRETS)
        assert isinstance(provider, GoogleProvider)
        assert provider.model == "gemini-2.5-flash"

    def test_starter_returns_google_provider(self):
        provider = get_ai_provider("starter", SECRETS)
        assert isinstance(provider, GoogleProvider)
        assert provider.model == "gemini-2.5-flash"

    def test_growth_returns_anthropic_sonnet(self):
        provider = get_ai_provider("growth", SECRETS)
        assert isinstance(provider, AnthropicProvider)
        assert provider.model == "claude-sonnet-4-6"

    def test_business_returns_anthropic_opus(self):
        provider = get_ai_provider("business", SECRETS)
        assert isinstance(provider, AnthropicProvider)
        assert provider.model == "claude-opus-4-7"

    def test_unknown_tier_falls_back_to_free(self):
        # Stale tier names from before unification (e.g., 'pro', 'premium')
        # should not crash — they should fall back to the free tier dispatch.
        provider = get_ai_provider("pro", SECRETS)
        assert isinstance(provider, GoogleProvider)
        assert provider.model == "gemini-2.5-flash"

    def test_anthropic_missing_key_falls_back_to_free(self):
        # Defensive path inside get_ai_provider: if ANTHROPIC_API_KEY is missing
        # for a paid Claude tier, log a warning and serve Gemini instead.
        secrets_no_anthropic = {"GOOGLE_GEMINI_API_KEY": "AIzaTest"}
        provider = get_ai_provider("growth", secrets_no_anthropic)
        assert isinstance(provider, GoogleProvider)
        assert provider.model == "gemini-2.5-flash"
