# AI Transaction Categorization - Implementation Plan

## Overview

Tier-based AI categorization for crypto transactions. Free users get **no AI subsidy** from paid users - they use the cheapest possible model (or no AI at all).

## Business Rules

| Tier | AI Model | Cost/1M tokens (input) | Rationale |
|------|----------|------------------------|-----------|
| **Free** | Gemini 1.5 Flash | $0.075 (Google free tier available) | Cheapest option, no paid user subsidy |
| **Pro** | Claude Haiku 3.5 | $0.80 | Fast, excellent quality/cost ratio |
| **Premium** | Claude Opus 4 | $15 | Best quality, premium experience |

### Model Selection Rationale

**Free: Gemini 1.5 Flash**
- Google offers generous free tier (15 RPM, 1M tokens/day)
- Falls back gracefully if quota exceeded
- Provides basic AI without costing us anything
- Clear upgrade path to better models

**Pro: Claude Haiku 3.5**
- Best balance of speed, quality, and cost
- Fast responses (~1-2s per transaction batch)
- High accuracy for transaction categorization

**Premium: Claude Opus 4**
- Best-in-class reasoning and accuracy
- Handles edge cases and complex transactions
- Justifies premium pricing

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Processor Lambda                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Receive SQS message with job_id, user_id                    │
│                           ↓                                      │
│  2. Query user's subscription tier from Neon                    │
│                           ↓                                      │
│  3. Process CSV → get transactions                              │
│                           ↓                                      │
│  4. For each transaction:                                       │
│      a. Check ai_cache (description hash + model)               │
│      b. If cache miss → call LLM based on tier                  │
│      c. Store result in ai_cache                                │
│                           ↓                                      │
│  5. Attach categories to output CSV                             │
│                           ↓                                      │
│  6. Upload result + AI insights to S3                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## LLM Provider Abstraction

### File: `backend/services/llm_provider.py`

