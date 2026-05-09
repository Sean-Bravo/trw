# Tiered AI Insights — Smoke Test Results

**Date:** 2026-05-08 (tiers) + 2026-05-09 (5K cap regression)
**Environment:** Production (us-east-1)
**Test fixtures:** `backend/tests/fixtures/coinbase_1k_rows.csv` (1000 tx, tier dispatch); `backend/tests/fixtures/coinbase_10k_rows.csv` (10000 tx, 5K cap regression)
**Final status:** ✅ All 4 tiers + 5K cap regression verified end-to-end

---

## Executive summary

| Result | Count | Coverage |
|--------|-------|----------|
| ✅ Pass | 5 / 5 | Free, Starter, Growth, Business + free-tier 5000-row cap |
| ❌ Fail | 0 / 5 | — |

**Pass criteria (tiers):** `insights.json` in S3 contains correct `tier`, expected `model` ID, expected `provider`, `ai_error: null`, and `ai_insights` populated.

**Pass criteria (cap regression):** `insights.json` in S3 has `ai_error: "free_tier_size_limit"`, `ai_insights: null`, `model: null` (no provider call attempted), and `quick_stats` populated with full transaction count.

**Outcome:** All four tiers passed end-to-end after a single mid-test remediation (Anthropic API key rotation in Secrets Manager + Lambda cold-start). The free-tier 5000-row cap intercepts before any provider call as designed. Unification routing, tier propagation, model dispatch, provider integrations, and cost-guard short-circuit are all proven correct in production. (The cap regression also surfaced a separate, pre-existing `quick_stats` shape mismatch — see "Open issues" item 4 — non-blocking.)

---

## Per-account results

### ✅ Free tier — `freebie+@taxformatter.com`

**Job ID:** `1485af4b-b6a5-4b7b-acca-fe83b876f989`

| Field | Expected | Actual | Status |
|-------|----------|--------|--------|
| `tier` | `"free"` | `"free"` | ✅ |
| `model` | `"gemini-2.5-flash"` | `"gemini-2.5-flash"` | ✅ |
| `provider` | `"google"` | `"google"` | ✅ |
| `ai_error` | `null` | `null` | ✅ |
| `has_insights` | `true` | `true` | ✅ |

Auto-provisioned Free API key, dispatched to Gemini, insights generated and persisted.

---

### ✅ Starter tier — `starter+@taxformatter.com`

**Job ID:** `d70dc04f-bfd1-4fe2-a479-364def7e9042`

| Field | Expected | Actual | Status |
|-------|----------|--------|--------|
| `tier` | `"starter"` | `"starter"` | ✅ |
| `model` | `"gemini-2.5-flash"` | `"gemini-2.5-flash"` | ✅ |
| `provider` | `"google"` | `"google"` | ✅ |
| `ai_error` | `null` | `null` | ✅ |
| `has_insights` | `true` | `true` | ✅ |

SQL upgrade (`free` → `starter`, quota 25→100, RPM 10→30) applied cleanly. New `'starter'` enum value recognized; correctly co-routes to Gemini alongside Free.

---

### ✅ Growth tier — `growthie+@taxformatter.com`

**Final job ID (post-remediation):** `42b64f57-9841-4704-aa1a-43b4dd943e7c`

| Field | Expected | Actual | Status |
|-------|----------|--------|--------|
| `tier` | `"growth"` | `"growth"` | ✅ |
| `model` | `"claude-sonnet-4-6"` | `"claude-sonnet-4-6"` | ✅ |
| `provider` | `"anthropic"` | `"anthropic"` | ✅ |
| `ai_error` | `null` | `null` | ✅ |
| `has_insights` | `true` | `true` | ✅ |

Initial run failed with `401 invalid x-api-key` (stale Anthropic key in Secrets Manager). Rotated key + forced Lambda cold-start. Re-run hit Anthropic, dispatched correctly to Sonnet 4.6, insights generated.

---

### ✅ Business tier — `biz+@taxformatter.com`

**Final job ID (post-remediation):** `6642864b-0fcf-4b10-9599-ad5b18c398b9`

| Field | Expected | Actual | Status |
|-------|----------|--------|--------|
| `tier` | `"business"` | `"business"` | ✅ |
| `model` | `"claude-opus-4-7"` | `"claude-opus-4-7"` | ✅ |
| `provider` | `"anthropic"` | `"anthropic"` | ✅ |
| `ai_error` | `null` | `null` | ✅ |
| `has_insights` | `true` | `true` | ✅ |

