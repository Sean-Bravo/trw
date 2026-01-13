"""
AI Insights Service - Tiered AI analysis for crypto transactions

Tiers:
- Free: Google Gemini (free API)
- Pro: Claude Sonnet (balanced)
- Premium: Claude Opus (best quality)
"""

import os
import json
import logging
from typing import Any, Dict, List, Optional
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

# Model configurations
TIER_CONFIG = {
    "free": {
        "provider": "google",
        "model": "gemini-1.5-flash",
        "max_tokens": 1024,
    },
    "pro": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 2048,
    },
    "premium": {
        "provider": "anthropic",
        "model": "claude-opus-4-20250514",
        "max_tokens": 4096,
    },
}


class AIProvider(ABC):
    """Base class for AI providers."""

    @abstractmethod
    def analyze(self, prompt: str, data: str) -> Dict[str, Any]:
        """Analyze transaction data and return insights."""
        pass


class AnthropicProvider(AIProvider):
    """Claude AI provider for Pro and Premium tiers."""

    def __init__(self, api_key: str, model: str, max_tokens: int):
        self.api_key = api_key
        self.model = model
        self.max_tokens = max_tokens

    def analyze(self, prompt: str, data: str) -> Dict[str, Any]:
        try:
            import anthropic

            client = anthropic.Anthropic(api_key=self.api_key)

            message = client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                messages=[
                    {
                        "role": "user",
                        "content": f"{prompt}\n\nTransaction Data:\n{data}",
                    }
                ],
            )

            response_text = message.content[0].text

            # Try to parse as JSON, fall back to text
            try:
                return {
                    "success": True,
                    "insights": json.loads(response_text),
                    "model": self.model,
                    "provider": "anthropic",
                }
            except json.JSONDecodeError:
                return {
                    "success": True,
                    "insights": {"summary": response_text},
                    "model": self.model,
                    "provider": "anthropic",
                }

        except Exception as e:
            logger.error(f"Anthropic API error: {e}")
            return {
                "success": False,
                "error": str(e),
                "model": self.model,
                "provider": "anthropic",
            }


class GoogleProvider(AIProvider):
    """Google Gemini provider for Free tier."""

    def __init__(self, api_key: str, model: str, max_tokens: int):
        self.api_key = api_key
        self.model = model
        self.max_tokens = max_tokens

    def analyze(self, prompt: str, data: str) -> Dict[str, Any]:
        try:
            import google.generativeai as genai

            genai.configure(api_key=self.api_key)
            model = genai.GenerativeModel(self.model)

            response = model.generate_content(
                f"{prompt}\n\nTransaction Data:\n{data}",
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=self.max_tokens,
                ),
            )

            response_text = response.text

            # Try to parse as JSON, fall back to text
            try:
                return {
                    "success": True,
                    "insights": json.loads(response_text),
                    "model": self.model,
                    "provider": "google",
                }
            except json.JSONDecodeError:
                return {
                    "success": True,
                    "insights": {"summary": response_text},
                    "model": self.model,
                    "provider": "google",
                }

        except Exception as e:
            logger.error(f"Google Gemini API error: {e}")
            return {
                "success": False,
                "error": str(e),
                "model": self.model,
                "provider": "google",
            }


def get_ai_provider(tier: str, secrets: Dict[str, str]) -> Optional[AIProvider]:
    """Get the appropriate AI provider for the given tier."""
    config = TIER_CONFIG.get(tier, TIER_CONFIG["free"])
    provider_type = config["provider"]
    model = config["model"]
    max_tokens = config["max_tokens"]

    if provider_type == "anthropic":
        api_key = secrets.get("ANTHROPIC_API_KEY")
        if not api_key:
            logger.warning("Anthropic API key not found, falling back to free tier")
            return get_ai_provider("free", secrets)
        return AnthropicProvider(api_key, model, max_tokens)

    elif provider_type == "google":
        api_key = secrets.get("GOOGLE_GEMINI_API_KEY")
        if not api_key:
            logger.warning("Google Gemini API key not found")
            return None
        return GoogleProvider(api_key, model, max_tokens)

    return None