```python
"""
LLM Provider Abstraction Layer
Supports: Claude (Anthropic), Gemini (Google), OpenAI
Model selection based on subscription tier.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Optional, Dict, Any
import os
import json
import logging

logger = logging.getLogger(__name__)


class SubscriptionTier(Enum):
    FREE = "free"
    PRO = "pro"
    PREMIUM = "premium"


@dataclass
class CategorizationResult:
    category: str           # e.g., "Trading", "Staking Reward", "Transfer"
    sub_category: str       # e.g., "Spot Trade", "DeFi Yield"
    confidence: float       # 0.0 - 1.0
    tax_relevant: bool      # Is this a taxable event?
    explanation: str        # Brief explanation
    model_used: str         # Which model generated this


class LLMProvider(ABC):
    """Abstract base for LLM providers."""

    @abstractmethod
    def categorize(self, transaction: Dict) -> CategorizationResult:
        pass

    @abstractmethod
    def get_model_name(self) -> str:
        pass


class NoAIProvider(LLMProvider):
    """Placeholder for free tier - no AI categorization."""

    def categorize(self, transaction: Dict) -> CategorizationResult:
        # Rule-based fallback
        tx_type = transaction.get("type", "").lower()

        category_map = {
            "buy": ("Trading", "Buy", True),
            "sell": ("Trading", "Sell", True),
            "trade": ("Trading", "Trade", True),
            "transfer": ("Transfer", "Internal", False),
            "deposit": ("Transfer", "Deposit", False),
            "withdrawal": ("Transfer", "Withdrawal", False),
            "staking": ("Income", "Staking Reward", True),
            "reward": ("Income", "Reward", True),
            "interest": ("Income", "Interest", True),
            "airdrop": ("Income", "Airdrop", True),
        }

        for key, (cat, sub, taxable) in category_map.items():
            if key in tx_type:
                return CategorizationResult(
                    category=cat,
                    sub_category=sub,
                    confidence=0.7,
                    tax_relevant=taxable,
                    explanation="Rule-based categorization",
                    model_used="none"
                )

        return CategorizationResult(
            category="Unknown",
            sub_category="Uncategorized",
            confidence=0.0,
            tax_relevant=False,
            explanation="Unable to categorize - upgrade for AI analysis",
            model_used="none"
        )

    def get_model_name(self) -> str:
        return "none"


class GeminiProvider(LLMProvider):
    """Google Gemini for free tier (if offering basic AI)."""

    def __init__(self):
        self.api_key = os.environ.get("GOOGLE_GEMINI_API_KEY")
        self.model = "gemini-1.5-flash"

    def categorize(self, transaction: Dict) -> CategorizationResult:
        if not self.api_key:
            return NoAIProvider().categorize(transaction)

        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            model = genai.GenerativeModel(self.model)

            prompt = self._build_prompt(transaction)
            response = model.generate_content(prompt)

            return self._parse_response(response.text)
        except Exception as e:
            logger.warning(f"Gemini API error: {e}")
            return NoAIProvider().categorize(transaction)

    def _build_prompt(self, tx: Dict) -> str:
        return f"""Categorize this crypto transaction for tax purposes.

Transaction:
- Type: {tx.get('type', 'unknown')}
- Amount: {tx.get('amount', 'unknown')}
- Currency: {tx.get('currency', 'unknown')}
- Description: {tx.get('description', '')}

Respond in JSON:
{{"category": "...", "sub_category": "...", "confidence": 0.0-1.0, "tax_relevant": true/false, "explanation": "..."}}

Categories: Trading, Transfer, Income, Fee, Unknown
Tax relevant: trades, rewards, airdrops, interest = true; internal transfers = false"""

    def _parse_response(self, text: str) -> CategorizationResult:
        try:
            # Extract JSON from response
            import re
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                return CategorizationResult(
                    category=data.get("category", "Unknown"),
                    sub_category=data.get("sub_category", ""),
                    confidence=float(data.get("confidence", 0.5)),
                    tax_relevant=data.get("tax_relevant", False),
                    explanation=data.get("explanation", ""),
                    model_used=self.model
                )
        except Exception as e:
            logger.warning(f"Failed to parse Gemini response: {e}")

        return NoAIProvider().categorize({})

    def get_model_name(self) -> str:
        return self.model


class ClaudeProvider(LLMProvider):
    """Anthropic Claude for Pro/Premium tiers."""

    def __init__(self, model: str = "claude-3-5-haiku-20241022"):
        self.api_key = os.environ.get("ANTHROPIC_API_KEY")
        self.model = model

    def categorize(self, transaction: Dict) -> CategorizationResult:
        if not self.api_key:
            logger.error("ANTHROPIC_API_KEY not set")
            return NoAIProvider().categorize(transaction)

        try:
            import anthropic
            client = anthropic.Anthropic(api_key=self.api_key)

            prompt = self._build_prompt(transaction)

            response = client.messages.create(
                model=self.model,
                max_tokens=256,
                messages=[{"role": "user", "content": prompt}]
            )

            return self._parse_response(response.content[0].text)
        except Exception as e:
            logger.error(f"Claude API error: {e}")
            return NoAIProvider().categorize(transaction)

    def _build_prompt(self, tx: Dict) -> str:
        return f"""You are a crypto tax expert. Categorize this transaction.

Transaction Details:
- Exchange: {tx.get('exchange', 'unknown')}
- Type: {tx.get('type', 'unknown')}
- Date: {tx.get('date', 'unknown')}
- Amount: {tx.get('amount', 'unknown')} {tx.get('currency', '')}
- Fee: {tx.get('fee', '0')} {tx.get('fee_currency', '')}
- Description: {tx.get('description', '')}

Respond ONLY with valid JSON (no markdown):
{{"category": "Trading|Transfer|Income|Fee|Unknown", "sub_category": "specific type", "confidence": 0.0-1.0, "tax_relevant": true/false, "explanation": "brief reason"}}

Tax relevance rules:
- Trades (buy/sell/swap): tax_relevant = true
- Staking rewards, airdrops, mining income: tax_relevant = true
- Internal transfers between own wallets: tax_relevant = false
- Deposits from external: tax_relevant = false (unless income)
- Fees paid: tax_relevant = true (may be deductible)"""

    def _parse_response(self, text: str) -> CategorizationResult:
        try:
            import re
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                return CategorizationResult(
                    category=data.get("category", "Unknown"),
                    sub_category=data.get("sub_category", ""),
                    confidence=float(data.get("confidence", 0.8)),
                    tax_relevant=data.get("tax_relevant", False),
                    explanation=data.get("explanation", ""),
                    model_used=self.model
                )
        except Exception as e:
            logger.warning(f"Failed to parse Claude response: {e}")

        return CategorizationResult(
            category="Unknown",
            sub_category="Parse Error",
            confidence=0.0,
            tax_relevant=False,
            explanation="Failed to parse AI response",
            model_used=self.model
        )

    def get_model_name(self) -> str:
        return self.model


class OpenAIProvider(LLMProvider):
    """OpenAI GPT fallback (optional)."""

    def __init__(self, model: str = "gpt-4o-mini"):
        self.api_key = os.environ.get("OPENAI_API_KEY")
        self.model = model

    def categorize(self, transaction: Dict) -> CategorizationResult:
        if not self.api_key:
            return NoAIProvider().categorize(transaction)

        try:
            from openai import OpenAI
            client = OpenAI(api_key=self.api_key)

            response = client.chat.completions.create(
                model=self.model,
                max_tokens=256,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": "You are a crypto tax expert. Respond only with JSON."},
                    {"role": "user", "content": self._build_prompt(transaction)}
                ]
            )

            return self._parse_response(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return NoAIProvider().categorize(transaction)

    def _build_prompt(self, tx: Dict) -> str:
        # Same as Claude
        return ClaudeProvider()._build_prompt(tx)

    def _parse_response(self, text: str) -> CategorizationResult:
        # Same as Claude
        return ClaudeProvider()._parse_response(text)

    def get_model_name(self) -> str:
        return self.model


# =============================================================================
# PROVIDER FACTORY
# =============================================================================

def get_provider_for_tier(tier: SubscriptionTier) -> LLMProvider:
    """
    Get the appropriate LLM provider based on subscription tier.

    FREE:    GeminiProvider (Google free tier - no cost to us)
    PRO:     ClaudeProvider with Haiku 3.5
    PREMIUM: ClaudeProvider with Opus 4
    """
    if tier == SubscriptionTier.FREE:
        return GeminiProvider()  # Gemini Flash - free tier

    elif tier == SubscriptionTier.PRO:
        return ClaudeProvider(model="claude-3-5-haiku-20241022")

    elif tier == SubscriptionTier.PREMIUM:
        return ClaudeProvider(model="claude-opus-4-20250514")

    else:
        return GeminiProvider()  # Default to free tier


# =============================================================================
# CACHING LAYER
# =============================================================================

def get_cache_key(transaction: Dict) -> str:
    """Generate a cache key from transaction details."""
    import hashlib

    # Normalize and hash key fields
    key_parts = [
        str(transaction.get("type", "")).lower().strip(),
        str(transaction.get("description", "")).lower().strip()[:100],
        str(transaction.get("currency", "")).upper().strip(),
    ]

    key_string = "|".join(key_parts)
    return hashlib.sha256(key_string.encode()).hexdigest()[:32]


def check_cache(user_id: str, cache_key: str, model: str, db_conn) -> Optional[CategorizationResult]:
    """Check if we have a cached result for this transaction."""
    try:
        cursor = db_conn.cursor()
        cursor.execute("""
            SELECT result FROM ai_cache
            WHERE user_id = %s AND key = %s AND model = %s
            AND (expires_at IS NULL OR expires_at > NOW())
        """, (user_id, cache_key, model))

        row = cursor.fetchone()
        if row:
            data = row[0]  # JSONB
            return CategorizationResult(
                category=data.get("category"),
                sub_category=data.get("sub_category"),
                confidence=data.get("confidence"),
                tax_relevant=data.get("tax_relevant"),
                explanation=data.get("explanation"),
                model_used=data.get("model_used")
            )
    except Exception as e:
        logger.warning(f"Cache lookup failed: {e}")

    return None


def save_to_cache(user_id: str, cache_key: str, result: CategorizationResult, db_conn):
    """Save categorization result to cache."""
    try:
        cursor = db_conn.cursor()
        cursor.execute("""
            INSERT INTO ai_cache (user_id, key, model, result, expires_at)
            VALUES (%s, %s, %s, %s, NOW() + INTERVAL '30 days')
            ON CONFLICT (user_id, key, model) DO UPDATE
            SET result = EXCLUDED.result, expires_at = EXCLUDED.expires_at
        """, (
            user_id,
            cache_key,
            result.model_used,
            json.dumps({
                "category": result.category,
                "sub_category": result.sub_category,
                "confidence": result.confidence,
                "tax_relevant": result.tax_relevant,
                "explanation": result.explanation,
                "model_used": result.model_used
            })
        ))
        db_conn.commit()
    except Exception as e:
        logger.warning(f"Failed to save to cache: {e}")
```

