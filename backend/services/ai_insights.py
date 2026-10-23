"""
AI Insights Service - Tiered AI analysis for crypto transactions

Tiers:
- Free: Google Gemini (free API)
- Pro: Claude Sonnet (balanced)
- Premium: Claude Opus (best quality)
"""

import csv
import os
import json
import logging
import time
from datetime import datetime
from io import StringIO
from typing import Any, Dict, List, Optional, Set
from abc import ABC, abstractmethod

# M-10: same module as exporter / processor sanitizers.
from csv_safety import sanitize_csv_records
# Same type tokens the dashboard chips use, so "sell" means the same thing
# to the request classifier as it does to quick stats.
from quick_stats_normalizer import _BUY_TOKENS, _SELL_TOKENS, _FIAT

logger = logging.getLogger(__name__)

# Model configurations — unified tier enum (api_keys.tier).
# Free + Starter share Gemini (cheap-fast tier; Starter's upgrade is quota,
# not AI). Growth and Business unlock the higher-quality models, paired with
# their respective other capability upgrades (Bank PDFs at Growth, SLA at Business).
#
# effort: the Anthropic output_config.effort setting (low|medium|high|xhigh|max),
# keyed by request type (see classify_request): a plain summary runs at low,
# an analysis-heavy file (many disposals, or an asset sold and re-bought
# within 30 days) at high. None means the API default and nothing is sent —
# Gemini has no effort control. Whatever it resolves to is stamped into the
# result's metadata next to the model id, prompt version and request type so
# stored flags can be reproduced.
TIER_CONFIG = {
    "free": {
        "provider": "google",
        "model": "gemini-2.5-flash",
        "max_tokens": 1024,
        "effort": None,
    },
    "starter": {
        "provider": "google",
        "model": "gemini-2.5-flash",
        "max_tokens": 1024,
        "effort": None,
    },
    "growth": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-6",
        "max_tokens": 2048,
        "effort": {"summary": "low", "analysis": "high"},
    },
    "business": {
        "provider": "anthropic",
        "model": "claude-opus-4-7",
        "max_tokens": 4096,
        "effort": {"summary": "low", "analysis": "high"},
    },
}

# Shadow candidates — run after the production call, on the very same
# normalized input, and never served to the user. One config value per tier:
# promoting a shadow model is moving its entry into TIER_CONFIG, rolling back
# is the reverse. Which tiers actually shadow is INSIGHTS_SHADOW_TIERS in the
# processor Lambda's environment (see shadow_tiers()): unset means every tier
# listed here, an empty string means none — a config change, not a deploy.
SHADOW_CONFIG = {
    "business": {
        "provider": "anthropic",
        "model": "claude-fable-5-1",
        # Fable 5.1 always thinks before answering and those tokens count
        # against max_tokens; at effort high a 4096 cap would truncate the JSON.
        "max_tokens": 16000,
        "effort": {"summary": "low", "analysis": "high"},
    },
}

SHADOW_TIERS_ENV = "INSIGHTS_SHADOW_TIERS"

# Keep the shadow call well inside the processor's 900 s Lambda timeout: the
# user's result is already in S3 by the time it starts, but a hung call would
# still burn the invocation.
SHADOW_TIMEOUT_SECONDS = 240.0


def shadow_tiers() -> Set[str]:
    """Tiers whose insights get a shadow run. Unset env → every SHADOW_CONFIG
    tier; "" → none; otherwise the listed tiers that have a shadow config."""
    raw = os.environ.get(SHADOW_TIERS_ENV)
    if raw is None:
        return set(SHADOW_CONFIG)
    return {t.strip() for t in raw.split(",") if t.strip()} & set(SHADOW_CONFIG)


def resolve_effort(config: Dict[str, Any], request_type: str) -> Optional[str]:
    """The effort a tier config sends for a request type (None = API default)."""
    effort = config.get("effort")
    if isinstance(effort, dict):
        return effort.get(request_type)
    return effort


# Request types — the only thing that moves the effort dial. Deterministic,
# computed from the normalized records before any model is called.
REQUEST_TYPE_SUMMARY = "summary"
REQUEST_TYPE_ANALYSIS = "analysis"
REQUEST_TYPES = (REQUEST_TYPE_SUMMARY, REQUEST_TYPE_ANALYSIS)
# A file with this many disposals (sells or crypto→crypto trades) gets the
# analysis treatment even without a sell/re-buy pair.
ANALYSIS_DISPOSAL_THRESHOLD = 25
WASH_SALE_WINDOW_DAYS = 30

# The flag categories the model may emit (INSIGHTS_SCHEMA flags[].category).
# They are the unit of shadow comparison: compare_insights reports agreement
# on this set, so a category is added here and in the taxonomy section of
# INSIGHTS_SYSTEM_PROMPT together, with a prompt-version bump.
FLAG_CATEGORIES = [
    "staking_income",
    "airdrop_income",
    "other_income",
    "missing_cost_basis",
    "missing_fields",
    "possible_duplicate",
    "large_transfer",
    "wash_sale_candidate",
    "internal_transfer",
    "unknown_type",
]

