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

4. **`generate_quick_stats` doesn't read the parser's record shape.** ✅ **Resolved 2026-05-10** (commits `ae0d3af`, `0c21323`). Original bug: surfaced by the 5K cap test (job `f0668cdd-d34e-4654-889e-bec1788ca0b6`) — `quick_stats.transaction_types` was `{"unknown": 10000}` and `date_range` was `{start: null, end: null}` because [`backend/services/ai_insights.py:450`](../backend/services/ai_insights.py#L450) reads `record.get("type", record.get("transaction_type", "unknown"))` but the parser emits Koinly-format records keyed by `Description`, `Date`, `Sent Currency`, etc. Same shape mismatch hit `date_range`.

   **Fix shipped:** new adapter [`backend/services/quick_stats_normalizer.py`](../backend/services/quick_stats_normalizer.py) — chose Option B (an adapter between parser and stats function) over patching `generate_quick_stats` itself, because parser-aware logic in a stats function would silently degrade as parsers evolve. `generate_quick_stats` is unchanged; its `{type, date, asset}` contract holds. The processor calls `normalize_records(records)` to get the right shape, plus `count_fees(records)` separately merged into `quick_stats.transaction_types['fee']` (synthetic fee rows in the records list inflated `total_transactions`, fixed by counting fees out-of-band — see `0c21323`).

   **Verified end-to-end** via fresh 5K cap upload from `freebie+`, job `171224db-f4c1-4e32-9d5c-5161fbd42163`:
   - `total_transactions: 10000` (not 20000 like the first iteration)
   - `transaction_types: { buy: 2481, sell: 2479, transfer: 5040, fee: 10000 }` — sums to 10000 across buy/sell/transfer; fee count equals records with non-zero `Fee Amount`
   - `date_range: { start: "2024-01-01 00:00:00", end: "2025-02-20 15:00:00" }` — non-null ISO timestamps
   - Dashboard chips render correct numbers, including when AI is capped/failed (the original cosmetic gripe)

   Token mapping handles convert→buy (tax-correct), earn/stake/airdrop/etc.→transfer, with warn-level CloudWatch logs on fallback for parser-drift visibility. 24 unit tests cover token cases, fee counting, mixed None/ISO date ranges, and the sum-to-N invariant.

5. **Business users can't create additional API keys from dashboard — UI silently creates free keys.** Surfaced 2026-05-18 during playground smoke setup on a Business-plan account. **Severity:** high but not launch-blocking.

   **Repro:** Business-plan user with one Business key deletes it (leaving one Free key), clicks "Create" on the dashboard, gets `409 Only one active free API key per user`.

   **Root cause is design, not code bug.** The dashboard's "Create" button has no tier selector and always sends `{ name }` only ([components/dashboard/ApiKeyManager.tsx:132](../components/dashboard/ApiKeyManager.tsx#L132)). The POST handler calls `createApiKey(userId, name)` with no tier ([app/api/developer/keys/route.ts:61](../app/api/developer/keys/route.ts#L61)), which defaults to `'free'` ([lib/api-keys.ts:65](../lib/api-keys.ts#L65)). The 1-free-key cap then fires correctly — it's enforced both in code ([lib/api-keys.ts:80-92](../lib/api-keys.ts#L80)) and by a partial unique index from migration 013. Business-tier keys are intentionally provisioned through the Stripe checkout flow (`autoSubscribe()` at [components/dashboard/ApiKeyManager.tsx:113](../components/dashboard/ApiKeyManager.tsx#L113)), not this button. The product UX never communicates that.

   **Why not launch-blocking:** day-1 Reddit traffic is overwhelmingly new free signups, not existing Business subscribers wanting a second key. The affected population on launch day is near-zero.

   **Why still high-severity:** when a real Business customer eventually hits this, the product looks broken — they're paying and the dashboard refuses to give them a key. This is a customer-trust bug, not just a UX rough edge.

   **Fix (post-launch, pick one):**
   - **A — minimal:** Change the error string when a Business+ user hits the cap to point at the Stripe flow: "Business users: create additional keys via Subscription → Manage." Cheapest acceptable mitigation; ship first.
   - **B — proper:** Add a tier selector to the create dialog, default to user's current plan tier, route Business creates through the existing Stripe provisioning path.
   - **C — server-side default:** Change `createApiKey`'s default to infer from the user's subscription tier rather than hardcoding `'free'`. Most "correct" but touches semantics other callers may depend on; would need an audit of all `createApiKey` call sites first.

   **Owner:** post-launch. Ship A immediately after launch, plan B for the next dashboard pass.

6. **Playground intermittently returns `200 + {"error":"Upstream returned non-JSON response."}`.** Surfaced 2026-05-18 during the same playground smoke session that uncovered item 5. **Severity:** medium. Failure cleared on retry within minutes; not launch-blocking, but launch-week priority to instrument so the next failure is diagnosable instead of opaque.

   **Symptom:** [/playground](https://taxformatter.com/playground) loads the bundled Coinbase sample, clicks Send, gets HTTP 200 with body `{"error":"Upstream returned non-JSON response."}`. Two latency profiles observed in the same session: ~570 ms (warm) and 8.04 s / 10.24 s (cold-start). Re-firing the same request a minute or two later succeeded with `"status":"success"`, 18 transactions parsed, 2 rows cleanly skipped — proves the parser and end-to-end path work, the failure is intermittent.

   **What we ruled out tonight** (each verified, not just guessed):
   - **Lambda handler exception** — CloudWatch logs at `/aws/lambda/taxformatter-prod-api` show the cold-start invocation (RequestId `e642fbbc`) completed cleanly: `END` line present, no traceback, no `internal_error`, Duration 5488 ms. Subsequent warm invocations (`27761b02`, `b9f4e445`) completed in ~56 ms with the same "Detected exchange: Coinbase" trace and no errors. Whatever produced the non-JSON did not surface as a Python exception inside the handler.
   - **Demo API key** — rotated `DEMO_API_KEY` Vercel env var via fresh-key creation + redeploy; failure reproduced with the new key.
   - **Upstream production API** — curl against `https://api.taxformatter.com/v1/parse` with the rotated key:
     - error path (bogus CSV → `unsupported_exchange`): clean `application/json` 422, content-length 302
     - success path ([backend/tests/fixtures/valid/coinbase_2025_valid.csv](../backend/tests/fixtures/valid/coinbase_2025_valid.csv)): clean `application/json` 200, content-length 1324, 4 parsed transactions

     Upstream is healthy on both branches.
   - **BFF wrapping logic** — [app/api/playground/parse/route.ts:107-118](../app/api/playground/parse/route.ts#L107) passes upstream body and status through verbatim; no wrapping or transformation. The `"Upstream returned non-JSON response."` string lives only in the client-side fallback at [app/playground/page.tsx:40](../app/playground/page.tsx#L40), which fires when the browser's `res.json()` throws.
   - **CDN/WAF synthetic 200** — the curl response headers showed the expected `apigw-requestid`, `x-tf-processing-time`, and `x-api-version` — proof there's no CloudFront or WAF rewriting responses for this path.

   **Still unproven** (what the failure could still be — each requires the next live repro + BFF logging to confirm/refute):
   - API Gateway response transformation under specific conditions (response template, integration response mapping mismatch on cold-Lambda response shape).
   - Lambda response payload serialization edge case (e.g., a value the runtime can't serialize even though `json.dumps(..., default=str)` succeeded inside the handler).
   - Vercel-side fetch quirk under cold-start timing (e.g., `upstream.text()` returning a partial body before connection close).
   - Edge / CloudFront intercept on a non-deterministic condition.

   **Tactical fix — first thing 2026-05-19, ~20 minutes including deploy:** instrument the BFF catch branch at [app/api/playground/parse/route.ts:111-118](../app/api/playground/parse/route.ts#L111) to log on `JSON.parse` failure:

   ```typescript
   } catch (parseErr) {
     console.error('[playground] upstream returned non-JSON', {
       status: upstream.status,
       contentType: upstream.headers.get('Content-Type'),
       contentLength: upstream.headers.get('Content-Length'),
       apigwRequestId: upstream.headers.get('apigw-requestid'),
       bodyPreview: text.slice(0, 500),
     });
     return new NextResponse(text, { ... });
   }
   ```

   Zero behavior change for users. Next failure shows up in Vercel logs with full upstream context — `apigw-requestid` joins back to API Gateway / CloudWatch for end-to-end trace. Without this, every future failure is as opaque as tonight's.

   **Reproduction plan after logging ships:** hammer the playground 20× back-to-back with the bundled Coinbase sample. Force at least one cold-start (any backend redeploy or 15+ min idle). Goal: capture one failure with the new logging, then diagnose from the captured `bodyPreview` (HTML → APIGW/CloudFront error page; plaintext "Endpoint request timed out" → APIGW timeout; truncated JSON → 6 MB cap or transform mangling; anything else → adjust).

   **Verification gate:** 20 consecutive successful playground calls including at least one forced cold-start.

   **Related observation (not blocking this fix, but launch-adjacent):** all 13 CloudWatch alarms are in **Insufficient data**, last state-transition 2026-05-10/14 — production monitoring is dark. The "no 5xx alarm firing" signal that initially looked reassuring is meaningless because the alarms aren't evaluating data. Worth one targeted alarm on `/v1/parse` non-2xx rate (or non-JSON 200 from APIGW access logs) so the next regression doesn't depend on someone manually hitting the playground to notice.

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