## Integration with Processor Lambda

### Changes to `backend/handlers/processor.py`

```python
# Add these imports
from services.llm_provider import (
    get_provider_for_tier,
    SubscriptionTier,
    get_cache_key,
    check_cache,
    save_to_cache,
    CategorizationResult
)
import psycopg2

def get_user_tier(user_id: str) -> SubscriptionTier:
    """Fetch user's subscription tier from database."""
    secrets = get_secrets()
    db_url = secrets.get("DATABASE_URL")

    if not db_url or not user_id:
        return SubscriptionTier.FREE

    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT tier FROM subscriptions
            WHERE user_id = %s AND status = 'active'
        """, (user_id,))

        row = cursor.fetchone()
        conn.close()

        if row:
            return SubscriptionTier(row[0])
    except Exception as e:
        logger.warning(f"Failed to get user tier: {e}")

    return SubscriptionTier.FREE


def categorize_transactions(
    records: List[Dict],
    user_id: str,
    tier: SubscriptionTier
) -> Tuple[List[Dict], Dict]:
    """
    Add AI categorization to transaction records.

    Returns:
        (enriched_records, ai_summary)
    """
    provider = get_provider_for_tier(tier)
    model_name = provider.get_model_name()

    secrets = get_secrets()
    db_url = secrets.get("DATABASE_URL")
    conn = psycopg2.connect(db_url) if db_url else None

    stats = {
        "total": len(records),
        "categorized": 0,
        "cache_hits": 0,
        "api_calls": 0,
        "model": model_name,
        "tier": tier.value
    }

    enriched = []

    for record in records:
        cache_key = get_cache_key(record)

        # Check cache first
        cached = None
        if conn and model_name != "none":
            cached = check_cache(user_id, cache_key, model_name, conn)

        if cached:
            result = cached
            stats["cache_hits"] += 1
        else:
            result = provider.categorize(record)
            stats["api_calls"] += 1

            # Save to cache
            if conn and model_name != "none":
                save_to_cache(user_id, cache_key, result, conn)

        if result.category != "Unknown":
            stats["categorized"] += 1

        # Enrich record
        enriched_record = {
            **record,
            "ai_category": result.category,
            "ai_sub_category": result.sub_category,
            "ai_tax_relevant": result.tax_relevant,
            "ai_confidence": result.confidence,
            "ai_explanation": result.explanation
        }
        enriched.append(enriched_record)

    if conn:
        conn.close()

    return enriched, stats


# Update process_message() to include AI categorization:

def process_message(message: Dict) -> Dict[str, Any]:
    """Process a single SQS message with AI categorization."""
    job_id = message.get("job_id")
    user_id = message.get("user_id", "anonymous")
    # ... existing code ...

    # After CSV processing, add AI categorization
    if result["success"]:
        # Get user tier
        tier = get_user_tier(user_id)
        logger.info(f"User {user_id} tier: {tier.value}")

        # Categorize transactions
        records = result.get("records", [])
        if records and tier != SubscriptionTier.FREE:  # Skip for free tier
            enriched_records, ai_stats = categorize_transactions(
                records, user_id, tier
            )
            result["records"] = enriched_records
            result["ai_stats"] = ai_stats
            logger.info(f"AI categorization: {ai_stats}")

        # Continue with upload...
```