# The flag schema — the JSON contract every insights response must satisfy.
# Sent to Claude as a structured-output format (output_config.format), so the
# response is schema-valid or the call fails; there is no tool call to force.
# Structured outputs reject map-shaped objects (additionalProperties must be
# false), so transaction_types travels as [{type, count}] and is folded back
# into the {type: count} dict the frontend type expects (lib/upload-client.ts)
# by _normalize_insights.
INSIGHTS_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "total_transactions": {"type": "integer"},
        "date_range": {
            "type": "object",
            "properties": {
                "start": {"type": "string"},
                "end": {"type": "string"},
            },
            "required": ["start", "end"],
            "additionalProperties": False,
        },
        "transaction_types": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {"type": "string"},
                    "count": {"type": "integer"},
                },
                "required": ["type", "count"],
                "additionalProperties": False,
            },
        },
        "top_assets": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "asset": {"type": "string"},
                    "count": {"type": "integer"},
                },
                "required": ["asset", "count"],
                "additionalProperties": False,
            },
        },
        "what_to_do_next": {"type": "array", "items": {"type": "string"}},
        "data_notes": {"type": "array", "items": {"type": "string"}},
        "estimated_taxable_events": {"type": "integer"},
        # Machine-readable counterpart of data_notes: one entry per category
        # observed, from the closed taxonomy. The dashboard does not render
        # it; the shadow comparison and the Oct 28 review read it.
        "flags": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "category": {"type": "string", "enum": FLAG_CATEGORIES},
                    "count": {"type": "integer"},
                    "detail": {"type": "string"},
                },
                "required": ["category", "count", "detail"],
                "additionalProperties": False,
            },
        },
    },
    "required": [
        "summary",
        "total_transactions",
        "date_range",
        "transaction_types",
        "top_assets",
        "what_to_do_next",
        "data_notes",
        "estimated_taxable_events",
        "flags",
    ],
    "additionalProperties": False,
}


def _normalize_insights(parsed: Any) -> Any:
    """Fold the schema's [{type, count}] transaction_types back into the
    {type: count} dict the frontend expects. A dict passes through untouched,
    so the Gemini path (which follows the prompt example) and any cached
    legacy output stay valid."""
    if not isinstance(parsed, dict):
        return parsed
    tx_types = parsed.get("transaction_types")
    if isinstance(tx_types, list):
        folded: Dict[str, int] = {}
        for item in tx_types:
            if not isinstance(item, dict) or "type" not in item:
                continue
            count = item.get("count", 0)
            if not isinstance(count, int):
                continue
            key = str(item["type"])
            folded[key] = folded.get(key, 0) + count
        parsed["transaction_types"] = folded
    # A flag counts rows with an issue, so count 0 says "nothing found" — not a
    # flag. Opus returned missing_fields, count 0, "No sampled row is missing a
    # date, amount or currency" (Oct 23 eval); kept, it reads as a finding and
    # skews shadow agreement.
    flags = parsed.get("flags")
    if isinstance(flags, list):
        parsed["flags"] = [
            f for f in flags
            if not (isinstance(f, dict) and isinstance(f.get("count"), int) and f["count"] <= 0)
        ]
    return parsed


def _message_text(message: Any) -> str:
    """Concatenate the text blocks of a Messages API response."""
    return "".join(getattr(block, "text", "") or "" for block in (message.content or []))


# What the processor stores in ai_error (and the dashboard shows) when the
# model declined or could not finish: the user still gets the deterministic
# quick stats, never a partial flag set.
INSIGHTS_UNAVAILABLE = "insights unavailable"
INSIGHTS_TRUNCATED = "insights truncated"
INSIGHTS_INVALID = "insights invalid"


# USD per million tokens, read from platform.claude.com/docs/en/about-claude/pricing
# on 2026-10-09. Internal cost accounting only — the public pricing page and
# the dashboard never name a model. An unknown model logs cost_usd=None rather
# than guessing. 5-minute cache writes are 1.25x input; reads are 0.1x
# (0.025x on Fable 5.1).
MODEL_PRICING: Dict[str, Dict[str, float]] = {
    "claude-sonnet-4-6": {"input": 3.00, "output": 15.00, "cache_write": 3.75, "cache_read": 0.30},
    "claude-opus-4-7": {"input": 5.00, "output": 25.00, "cache_write": 6.25, "cache_read": 0.50},
    # Shadow candidate for the Oct 12 wiring; priced now so its first call is costed.
    "claude-fable-5-1": {"input": 10.00, "output": 50.00, "cache_write": 12.50, "cache_read": 0.25},
}


def estimate_cost_usd(
    model: str,
    input_tokens: int,
    output_tokens: int,
    cache_read_tokens: int = 0,
    cache_creation_tokens: int = 0,
) -> Optional[float]:
    """Cost of one call from the pricing table; None when the model is unpriced.

    `input_tokens` is the uncached share of the prompt, as the Anthropic usage
    block reports it — cached reads and cache writes are billed separately."""
    price = MODEL_PRICING.get(model)
    if price is None:
        return None
    total = (
        input_tokens * price["input"]
        + cache_creation_tokens * price["cache_write"]
        + cache_read_tokens * price["cache_read"]
        + output_tokens * price["output"]
    )
    return round(total / 1_000_000, 6)


def cache_hit_rate(input_tokens: int, cache_read_tokens: int, cache_creation_tokens: int = 0) -> Optional[float]:
    """Share of prompt tokens served from the cache; None when nothing was sent."""
    prompt_total = input_tokens + cache_read_tokens + cache_creation_tokens
    if prompt_total <= 0:
        return None
    return round(cache_read_tokens / prompt_total, 4)


def _int_or_zero(value: Any) -> int:
    """Usage counters may be missing or None on some responses; count them as 0."""
    return value if isinstance(value, int) and not isinstance(value, bool) else 0


def _call_stats(
    model: str,
    input_tokens: int,
    output_tokens: int,
    cache_read_tokens: int,
    cache_creation_tokens: int,
    latency_ms: int,
) -> Dict[str, Any]:
    return {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "cache_read_tokens": cache_read_tokens,
        "cache_creation_tokens": cache_creation_tokens,
        "cache_hit_rate": cache_hit_rate(input_tokens, cache_read_tokens, cache_creation_tokens),
        "latency_ms": latency_ms,
        "cost_usd": estimate_cost_usd(
            model, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens
        ),
    }


ROLE_PRODUCTION = "production"
ROLE_SHADOW = "shadow"