# Prompt templates
INSIGHTS_PROMPT = """You are a crypto tax analysis assistant. Analyze the following transaction data and provide insights in JSON format.

Provide the following analysis:
1. **summary**: Brief overview of the transactions (2-3 sentences)
2. **total_transactions**: Number of transactions
3. **date_range**: Start and end dates of transactions
4. **transaction_types**: Breakdown of transaction types (buy, sell, transfer, etc.)
5. **top_assets**: Top 5 cryptocurrencies by transaction volume
6. **potential_issues**: Any potential tax issues or anomalies detected (missing cost basis, wash sales, etc.)
7. **tax_tips**: 2-3 actionable tips for tax optimization
8. **estimated_events**: Estimated number of taxable events

Return ONLY valid JSON in this format:
{
    "summary": "...",
    "total_transactions": 123,
    "date_range": {"start": "2024-01-01", "end": "2024-12-31"},
    "transaction_types": {"buy": 50, "sell": 30, "transfer": 20},
    "top_assets": [{"asset": "BTC", "count": 25}, ...],
    "potential_issues": ["Issue 1", "Issue 2"],
    "tax_tips": ["Tip 1", "Tip 2"],
    "estimated_events": 80
}"""


def generate_insights(
    records: List[Dict],
    tier: str,
    secrets: Dict[str, str],
) -> Dict[str, Any]:
    """
    Generate AI insights for transaction records.

    Args:
        records: List of transaction records
        tier: User's subscription tier (free, pro, premium)
        secrets: Dictionary containing API keys

    Returns:
        Dictionary with insights or error
    """
    if not records:
        return {
            "success": False,
            "error": "No records to analyze",
        }

    # Get the appropriate AI provider
    provider = get_ai_provider(tier, secrets)
    if not provider:
        return {
            "success": False,
            "error": "AI provider not available",
        }

    # Prepare data summary (limit to prevent token overflow)
    # Sample records if too many
    sample_size = min(len(records), 100)
    if len(records) > sample_size:
        # Take first 50 and last 50 for representative sample
        sample_records = records[:50] + records[-50:]
    else:
        sample_records = records

    # Convert to CSV-like format for the AI
    import csv
    from io import StringIO

    output = StringIO()
    if sample_records:
        fieldnames = list(sample_records[0].keys())
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(sample_records)

    data_summary = output.getvalue()

    # Add metadata
    data_with_meta = f"Total Records: {len(records)} (showing sample of {len(sample_records)})\n\n{data_summary}"

    # Generate insights
    result = provider.analyze(INSIGHTS_PROMPT, data_with_meta)

    # Add tier info to result
    result["tier"] = tier

    return result


def generate_quick_stats(records: List[Dict]) -> Dict[str, Any]:
    """
    Generate quick stats without AI (fallback/supplement).

    Returns basic statistics that don't require AI.
    """
    if not records:
        return {}

    stats = {
        "total_transactions": len(records),
        "transaction_types": {},
        "assets": set(),
        "date_range": {"start": None, "end": None},
    }

    for record in records:
        # Count transaction types
        tx_type = record.get("type", record.get("transaction_type", "unknown"))
        stats["transaction_types"][tx_type] = stats["transaction_types"].get(tx_type, 0) + 1

        # Collect assets
        asset = record.get("asset", record.get("currency", record.get("symbol")))
        if asset:
            stats["assets"].add(asset)

        # Track date range
        date = record.get("date", record.get("timestamp", record.get("time")))
        if date:
            if stats["date_range"]["start"] is None or date < stats["date_range"]["start"]:
                stats["date_range"]["start"] = date
            if stats["date_range"]["end"] is None or date > stats["date_range"]["end"]:
                stats["date_range"]["end"] = date

    # Convert set to list for JSON serialization
    stats["assets"] = list(stats["assets"])
    stats["unique_assets"] = len(stats["assets"])

    return stats