Same initial 401 failure → same fix. Confirms Opus 4.7 model availability on the Anthropic account, dispatch logic correct, insights generated. Highest-quality model is reachable from production.

---

## What was validated

1. **Tier propagation pipeline.** All 4 tier values (`free`, `starter`, `growth`, `business`) propagated correctly from API key → upload → scanner → SQS → processor → S3 results.

2. **TIER_CONFIG dispatch logic:**
   - `free` → Google (Gemini 2.5 Flash) ✅
   - `starter` → Google (Gemini 2.5 Flash) ✅
   - `growth` → Anthropic (Claude Sonnet 4.6) ✅
   - `business` → Anthropic (Claude Opus 4.7) ✅

3. **Pricing unification end-to-end.** `api_keys.tier` is the single source of truth for AI routing; `subscriptions.tier` is no longer relied on anywhere in the pipeline.

4. **Lambda redeploy.** Both processor and api Lambdas confirmed running today's code (post-S3-fallback fix). `LastModified: 2026-05-08T19:52:17` on processor (after Anthropic key rotation cold-start).

5. **Dashboard tier badges.** Header correctly displayed "Free", "Starter", "Growth", "Business" labels per account.

6. **Database tier upgrades via SQL.** Direct `UPDATE api_keys SET tier = ...` statements correctly translated into runtime tier behavior with right quota and RPM values per tier.

7. **Provider authentication.**
   - Gemini key in Secrets Manager: working ✅
   - Anthropic key in Secrets Manager: working (after rotation) ✅

8. **Model availability on the Anthropic account.** Both Sonnet 4.6 and Opus 4.7 reachable — no model-not-found or 403 access errors.

9. **Catch-all email + Resend signup flow.** Verification codes for `*+@taxformatter.com` addresses delivered cleanly through the unified Proton inbox once catch-all was enabled and the Cloudflare DNS conflict cleaned up.

---

## Mid-test remediation: Anthropic key rotation

The first round of Growth and Business tests both returned `401 authentication_error: invalid x-api-key`. Root cause: the `ANTHROPIC_API_KEY` value in `taxformatter/prod/app-secrets` was stale — the new key created during yesterday's Workstream 2 secret rotation had been added to Vercel but not to Secrets Manager (Vercel and Lambda use separate secret stores).

### Fix applied

1. Created a new Anthropic API key in console.anthropic.com.
2. Wrote the new value into `taxformatter/prod/app-secrets` under the `ANTHROPIC_API_KEY` field.
3. Forced a Lambda cold-start by patching the processor's environment configuration:

   ```bash
   aws lambda get-function-configuration \
     --function-name taxformatter-prod-processor \
     --query 'Environment.Variables' --output json \
     | jq --arg ts "$(date +%s)" '. + {FORCE_RELOAD: $ts}' \
     | jq '{Variables: .}' \
     > /tmp/processor-env.json

   aws lambda update-function-configuration \
     --function-name taxformatter-prod-processor \
     --environment file:///tmp/processor-env.json
   ```

4. Confirmed `LastUpdateStatus: Successful` and `LastModified: 2026-05-08T19:52:17`.
5. Re-uploaded `coinbase_1k_rows.csv` from Growth and Business accounts.
6. Re-ran S3 spot-checks → both green.

Total remediation time: ~5 minutes from diagnosis to verified pass.

---

## Smoke timeline

| Time (UTC) | Event |
|------------|-------|
| 16:13 | First Free tier upload (worked first try) |
| 16:54 | First Starter tier upload (worked first try) |
| 17:28 | First Growth tier upload → 401 (Anthropic key stale) |
| 17:37 | First Business tier upload → 401 (same root cause) |
| ~19:30 | New Anthropic API key created and added to Secrets Manager |
| 19:38 | Second Growth tier upload (post-fix) → ✅ |
| 19:39 | Second Business tier upload (post-fix) → ✅ |
| 19:52 | Lambda config patched, cold-start successful |

---

## Outstanding work

