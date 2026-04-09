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

# M-10: same module as exporter / processor sanitizers.
from csv_safety import sanitize_csv_records

logger = logging.getLogger(__name__)

# Model configurations
TIER_CONFIG = {
    "free": {
        "provider": "google",
        "model": "gemini-2.5-flash",  # Stable: best price-performance
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


class OpenAIProvider(AIProvider):
    """OpenAI provider for Free tier - uses REST API directly."""

    def __init__(self, api_key: str, model: str, max_tokens: int):
        self.api_key = api_key
        self.model = model
        self.max_tokens = max_tokens

    def analyze(self, prompt: str, data: str) -> Dict[str, Any]:
        try:
            import urllib.request
            import urllib.error

            url = "https://api.openai.com/v1/chat/completions"

            payload = {
                "model": self.model,
                "messages": [
                    {
                        "role": "system",
                        "content": prompt
                    },
                    {
                        "role": "user",
                        "content": f"Transaction Data:\n{data}"
                    }
                ],
                "max_tokens": self.max_tokens,
                "temperature": 0.7,
                "response_format": {"type": "json_object"}
            }

            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}"
                },
                method="POST"
            )

            with urllib.request.urlopen(req, timeout=60) as response:
                result = json.loads(response.read().decode("utf-8"))

            response_text = result["choices"][0]["message"]["content"]

            try:
                return {
                    "success": True,
                    "insights": json.loads(response_text),
                    "model": self.model,
                    "provider": "openai",
                }
            except json.JSONDecodeError:
                return {
                    "success": True,
                    "insights": {"summary": response_text},
                    "model": self.model,
                    "provider": "openai",
                }

        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else str(e)
            logger.error(f"OpenAI API error: {e.code} - {error_body}")
            return {
                "success": False,
                "error": f"HTTP {e.code}: {error_body}",
                "model": self.model,
                "provider": "openai",
            }
        except Exception as e:
            logger.error(f"OpenAI provider error: {e}")
            return {
                "success": False,
                "error": str(e),
                "model": self.model,
                "provider": "openai",
            }


class GoogleProvider(AIProvider):
    """Google Gemini provider - uses REST API directly."""

    def __init__(self, api_key: str, model: str, max_tokens: int):
        self.api_key = api_key
        self.model = model
        self.max_tokens = max_tokens
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"

    def analyze(self, prompt: str, data: str) -> Dict[str, Any]:
        try:
            import urllib.request
            import urllib.error
            import re

            # L-5: pass the Gemini API key in the X-goog-api-key header
            # instead of the URL query string. Query strings end up in
            # server access logs, proxy logs, and CloudWatch — sending
            # the key in the request body header keeps it out of those
            # logs. SECURITY_AUDIT.md §L-5
            url = f"{self.base_url}/models/{self.model}:generateContent"

            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": f"{prompt}\n\nTransaction Data:\n{data}"}
                        ]
                    }
                ],
                "generationConfig": {
                    "maxOutputTokens": self.max_tokens,
                    "temperature": 0.7,
                    "responseMimeType": "application/json",
                }
            }

            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "x-goog-api-key": self.api_key,
                },
                method="POST"
            )

            with urllib.request.urlopen(req, timeout=60) as response:
                result = json.loads(response.read().decode("utf-8"))

            if not result.get("candidates") or not result["candidates"][0].get("content"):
                safety_feedback = result.get("promptFeedback", {})
                logger.warning(f"Gemini response blocked or empty. Feedback: {safety_feedback}")
                return {
                    "success": False,
                    "error": "Response blocked by safety filters or empty response",
                    "model": self.model,
                    "provider": "google",
                }

            response_text = result["candidates"][0]["content"]["parts"][0]["text"]
            clean_json = re.sub(r"^```json\s*|\s*```$", "", response_text.strip(), flags=re.MULTILINE)

            try:
                return {
                    "success": True,
                    "insights": json.loads(clean_json),
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

        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else str(e)
            logger.error(f"Google Gemini API HTTP error: {e.code} - {error_body}")
            return {
                "success": False,
                "error": f"HTTP {e.code}: {error_body}",
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

    elif provider_type == "openai":
        api_key = secrets.get("OPENAI_API_KEY")
        if not api_key:
            logger.warning("OpenAI API key not found")
            return None
        return OpenAIProvider(api_key, model, max_tokens)

    elif provider_type == "google":
        api_key = secrets.get("GOOGLE_GEMINI_API_KEY")
        if not api_key:
            logger.warning("Google Gemini API key not found")
            return None
        return GoogleProvider(api_key, model, max_tokens)

    return None


# Prompt templates
INSIGHTS_PROMPT = """You are a crypto tax data assistant for TaxFormatter. TaxFormatter is a CSV repair tool that fixes broken exchange exports so they can be imported into tax software like Koinly, TurboTax, CoinLedger, and ZenLedger.

IMPORTANT: TaxFormatter does NOT calculate taxes, cost basis, or gains/losses. It only cleans and reformats CSV data. The actual tax calculations are done by the tax software the user imports into.

Analyze the cleaned transaction data and provide helpful context in JSON format.

Provide the following:
1. **summary**: 2-3 sentences explaining what data was cleaned. Focus on what the user has (e.g., "Your Coinbase export contains 156 transactions from 2024, primarily BTC and ETH trades."). Be factual, not promotional.

2. **total_transactions**: Number of transactions in the cleaned file

3. **date_range**: Start and end dates of transactions found

4. **transaction_types**: Breakdown by type (buy, sell, transfer, deposit, withdrawal, staking, airdrop, etc.)

5. **top_assets**: Top 5 cryptocurrencies by transaction count

6. **what_to_do_next**: Explain the next steps clearly:
   - "Download this file and import it into your tax software (Koinly, TurboTax, CoinLedger, or ZenLedger)"
   - "The tax software will calculate your cost basis and capital gains/losses"
   - Mention if they should review any flagged transactions

7. **data_notes**: List any observations about the data that might affect tax reporting:
   - Missing fields that couldn't be recovered
   - Transactions that may need manual review
   - Staking rewards or airdrops (taxable as income)
   - Large transfers that may need cost basis from other sources
   - DO NOT give tax advice - just note what the data contains

8. **estimated_taxable_events**: Rough count of likely taxable events (sales, trades, income). Note: "This is an estimate. Your tax software will determine actual taxable events."

Return ONLY valid JSON in this format:
{
    "summary": "Your Coinbase export contains 156 transactions...",
    "total_transactions": 156,
    "date_range": {"start": "2024-01-15", "end": "2024-12-28"},
    "transaction_types": {"buy": 50, "sell": 30, "transfer": 20, "staking": 10},
    "top_assets": [{"asset": "BTC", "count": 45}, {"asset": "ETH", "count": 38}],
    "what_to_do_next": ["Download and import into your tax software", "Review any flagged transactions"],
    "data_notes": ["Found 10 staking rewards (taxable as income)", "3 transfers missing destination addresses"],
    "estimated_taxable_events": 80
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
        # M-10: sanitize before serializing — defense in depth so a
        # malicious description that survives the AI round-trip and
        # gets re-exported still can't trigger formula execution.
        writer.writerows(sanitize_csv_records(sample_records))

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