def _log_insights_call(
    provider: str, model: str, tier: Optional[str], effort: Optional[str],
    stop_reason: Optional[str], stats: Dict[str, Any], role: str = ROLE_PRODUCTION,
) -> None:
    """One INFO line per model call, refusals included (they are billed too).
    Grep: `filter @message like /insights_call/`; add `and @message like
    /role=production/` for the P90-cost rule so shadow calls do not skew it."""
    logger.info(
        "insights_call role=%s provider=%s model=%s tier=%s prompt_version=%s effort=%s stop_reason=%s "
        "input_tokens=%s output_tokens=%s cache_read_tokens=%s cache_creation_tokens=%s "
        "cache_hit_rate=%s latency_ms=%s cost_usd=%s",
        role, provider, model, tier, INSIGHTS_PROMPT_VERSION, effort, stop_reason,
        stats["input_tokens"], stats["output_tokens"], stats["cache_read_tokens"],
        stats["cache_creation_tokens"], stats["cache_hit_rate"], stats["latency_ms"],
        stats["cost_usd"],
    )


class AIProvider(ABC):
    """Base class for AI providers."""

    @abstractmethod
    def analyze(self, prompt: str, data: str) -> Dict[str, Any]:
        """Analyze transaction data and return insights."""
        pass


class AnthropicProvider(AIProvider):
    """Claude AI provider for Growth (Sonnet) and Business (Opus) tiers."""

    def __init__(
        self,
        api_key: str,
        model: str,
        max_tokens: int,
        tier: Optional[str] = None,
        effort: Optional[str] = None,
        role: str = ROLE_PRODUCTION,
        timeout: Optional[float] = None,
    ):
        self.api_key = api_key
        self.model = model
        self.max_tokens = max_tokens
        self.tier = tier
        self.effort = effort
        self.role = role
        self.timeout = timeout

    @staticmethod
    def system_blocks(prompt: str) -> List[Dict[str, Any]]:
        """The cached prefix: instructions, flag taxonomy and few-shot examples
        as one system block with a cache breakpoint. It is byte-identical on
        every call (a module constant, no timestamps or ids), so the second
        call within the TTL reads it from the cache instead of paying for it.
        Per-file data never goes in here — it rides in the user turn, after
        the breakpoint."""
        return [{"type": "text", "text": prompt, "cache_control": {"type": "ephemeral"}}]

    def analyze(self, prompt: str, data: str) -> Dict[str, Any]:
        try:
            import anthropic

            client_kwargs: Dict[str, Any] = {"api_key": self.api_key}
            if self.timeout is not None:
                client_kwargs["timeout"] = self.timeout
            client = anthropic.Anthropic(**client_kwargs)

            # Structured outputs: the text block is guaranteed to satisfy
            # INSIGHTS_SCHEMA. No tools are offered, so nothing is forced.
            output_config: Dict[str, Any] = {
                "format": {"type": "json_schema", "schema": INSIGHTS_SCHEMA},
            }
            if self.effort is not None:
                output_config["effort"] = self.effort

            started = time.perf_counter()
            message = client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                system=self.system_blocks(prompt),
                messages=[{"role": "user", "content": f"Transaction Data:\n{data}"}],
                output_config=output_config,
            )
            latency_ms = int((time.perf_counter() - started) * 1000)

            # Tokens, cache hits, latency and cost — logged for every call,
            # whatever stop_reason comes back, and returned under "usage".
            usage = getattr(message, "usage", None)
            stats = _call_stats(
                self.model,
                _int_or_zero(getattr(usage, "input_tokens", 0)),
                _int_or_zero(getattr(usage, "output_tokens", 0)),
                _int_or_zero(getattr(usage, "cache_read_input_tokens", 0)),
                _int_or_zero(getattr(usage, "cache_creation_input_tokens", 0)),
                latency_ms,
            )
            stop_reason = getattr(message, "stop_reason", None)
            _log_insights_call(
                "anthropic", self.model, self.tier, self.effort, stop_reason, stats, role=self.role,
            )

            result = self._interpret(message, stop_reason)
            result["usage"] = stats
            result["stop_reason"] = stop_reason
            return result

        except Exception as e:
            logger.error(f"Anthropic API error: {e}")
            return {
                "success": False,
                "error": str(e),
                "model": self.model,
                "provider": "anthropic",
            }

    def _interpret(self, message: Any, stop_reason: Optional[str]) -> Dict[str, Any]:
        """Turn a Messages API response into the insights result dict."""
        if stop_reason == "refusal":
            # HTTP 200, but the model declined. Whatever sits in content is
            # partial at best — drop it. The processor falls back to the
            # deterministic quick stats with ai_error = INSIGHTS_UNAVAILABLE.
            #
            # Logged at WARNING with its own marker, on purpose: a refusal
            # is not an invocation error, so it must not feed the
            # processor-errors alarm (AWS/Lambda Errors) or the
            # lambda-errors Logs Insights query (filter /ERROR/). Count
            # refusals with `filter @message like /insights_refusal/`.
            stop_details = getattr(message, "stop_details", None)
            category = getattr(stop_details, "category", None)
            logger.warning(
                "insights_refusal provider=anthropic model=%s tier=%s category=%s",
                self.model, self.tier, category,
            )
            return {
                "success": False,
                "refusal": True,
                "error": INSIGHTS_UNAVAILABLE,
                "model": self.model,
                "provider": "anthropic",
            }

        if stop_reason == "max_tokens":
            # Truncated JSON is partial output too; it is not a flag set.
            logger.warning(
                "insights_truncated provider=anthropic model=%s tier=%s max_tokens=%s",
                self.model, self.tier, self.max_tokens,
            )
            return {
                "success": False,
                "error": INSIGHTS_TRUNCATED,
                "model": self.model,
                "provider": "anthropic",
            }

        response_text = _message_text(message)

        # Structured outputs guarantee schema-valid JSON on end_turn. Text
        # that still fails to parse is not something to wrap as a summary.
        try:
            insights = json.loads(response_text)
        except json.JSONDecodeError:
            logger.warning(
                "insights_invalid provider=anthropic model=%s tier=%s",
                self.model, self.tier,
            )
            return {
                "success": False,
                "error": INSIGHTS_INVALID,
                "model": self.model,
                "provider": "anthropic",
            }

        return {
            "success": True,
            "insights": _normalize_insights(insights),
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

    def __init__(self, api_key: str, model: str, max_tokens: int, tier: Optional[str] = None):
        self.api_key = api_key
        self.model = model
        self.max_tokens = max_tokens
        self.tier = tier
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
                    # 2.5 Flash thinks by default and thinking tokens count
                    # against maxOutputTokens: at 1024 it hit MAX_TOKENS with
                    # 28 tokens of answer. 0 turns thinking off for Flash.
                    "thinkingConfig": {"thinkingBudget": 0},
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

            started = time.perf_counter()
            with urllib.request.urlopen(req, timeout=60) as response:
                result = json.loads(response.read().decode("utf-8"))
            latency_ms = int((time.perf_counter() - started) * 1000)

            # Same insights_call line as the Anthropic path. Gemini reports the
            # whole prompt in promptTokenCount (cached tokens included), so the
            # uncached share is prompt minus cached. Gemini is not in
            # MODEL_PRICING, so cost_usd logs as None.
            usage_meta = result.get("usageMetadata") or {}
            prompt_tokens = _int_or_zero(usage_meta.get("promptTokenCount"))
            cached_tokens = _int_or_zero(usage_meta.get("cachedContentTokenCount"))
            finish_reason = None
            if result.get("candidates"):
                finish_reason = result["candidates"][0].get("finishReason")
            stats = _call_stats(
                self.model,
                max(prompt_tokens - cached_tokens, 0),
                _int_or_zero(usage_meta.get("candidatesTokenCount")),
                cached_tokens,
                0,
                latency_ms,
            )
            _log_insights_call("google", self.model, self.tier, None, finish_reason, stats)
            # (Gemini is never a shadow candidate; role stays production.)

            if not result.get("candidates") or not result["candidates"][0].get("content"):
                safety_feedback = result.get("promptFeedback", {})
                logger.warning(f"Gemini response blocked or empty. Feedback: {safety_feedback}")
                return {
                    "success": False,
                    "error": "Response blocked by safety filters or empty response",
                    "model": self.model,
                    "provider": "google",
                    "usage": stats,
                }

            response_text = result["candidates"][0]["content"]["parts"][0]["text"]
            clean_json = re.sub(r"^```json\s*|\s*```$", "", response_text.strip(), flags=re.MULTILINE)

            try:
                return {
                    "success": True,
                    "insights": _normalize_insights(json.loads(clean_json)),
                    "model": self.model,
                    "provider": "google",
                    "usage": stats,
                }
            except json.JSONDecodeError:
                return {
                    "success": True,
                    "insights": {"summary": response_text},
                    "model": self.model,
                    "provider": "google",
                    "usage": stats,
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


def get_ai_provider(
    tier: str, secrets: Dict[str, str], request_type: str = REQUEST_TYPE_SUMMARY,
) -> Optional[AIProvider]:
    """The production provider for a tier, with effort resolved for the request type."""
    config = TIER_CONFIG.get(tier, TIER_CONFIG["free"])
    provider_type = config["provider"]
    model = config["model"]
    max_tokens = config["max_tokens"]

    if provider_type == "anthropic":
        api_key = secrets.get("ANTHROPIC_API_KEY")
        if not api_key:
            logger.warning("Anthropic API key not found, falling back to free tier")
            return get_ai_provider("free", secrets, request_type)
        return AnthropicProvider(
            api_key, model, max_tokens, tier=tier, effort=resolve_effort(config, request_type),
        )

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
        return GoogleProvider(api_key, model, max_tokens, tier=tier)

    return None


# Prompt
#
# Bump INSIGHTS_PROMPT_VERSION whenever INSIGHTS_SYSTEM_PROMPT or
# INSIGHTS_SCHEMA changes. It is stamped into every result's metadata with the
# model id and effort, so a flag stored in insights.json can be traced to the
# exact prompt that produced it. (The user-facing "engine vN" label is a
# separate, coarser version in lib/insights-engine.ts.)
#
# INSIGHTS_SYSTEM_PROMPT is the cached prefix on the Anthropic path: the
# instructions, the flag taxonomy and the few-shot examples, sent as one system
# block with a cache breakpoint (AnthropicProvider.system_blocks). It has to be
# byte-identical between calls for the cache to hit, and long enough to be
# cacheable at all — Opus 4.7's minimum cacheable prefix is 2048 tokens (Fable
# 5.1: 512), which is why the examples are complete rather than abbreviated.
# Never interpolate anything into it.
INSIGHTS_PROMPT_VERSION = "2026-10-13"

INSIGHTS_SYSTEM_PROMPT = """You are the insights engine for TaxFormatter. TaxFormatter is a CSV repair tool: it detects an exchange or bank export, repairs and normalizes it, and produces a file that imports cleanly into tax software (Koinly, TurboTax, CoinLedger, ZenLedger).

TaxFormatter does NOT calculate taxes, cost basis, or gains and losses. It only cleans and reformats transaction data; the tax software the user imports into does the calculations. You never give tax advice. You describe what the data contains, in plain language, so the user knows what to expect after import and which rows to look at.

## Input

You receive one cleaned export as CSV text. The first line states how many records the file holds in total and how many you are shown. When the file is longer than the sample you see the earliest and the latest rows; treat them as representative, scale type and asset counts in proportion, and say in `summary` that counts are estimated from a sample. Columns, when present:

- Date — UTC, YYYY-MM-DD HH:MM:SS
- Sent Amount, Sent Currency — what left the account
- Received Amount, Received Currency — what arrived
- Fee Amount, Fee Currency
- Label — exchange-supplied label such as reward, staking, airdrop, deposit, withdrawal (often empty)
- Description — the exchange's own wording for the row

A row with both a sent and a received side is a trade: fiat→crypto is a buy, crypto→fiat is a sell, crypto→crypto is a trade (a disposal of the sent asset). A row with only a sent side is a withdrawal or transfer out; only a received side is a deposit, transfer in, or income (reward, staking, airdrop, interest, mining).

## Output

Return one JSON object with exactly these fields — every field is required, use an empty list rather than omitting one:

1. summary — 2 or 3 sentences on what the cleaned file contains: source, period, dominant assets and activity, whether the rows look complete. Factual, not promotional.
2. total_transactions — the total from the first input line, as an integer.
3. date_range — {start, end} as YYYY-MM-DD, from the earliest and latest dates you see.
4. transaction_types — [{type, count}] using these type names: buy, sell, trade, deposit, withdrawal, transfer, staking, airdrop, interest, mining, income, fee, unknown. Omit types with a zero count.
5. top_assets — up to 5 [{asset, count}] by number of rows that touch the asset. Exclude fiat (USD, EUR, GBP, CAD, AUD, JPY).
6. what_to_do_next — 2 to 4 short steps. Always include downloading the file and importing it into the tax software, and that the tax software calculates cost basis and gains or losses. Add a step only when a flagged row needs the user's attention.
7. data_notes — 0 to 6 plain-language observations about the data that affect what the tax software can do with it: fields that could not be recovered, rows that need a look, income rows, large transfers, duplicates. Observations only; never advice.
8. estimated_taxable_events — integer count of rows that are usually taxable events: sells, trades, and income rows (staking, airdrop, interest, mining, income). When the file was sampled, scale from the sample. The tax software determines the actual events.
9. flags — 0 to 6 entries, one per category from the taxonomy below, {category, count, detail}. `count` is the number of affected rows you can see; when the file was sampled, say in `detail` that the count comes from the sample. `detail` is one sentence, under 160 characters, stating the observation with dates or assets where they help. Only flag what you can point to in the rows; no flag is better than a guessed one.

## Flag taxonomy

Use these categories and no others. One entry per category.

- staking_income — rows that are staking or Earn rewards, received with nothing sent.
- airdrop_income — rows that are airdrops or forks.
- other_income — interest, mining, referral, cashback or other income rows that are not staking or airdrops.
- missing_cost_basis — an asset is sold or traded away but the file holds no acquisition of it (it arrived by transfer in, or before the file starts).
- missing_fields — rows with an empty date, or a sent/received side with an amount but no currency or a currency but no amount.
- possible_duplicate — two or more rows with the same date, amounts and currencies.
- large_transfer — a transfer in or out that is far larger than the rest of the file's rows (roughly ten times the typical row).
- wash_sale_candidate — the same asset is sold or traded away and then bought again within 30 days. State both dates.
- internal_transfer — withdrawals or deposits that look like moves between the user's own wallets or accounts; the file cannot confirm ownership of the other side.
- unknown_type — rows whose kind cannot be determined from the amounts, label and description.

## Rules

- Everything you state must be visible in the rows. Unknown stays unknown: do not invent an exchange, a period, a cost basis or a classification the data does not show.
- Never give tax advice and never name a tax rule. "usually treated as income" is as far as a note goes.
- Counts are integers. Dates are YYYY-MM-DD. Asset tickers are written as they appear in the file.
- Keep the summary to 3 sentences, what_to_do_next to 4 items, data_notes to 6 items and flags to 6 entries.
- If the rows are empty or unreadable, say so in summary, return zeros and empty lists, and add an unknown_type flag.

## Examples

### Example 1 — a small Coinbase export, shown in full

Input:
Total Records: 10 (showing all 10)
Date,Sent Amount,Sent Currency,Received Amount,Received Currency,Fee Amount,Fee Currency,Label,Description
2024-01-15 14:02:11,500,USD,0.0118,BTC,2.99,USD,,Bought 0.0118 BTC for $500.00 USD
2024-02-03 09:15:40,300,USD,0.1192,ETH,1.99,USD,,Bought 0.1192 ETH for $300.00 USD
2024-03-11 18:44:02,200,USD,0.0031,BTC,1.49,USD,,Bought 0.0031 BTC for $200.00 USD
2024-04-20 11:08:55,,,0.0042,ETH,,,reward,Received 0.0042 ETH from Coinbase Earn (staking reward)
2024-05-02 16:30:19,0.0500,ETH,,,0.0008,ETH,,Sent 0.0500 ETH to external wallet
2024-06-18 13:12:07,0.0100,BTC,655.20,USD,3.27,USD,,Sold 0.0100 BTC for $655.20 USD
2024-07-04 08:59:33,100,USD,0.0015,BTC,0.99,USD,,Bought 0.0015 BTC for $100.00 USD
2024-08-22 21:05:48,,,0.0039,ETH,,,reward,Received 0.0039 ETH from Coinbase Earn (staking reward)
2024-10-30 10:41:26,250,USD,0.0963,ETH,1.49,USD,,Bought 0.0963 ETH for $250.00 USD
2024-12-28 19:27:14,0.0200,ETH,66.10,USD,0.99,USD,,Sold 0.0200 ETH for $66.10 USD

Output:
{
  "summary": "Your Coinbase export contains 10 transactions from January to December 2024: five BTC and ETH purchases, two sales, two Coinbase Earn staking rewards and one transfer out. Every row has a date, amount and currency, so the file imports as-is.",
  "total_transactions": 10,
  "date_range": {"start": "2024-01-15", "end": "2024-12-28"},
  "transaction_types": [{"type": "buy", "count": 5}, {"type": "sell", "count": 2}, {"type": "staking", "count": 2}, {"type": "withdrawal", "count": 1}],
  "top_assets": [{"asset": "ETH", "count": 6}, {"asset": "BTC", "count": 4}],
  "what_to_do_next": [
    "Download this file and import it into your tax software (Koinly, TurboTax, CoinLedger, or ZenLedger).",
    "The tax software will calculate your cost basis and capital gains or losses.",
    "Check the 2024-05-02 transfer to an external wallet and mark it in your tax software if that wallet is yours."
  ],
  "data_notes": [
    "2 staking rewards from Coinbase Earn (ETH), usually treated as income.",
    "BTC was sold on 2024-06-18 and bought again on 2024-07-04, 16 days later.",
    "1 outgoing ETH transfer to an external wallet; the file does not say whether you own that wallet."
  ],
  "estimated_taxable_events": 4,
  "flags": [
    {"category": "staking_income", "count": 2, "detail": "2 ETH staking rewards from Coinbase Earn (2024-04-20, 2024-08-22)."},
    {"category": "wash_sale_candidate", "count": 1, "detail": "BTC sold 2024-06-18 and bought again 2024-07-04, 16 days later."},
    {"category": "internal_transfer", "count": 1, "detail": "0.05 ETH sent to an external wallet on 2024-05-02; the file does not show who owns it."}
  ]
}

### Example 2 — a sampled Kraken export with duplicates, a missing field and a sell/re-buy

Input:
Total Records: 240 (showing 12: the first 6 and last 6 rows)
Date,Sent Amount,Sent Currency,Received Amount,Received Currency,Fee Amount,Fee Currency,Label,Description
2023-01-03 08:12:45,,,1000,USD,,,deposit,deposit
2023-01-03 08:40:10,1000,USD,0.0601,BTC,2.60,USD,,trade
2023-01-09 17:25:31,0.0601,BTC,1.0210,ETH,0.0001,BTC,,trade
2023-01-09 17:25:31,0.0601,BTC,1.0210,ETH,0.0001,BTC,,trade
2023-02-14 00:00:00,,,0.0150,ETH,,,staking,staking
2023-02-20 12:05:06,0.2500,,,,0.0010,ETH,withdrawal,withdrawal
2023-11-28 09:30:00,0.5000,ETH,1021.40,USD,2.04,USD,,trade
2023-12-01 09:30:00,1021.40,USD,0.4980,ETH,2.04,USD,,trade
2023-12-14 00:00:00,,,0.0162,ETH,,,staking,staking
2023-12-20 15:11:52,0.2000,ETH,,,0.0010,ETH,withdrawal,withdrawal
2023-12-29 09:30:00,0.3000,ETH,702.30,USD,1.40,USD,,trade
2023-12-31 23:59:59,,,25.00,DOGE,,,airdrop,airdrop

Output:
{
  "summary": "Your Kraken export contains 240 transactions between January and December 2023, mostly ETH and BTC trades with regular staking rewards and a few withdrawals. Counts below are estimated from a 12-row sample. One sampled withdrawal is missing its currency and one trade appears twice, so a few rows may need a look after import.",
  "total_transactions": 240,
  "date_range": {"start": "2023-01-03", "end": "2023-12-31"},
  "transaction_types": [{"type": "trade", "count": 60}, {"type": "sell", "count": 40}, {"type": "buy", "count": 40}, {"type": "staking", "count": 40}, {"type": "withdrawal", "count": 40}, {"type": "deposit", "count": 20}],
  "top_assets": [{"asset": "ETH", "count": 180}, {"asset": "BTC", "count": 60}, {"asset": "DOGE", "count": 20}],
  "what_to_do_next": [
    "Download this file and import it into your tax software (Koinly, TurboTax, CoinLedger, or ZenLedger).",
    "The tax software will calculate your cost basis and capital gains or losses.",
    "Look at the 2023-01-09 BTC to ETH trade that appears twice and the 2023-02-20 withdrawal with no currency before you rely on the totals."
  ],
  "data_notes": [
    "The 2023-01-09 BTC to ETH trade appears twice with identical amounts; one may be a duplicate.",
    "The 2023-02-20 withdrawal has an amount but no currency.",
    "Staking rewards arrive about monthly (ETH), usually treated as income.",
    "ETH was sold on 2023-11-28 and bought again on 2023-12-01, 3 days later.",
    "Two ETH withdrawals go to addresses the file does not identify."
  ],
  "estimated_taxable_events": 180,
  "flags": [
    {"category": "possible_duplicate", "count": 2, "detail": "In the sample, the 2023-01-09 17:25:31 BTC to ETH trade appears twice with identical amounts."},
    {"category": "missing_fields", "count": 1, "detail": "In the sample, the 2023-02-20 withdrawal of 0.25 has no sent currency."},
    {"category": "staking_income", "count": 2, "detail": "2 ETH staking rewards in the sample (2023-02-14, 2023-12-14); the full file holds about 40."},
    {"category": "airdrop_income", "count": 1, "detail": "25 DOGE received as an airdrop on 2023-12-31."},
    {"category": "wash_sale_candidate", "count": 1, "detail": "ETH sold 2023-11-28 and bought again 2023-12-01, 3 days later."},
    {"category": "internal_transfer", "count": 2, "detail": "2 ETH withdrawals in the sample (2023-02-20, 2023-12-20) to destinations the file does not identify."}
  ]
}
"""


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

    # The request type moves the effort dial; it is decided here, from the
    # records, before any provider exists — the shadow run makes the same call.
    request_type = classify_request(records)

    provider = get_ai_provider(tier, secrets, request_type)
    if not provider:
        return {
            "success": False,
            "error": "AI provider not available",
        }

    # One normalized, capped payload. generate_shadow_insights builds the
    # identical bytes from the same records, so both models see the same input.
    request = build_insights_input(records)

    result = provider.analyze(INSIGHTS_SYSTEM_PROMPT, request["data"])

    result["tier"] = tier
    result["role"] = ROLE_PRODUCTION
    result["metadata"] = _metadata(provider, result, request_type, request["input"])
    return result


def _metadata(
    provider: AIProvider, result: Dict[str, Any], request_type: str, input_meta: Dict[str, Any],
) -> Dict[str, Any]:
    """Reproducibility stamp — on every outcome, refusals included, so a stored
    result always says which model, prompt, effort and input produced (or
    declined) it."""
    return {
        "model": provider.model,
        "provider": result.get("provider"),
        "prompt_version": INSIGHTS_PROMPT_VERSION,
        "effort": getattr(provider, "effort", None),
        "request_type": request_type,
        "input": input_meta,
    }


# ---------------------------------------------------------------------------
# Normalized input — the one payload both the production and the shadow model see
# ---------------------------------------------------------------------------

# Koinly columns in the order the model is told to expect them. TxHash is
# dropped: 64 hex characters per row that say nothing about the transaction.
INSIGHTS_COLUMNS = (
    "Date", "Sent Amount", "Sent Currency", "Received Amount", "Received Currency",
    "Fee Amount", "Fee Currency", "Label", "Description",
)
# Per-file caps so a long history cannot blow up the cost of one call. Rows
# first (the earliest and latest half each), then total characters — the
# sample halves until the text fits. Cells are trimmed so one enormous
# description cannot eat the budget either.
MAX_INSIGHTS_RECORDS = 100
MIN_INSIGHTS_RECORDS = 10
MAX_INSIGHTS_INPUT_CHARS = 24_000
MAX_INSIGHTS_CELL_CHARS = 80


def _sample_records(records: List[Dict[str, Any]], size: int) -> List[Dict[str, Any]]:
    if len(records) <= size:
        return list(records)
    head = size // 2
    tail = size - head
    return list(records[:head]) + list(records[-tail:])


def _insights_columns(records: List[Dict[str, Any]]) -> List[str]:
    """The known columns present on the first record; for a record shaped some
    other way (older callers, tests) every key but TxHash, in its own order."""
    if not records:
        return []
    first = records[0]
    known = [c for c in INSIGHTS_COLUMNS if c in first]
    if known:
        return known
    return [k for k in first.keys() if k != "TxHash"]


def _cell(value: Any) -> str:
    text = "" if value is None else str(value)
    if len(text) > MAX_INSIGHTS_CELL_CHARS:
        text = text[: MAX_INSIGHTS_CELL_CHARS - 1] + "…"
    return text


def normalize_insights_records(records: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """Project records onto the insights columns with trimmed string cells."""
    columns = _insights_columns(records)
    return [{c: _cell(r.get(c)) for c in columns} for r in records]


def _serialize(records: List[Dict[str, Any]], total: int) -> str:
    sent = len(records)
    if sent == total:
        header = f"Total Records: {total} (showing all {sent})"
    else:
        head = sent // 2
        header = f"Total Records: {total} (showing {sent}: the first {head} and last {sent - head} rows)"
    out = StringIO()
    columns = _insights_columns(records)
    if columns:
        # lineterminator pinned so the bytes do not depend on the platform.
        writer = csv.DictWriter(out, fieldnames=columns, lineterminator="\n")
        writer.writeheader()
        # M-10: sanitize before serializing — defense in depth so a malicious
        # description that survives the AI round-trip and gets re-exported
        # still can't trigger formula execution.
        writer.writerows(sanitize_csv_records(normalize_insights_records(records)))
    return f"{header}\n{out.getvalue()}"


def build_insights_input(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """The text the model receives plus what was done to get there.

    Deterministic: the same records always give the same bytes, which is what
    lets the shadow run claim it saw the production input."""
    total = len(records)
    size = min(total, MAX_INSIGHTS_RECORDS)
    sample = _sample_records(records, size)
    data = _serialize(sample, total)
    while len(data) > MAX_INSIGHTS_INPUT_CHARS and size > MIN_INSIGHTS_RECORDS:
        size = max(size // 2, MIN_INSIGHTS_RECORDS)
        sample = _sample_records(records, size)
        data = _serialize(sample, total)
    trimmed_cells = any(
        len(str(r.get(c) or "")) > MAX_INSIGHTS_CELL_CHARS
        for r in sample for c in _insights_columns(sample)
    )
    return {
        "data": data,
        "input": {
            "records_total": total,
            "records_sent": len(sample),
            "chars": len(data),
            "capped": len(sample) < total or trimmed_cells,
        },
    }


# ---------------------------------------------------------------------------
# Request type — deterministic, from the records, before any model is called
# ---------------------------------------------------------------------------

def _ticker(value: Any) -> str:
    return (str(value) if value is not None else "").strip().upper()


def _parse_date(value: Any) -> Optional[datetime]:
    text = (str(value) if value is not None else "").strip()
    if len(text) < 10:
        return None
    try:
        return datetime.strptime(text[:10], "%Y-%m-%d")
    except ValueError:
        return None


def _disposal_and_acquisition(record: Dict[str, Any]):
    """(disposed asset, acquired asset) for one row; None where not applicable.

    Koinly rows: a non-fiat sent side with something received is a disposal
    (sell or crypto→crypto trade); a non-fiat received side with something sent
    is an acquisition. Transfers (one side only) are neither. Rows shaped
    {type, asset} (older callers, tests) use their type directly."""
    if "Sent Currency" in record or "Received Currency" in record:
        sent = _ticker(record.get("Sent Currency"))
        received = _ticker(record.get("Received Currency"))
        disposed = sent if sent and sent not in _FIAT and received else None
        acquired = received if received and received not in _FIAT and sent else None
        return disposed, acquired
    kind = str(record.get("type") or "").lower()
    asset = _ticker(record.get("asset"))
    if not asset:
        desc = str(record.get("Description") or record.get("description") or "").lower()
        if any(t in desc for t in _SELL_TOKENS):
            kind = kind or "sell"
        elif any(t in desc for t in _BUY_TOKENS):
            kind = kind or "buy"
    return (asset if kind == "sell" and asset else None, asset if kind == "buy" and asset else None)


def classify_request(records: List[Dict[str, Any]]) -> str:
    """'analysis' when the file has ANALYSIS_DISPOSAL_THRESHOLD or more
    disposals, or an asset sold and bought again within WASH_SALE_WINDOW_DAYS;
    otherwise 'summary'."""
    disposals = 0
    sold_on: Dict[str, List[datetime]] = {}
    bought_on: Dict[str, List[datetime]] = {}
    for record in records:
        disposed, acquired = _disposal_and_acquisition(record)
        date = _parse_date(record.get("Date", record.get("date")))
        if disposed:
            disposals += 1
            if date:
                sold_on.setdefault(disposed, []).append(date)
        if acquired and date:
            bought_on.setdefault(acquired, []).append(date)
    if disposals >= ANALYSIS_DISPOSAL_THRESHOLD:
        return REQUEST_TYPE_ANALYSIS
    for asset, sells in sold_on.items():
        buys = bought_on.get(asset)
        if not buys:
            continue
        for sold in sells:
            for bought in buys:
                if 0 <= (bought - sold).days <= WASH_SALE_WINDOW_DAYS:
                    return REQUEST_TYPE_ANALYSIS
    return REQUEST_TYPE_SUMMARY


# ---------------------------------------------------------------------------
# Shadow run — same input, a candidate model, never served
# ---------------------------------------------------------------------------

def _shadow_provider(tier: str, secrets: Dict[str, str], request_type: str) -> Optional[AIProvider]:
    config = SHADOW_CONFIG[tier]
    if config["provider"] != "anthropic":
        logger.warning("insights_shadow_skipped tier=%s reason=unsupported_provider", tier)
        return None
    api_key = secrets.get("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("insights_shadow_skipped tier=%s reason=no_api_key", tier)
        return None
    return AnthropicProvider(
        api_key, config["model"], config["max_tokens"], tier=tier,
        effort=resolve_effort(config, request_type), role=ROLE_SHADOW,
        timeout=SHADOW_TIMEOUT_SECONDS,
    )


def compare_insights(production: Any, shadow: Any) -> Dict[str, Any]:
    """Agreement between two insights dicts on what the review reads: the
    flag categories (Jaccard), the taxable-event estimate and the type
    breakdown. Not comparable when either side has no insights."""
    if not isinstance(production, dict) or not isinstance(shadow, dict):
        return {"comparable": False}

    def categories(insights: Dict[str, Any]) -> Set[str]:
        return {
            str(f["category"]) for f in insights.get("flags") or []
            if isinstance(f, dict) and "category" in f
        }

    p_flags, s_flags = categories(production), categories(shadow)
    union = p_flags | s_flags
    p_events, s_events = production.get("estimated_taxable_events"), shadow.get("estimated_taxable_events")
    return {
        "comparable": True,
        "flag_jaccard": round(len(p_flags & s_flags) / len(union), 4) if union else 1.0,
        "flags_only_production": sorted(p_flags - s_flags),
        "flags_only_shadow": sorted(s_flags - p_flags),
        "taxable_events_delta": (
            s_events - p_events if isinstance(p_events, int) and isinstance(s_events, int) else None
        ),
        "transaction_types_match": production.get("transaction_types") == shadow.get("transaction_types"),
        "total_transactions_match": production.get("total_transactions") == shadow.get("total_transactions"),
    }


def generate_shadow_insights(
    records: List[Dict[str, Any]],
    tier: str,
    secrets: Dict[str, str],
    production_insights: Any = None,
) -> Optional[Dict[str, Any]]:
    """Run the tier's shadow model on the same normalized input as the
    production call. Returns None when the tier is not shadowed (or the
    shadow provider cannot be built); otherwise the full result with the
    same metadata stamp plus `agreement` against the production insights.

    Deliberately no server-side refusal fallback: the point is to measure
    the candidate's refusal rate, not to hide it behind another model."""
    if tier not in shadow_tiers() or not records:
        return None

    request_type = classify_request(records)
    provider = _shadow_provider(tier, secrets, request_type)
    if provider is None:
        return None

    request = build_insights_input(records)
    result = provider.analyze(INSIGHTS_SYSTEM_PROMPT, request["data"])
    result["tier"] = tier
    result["role"] = ROLE_SHADOW
    result["metadata"] = _metadata(provider, result, request_type, request["input"])
    result["metadata"]["production_model"] = TIER_CONFIG.get(tier, {}).get("model")
    result["agreement"] = compare_insights(production_insights, result.get("insights"))

    usage = result.get("usage") or {}
    agreement = result["agreement"]
    # One line per shadow run with everything the review reads.
    # Grep: `filter @message like /insights_shadow /`.
    logger.info(
        "insights_shadow tier=%s model=%s production_model=%s request_type=%s effort=%s "
        "stop_reason=%s success=%s refusal=%s cost_usd=%s latency_ms=%s cache_hit_rate=%s "
        "comparable=%s flag_jaccard=%s flags_only_production=%s flags_only_shadow=%s "
        "taxable_events_delta=%s transaction_types_match=%s",
        tier, provider.model, result["metadata"]["production_model"], request_type, provider.effort,
        result.get("stop_reason"), result.get("success"), bool(result.get("refusal")),
        usage.get("cost_usd"), usage.get("latency_ms"), usage.get("cache_hit_rate"),
        agreement.get("comparable"), agreement.get("flag_jaccard"),
        ",".join(agreement.get("flags_only_production", [])) or "-",
        ",".join(agreement.get("flags_only_shadow", [])) or "-",
        agreement.get("taxable_events_delta"), agreement.get("transaction_types_match"),
    )
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