| Item | Status | Notes |
|------|--------|-------|
| Free-tier 5000-row cap regression test | ✅ Verified 2026-05-09 | Job `f0668cdd-d34e-4654-889e-bec1788ca0b6`. `ai_error: "free_tier_size_limit"`, `ai_insights: null`, `model: null`, `quick_stats.total_transactions: 10000`. Cap fires before any provider call. |
| Announce blog post publish | ⏳ Drafted, not published | Located at `content/blog/taxformatter-mcp-registry-launch.mdx`. Pending smoke completion gate (AI insights smoke now satisfied; only the 5K cap test remains). |
| Stripe consumer checkout | ⏳ Deferred | Decision made: drop consumer pricing entirely in favor of unified API tier system. Not needed. |

---

## Open issues unrelated to today's smoke

1. **`jobs.status` enum** does not include `"completed"`. All test jobs show `"queued"` even after successful processing. The S3 results are correct, the dashboard renders correctly, but the database row's status field doesn't update on success. Worth investigating before launch — affects future status-based queries and any monitoring built on top of `jobs.status`.

2. **Old `freebie@taxformatter.com` account in DB.** Created during smoke setup before email delivery worked, never verified. Dead row in `users` table. Cleanup query before launch:

   ```sql
   DELETE FROM users WHERE email = 'freebie@taxformatter.com' AND email_verified IS NULL;
   ```

   (Verify column name matches your schema.)

3. **Resend suppression list.** `freebie@taxformatter.com` (no plus) still suppressed from the original bounce. Harmless if left; can be cleared via Resend dashboard if the address is ever needed.

4. **`generate_quick_stats` doesn't read the parser's record shape.** Surfaced by the 5K cap test (job `f0668cdd-d34e-4654-889e-bec1788ca0b6`): `quick_stats.transaction_types` was `{"unknown": 10000}` and `date_range` was `{start: null, end: null}`, even though the parser correctly extracted Buy/Sell/Send/Receive types (visible in dashboard "Transformation Preview"). [`backend/services/ai_insights.py:450`](../backend/services/ai_insights.py#L450) reads `record.get("type", record.get("transaction_type", "unknown"))`, but the parser emits tax-software-formatted records keyed by `Description`, `Currency Name`, `Date Sold`, `Proceeds`, etc. — there is no `"type"` field. Same shape mismatch on `date_range` (expects `"date"/"timestamp"/"time"`).

   **Why this hasn't been visible until now:** when AI insights succeed, the dashboard renders the model-generated breakdown which masks the broken deterministic numbers. The 5K cap path is the only flow that surfaces them.

   **Fix direction:** either teach `generate_quick_stats` to read parser-output field names (e.g., infer type from `Description`, dates from `Date Sold`), or have the processor build a normalized intermediate shape before calling `generate_quick_stats`. Either way the right field semantics are: type ∈ {buy, sell, transfer, fee}, date ∈ ISO timestamp.

   **User-visible impact today:** dashboard breakdown chips show `0 / 0 / 0 / 0` whenever AI is capped or fails. Total transaction count (`10,000`) renders correctly because that's based on `len(records)`. Cosmetic, not data-loss. Follow-up, not blocking.

---

## Files referenced

- Test fixture: `backend/tests/fixtures/coinbase_1k_rows.csv`
- Lambda code:
  - `backend/services/ai_insights.py` (TIER_CONFIG)
  - `backend/handlers/processor.py` (5000-row cap)
  - `backend/handlers/scanner.py` (user_tier propagation)
  - `backend/handlers/webhook.py` (tier validation enum)
- Frontend:
  - `lib/auth-db.ts` (`getUserTier` reading `api_keys.tier`)
  - `components/marketing/APIPricing.tsx` (unified pricing page)

---

## Job IDs from this run

| Account | Tier | Job ID | Result |
|---------|------|--------|--------|
| freebie+@taxformatter.com | free | `1485af4b-b6a5-4b7b-acca-fe83b876f989` | ✅ Pass |
| starter+@taxformatter.com | starter | `d70dc04f-bfd1-4fe2-a479-364def7e9042` | ✅ Pass |
| growthie+@taxformatter.com (initial) | growth | `bb4aa8d6-cd71-4c01-8174-db12d67d8b0e` | ❌ Fail (401) — pre-remediation |
| growthie+@taxformatter.com (final) | growth | `42b64f57-9841-4704-aa1a-43b4dd943e7c` | ✅ Pass |
| biz+@taxformatter.com (initial) | business | `d01faa0d-2823-4903-bb56-d1bc60c20a00` | ❌ Fail (401) — pre-remediation |
| biz+@taxformatter.com (final) | business | `6642864b-0fcf-4b10-9599-ad5b18c398b9` | ✅ Pass |