## Database Updates

No schema changes needed - using existing `ai_cache` table:

```sql
-- Already exists in schema.sql
CREATE TABLE IF NOT EXISTS ai_cache (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key              text NOT NULL,      -- normalized transaction fingerprint
  model            text NOT NULL,      -- e.g., 'claude-3-5-haiku-20241022'
  result           jsonb NOT NULL,     -- {category, confidence, ...}
  expires_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key, model)
);
```

## Lambda Dependencies

Add to `backend/requirements.txt`:

```
anthropic>=0.40.0
google-generativeai>=0.8.0
openai>=1.50.0
psycopg2-binary>=2.9.9
```

## Terraform Updates

Secrets Manager already includes API keys. No changes needed.

## Cost Analysis

### Per 1,000 Transactions (estimated)

| Tier | Model | Input Tokens | Cost | Notes |
|------|-------|--------------|------|-------|
| Free | Gemini Flash | ~200K | $0.00* | Google free tier |
| Pro | Haiku 3.5 | ~200K | $0.16 | $0.80/1M tokens |
| Premium | Opus 4 | ~200K | $3.00 | $15/1M tokens |

*Google Gemini free tier: 15 RPM, 1M tokens/day, 1500 RPD

### Caching Impact

With 70% cache hit rate (common transaction patterns):
- Free: $0.00 (Google free tier)
- Pro: $0.16 → ~$0.05 per 1,000 tx
- Premium: $3.00 → ~$0.90 per 1,000 tx

## Testing Plan

1. **Unit Tests**
   - `test_llm_provider.py` - Test each provider class
   - `test_caching.py` - Test cache hit/miss logic
   - `test_tier_selection.py` - Verify correct model per tier

2. **Integration Tests**
   - Process same file with different tiers
   - Verify cache persistence
   - Test API failure fallbacks

3. **Manual Testing**
   - Upload file as free user → no AI columns
   - Upload file as pro user → Haiku categorization
   - Upload file as premium user → Opus categorization
   - Re-upload same file → verify cache hits

## Rollout Plan

### Phase 1: Infrastructure
- [ ] Add `llm_provider.py` to backend/services
- [ ] Update `requirements.txt`
- [ ] Deploy updated Lambda package

### Phase 2: Integration
- [ ] Update `processor.py` with AI categorization
- [ ] Add AI stats to job result
- [ ] Test with each tier

### Phase 3: Frontend
- [ ] Display AI insights in dashboard
- [ ] Show "Upgrade for AI" message for free users
- [ ] Add AI confidence indicators

## Confirmed Model Selection

| Tier | Model | Decision |
|------|-------|----------|
| **Free** | Gemini 1.5 Flash | ✅ Confirmed - Google free tier |
| **Pro** | Claude Haiku 3.5 | ✅ Confirmed |
| **Premium** | Claude Opus 4 | ✅ Confirmed |

### Cache Duration
**30 days** - Good balance of freshness and cost savings

## Summary

This plan provides:
1. **Cost isolation** - Free users don't cost us anything
2. **Clear tier differentiation** - Each tier has distinct AI quality
3. **Efficient caching** - Reduces API costs by ~70%
4. **Swappable providers** - Easy to change models later
5. **Graceful fallbacks** - If API fails, rule-based categorization kicks in
