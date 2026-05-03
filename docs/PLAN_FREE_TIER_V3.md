# Free Tier Implementation Plan (v3)

**Created:** 2026-05-01
**Supersedes:** v2 (same date), v1 (same date)
**Scope:** Backend (API tier definition, signup auto-provisioning, Stripe handling, quota/rate-limit policy) + pricing page UI (four-column layout, no-credit-card CTA) + minimal observability for free→paid conversion tracking + dashboard surfacing for D6 deactivation events.
**Out of scope:** Tier-aware persistent rate limiting (Redis/DynamoDB), upgrade-nudge emails, marketing launch announcement, full dashboard analytics for tier funnel, free-tier abuse detection.

---

## TL;DR

- Free tier is **half-built**: DB enum already includes `'free'`, schema defaults are `'free'`/quota=10/rpm=10, but TypeScript types, `API_TIERS` config, signup flow, Stripe handling, and pricing UI all assume only Starter/Growth/Business.
- Free tier spec: $0/month, 25 files/month, 10 req/min, all 14 exchanges, auto-detection, JSON response, **no bank PDF parsing**, no credit card required, indefinite (not a trial), 1 active free key per user.
- Critical pre-existing issue: **monthly quotas are tracked but not enforced** — `check_monthly_quota` in `backend/services/api_auth.py:122` returns `is_overage` as a header flag and explicitly comments "Never hard-block." Shipping Free without a hard cap = unlimited usage at $0. **Policy: hard-block on `free` tier specifically**; leave paid tier soft-flag behavior unchanged.
- Estimated effort: ~2 work sessions for code + tests, plus a confirmation pass (Phase 0) and one DB migration.
- Three things from v2 still doing real work in v3:
  1. **D6 collision handling** — webhook deactivates pre-existing free keys before downgrading the canceled paid key, preventing the partial unique index from crashing on the first such cancel.
  2. **Phase 5 combined launch** — default-tier flip ships in the same PR as the pricing UI, eliminating the rollout window where dashboard manual key creation would silently default to free.
  3. **Phase 0 confirmation pass** — greps for hidden `'starter'` defaults and unexpected `check_monthly_quota` callers before any code change.
- New in v3 (two small but real fixes):
  4. **`upgrade_url` from env var, not hardcoded** — uses the same `APP_URL` convention as `subscribe/route.ts` so dev/staging error responses point at dev/staging pricing pages.
  5. **D6 deactivation surfacing in the launch PR** — schema columns `deactivated_reason` + `deactivated_at` added in Phase 1 migration, set by webhook in Phase 3, rendered on the dashboard key card in Phase 5. Closes a small but real support-ticket vector when a paid-then-canceled user wonders why their formerly-named free key is silently inactive.

---

## 1. Audit Findings (what's actually in the code)

| Area | File | Current state |
|---|---|---|
| DB enum | `db/migrations/006_add_api_keys.sql:8` | `api_tier ENUM('free', 'starter', 'growth', 'business')` — **`free` already valid** |
| DB schema default | `db/migrations/006_add_api_keys.sql:19-22` | `tier DEFAULT 'free'`, `rate_limit_rpm DEFAULT 10`, `monthly_quota DEFAULT 10` |
| TypeScript tier type | `lib/api-keys.ts:6` | `type ApiTier = 'starter' \| 'growth' \| 'business'` — **excludes `free`** |
| TypeScript tier config | `lib/api-keys.ts:34-38` | `API_TIERS = { starter, growth, business }` — **no `free` entry** |
| Stripe pricing config | `lib/stripe.ts:29-33` | `API_PRICING = { STARTER, GROWTH, BUSINESS }` |
| Stripe price IDs | `lib/stripe.ts:23-27` | `STRIPE_API_PRICES = { STARTER, GROWTH, BUSINESS }` from env vars |
| `createApiKey` default | `lib/api-keys.ts:73` | Hardcoded `const tier: ApiTier = 'starter'` — **all new keys default to paid tier** |
| Stripe checkout | `app/api/developer/subscribe/route.ts:23` | Validates tier ∈ `STRIPE_API_PRICES` keys; `free` would 400 — good (don't break) |
| App URL convention | `app/api/developer/subscribe/route.ts:56` | Uses `process.env.NEXT_PUBLIC_APP_URL` (or equivalent) for Stripe success/cancel URLs — **adopt same convention for `upgrade_url` in 429 responses** |
| Webhook: subscription canceled | `app/api/webhooks/stripe/route.ts:183-202` | Downgrades to **`'starter'`** with starter quotas — bug for free tier: should downgrade to `'free'` |
| Backend rate limit | `backend/services/api_auth.py:100-119` | In-memory per-Lambda; tier-aware via `key_record["rate_limit_rpm"]` — already tier-aware, evaporates on cold start (acceptable for MVP per existing comment) |
| Backend quota | `backend/services/api_auth.py:122-143` | **Soft-flag only**: returns `(allowed=True, usage, is_overage)`; comment says "Never hard-block" |
| API request flow | `backend/handlers/api.py:559, 241` | Calls `check_rate_limit` (enforced) and `check_monthly_quota` (soft-flag in `X-Api-Overage` header) |
| Pricing UI | `components/marketing/APIPricing.tsx:15-71` | Three hardcoded tier objects, three-column grid (`md:grid-cols-3`), purple highlight on Growth |
| Pricing CTA | `components/marketing/APIPricing.tsx:76-86` | Stores `tier` in `sessionStorage` then `router.push('/signup')` — already wired generically |
| Signup register | `app/signup/page.tsx` + `/api/auth/register` | Creates user; **does NOT auto-create an API key** — user must visit dashboard and manually create one |
| Default tier on key creation | `app/api/developer/keys/route.ts:58` | Calls `createApiKey(userId, name)` — no tier arg, falls through to hardcoded `'starter'` |

### Surprising things to know before changing code

1. **README/`docs/TIER_BASED_IMPLEMENTATION_SUMMARY.md` describe a Free tier with Gemini AI categorization that does not exist in code.** Aspirational doc from a different product direction. Don't rely on it.
2. **Each user can create up to 5 API keys** (`MAX_KEYS_PER_USER` in `lib/api-keys.ts:40`). Free needs a separate, lower cap.
3. **Quota enforcement and rate limiting are tier-aware in the Python backend, but rate limit is in-memory.** Documented MVP-acceptable.
4. **Pricing tier intent is passed via `sessionStorage`** (per security note `L-1`). Signup page reads it post-verification; `pending_api_tier` cookie persists tier through email verification callback.

---

## 2. Open Decisions

Recommended answers in **bold**.

**D1. Quota enforcement on Free: hard block or soft flag?**
- **Hard block on `free` only** — at 25 files used, 26th request returns 429 `quota_exceeded`. Paid tiers retain current soft-flag behavior. One conditional in `check_monthly_quota`.

**D2. Free-tier API key cap per user: 1 or default 5?**
- **1 active free-tier key per user.** Paid tier unlocks default 5 (`MAX_KEYS_PER_USER`). Enforced via partial unique index at the DB level; app-level check provides the user-facing error message.
- *Note for D3 interaction:* "active" means `is_active = true`. Deactivated free keys don't count toward the cap, so a user who deletes their auto-provisioned key can create a new one with a custom name. Surface in the dashboard error message ("Deactivate your existing free key to create a new one").

**D3. Auto-provision a free key at signup, or wait for explicit creation?**
- **Auto-provision after email verification.** Free tier specifically — paid tier flow unchanged (Stripe checkout still creates the key after subscription). The `MAX_FREE_KEYS_PER_USER = 1` cap is harmless because verification only happens once and the create call is idempotent (skip if any active key exists).

**D4. What happens when a paid subscription is canceled? Downgrade to Free or revoke?**
- **Downgrade to Free.** Keys keep working at Free limits.

**D5. Existing users without a paid subscription — backfill to Free or leave alone?**
- **Leave existing keys alone.** New users get Free; existing users keep whatever tier they have.

**D6. Downgrade collision: user has both a pre-existing free key and a paid key, then cancels the paid sub.**
- The webhook would otherwise downgrade the canceled key to `'free'`, creating two active free keys for the user — violating the partial unique index and crashing the webhook UPDATE. Stripe will retry with backoff, but the user's tier would never actually downgrade.
- **Recommended:** webhook deactivates any other active free key for the user *before* downgrading the canceled paid key. Rationale: paid history > free history; the user invested money in the canceled key, so it should "win."
- **v3 addition:** the deactivation must record a reason and timestamp so the dashboard can surface it. New columns `deactivated_reason TEXT NULL` and `deactivated_at TIMESTAMPTZ NULL` (Phase 1 migration). Webhook sets `deactivated_reason = 'downgraded_replaced_by:<paid_key_id>'` and `deactivated_at = NOW()` (Phase 3). Dashboard renders "Deactivated [date] when [paid key name] was downgraded to Free" on the key card (Phase 5).

**D7. Free tier response identity: does the JSON match paid tiers exactly?**
- **Yes, identical JSON shape.** No confidence-score gating, no provenance-metadata gating. Bank PDF parsing is the only feature gate (Growth+ only, enforced at endpoint level). Gating response richness creates integration-time surprises when users upgrade.

**D8. Where does `upgrade_url` in error responses come from?** *(new in v3)*
- **From `APP_URL` env var (Lambda) or `NEXT_PUBLIC_APP_URL` (Next.js)**, not hardcoded. Same convention `subscribe/route.ts:56` already uses for Stripe success/cancel URLs. Hardcoding `https://taxformatter.com/pricing` would be the only place in the API that bypasses the env-var convention, and it'd point staging error responses at production. Phase 0 confirms the exact env var name on the Lambda side (likely `APP_URL` or `PUBLIC_APP_URL` — the `NEXT_PUBLIC_*` prefix doesn't exist on Lambda).

---

## 3. Sequenced Implementation

Order matters. Each phase ends with a green test run (`pnpm test` for TypeScript, `pytest backend/tests/` for Python — confirm exact scripts in `package.json` before running).

### Phase 0: Confirmation pass *(executed 2026-05-03)*

Status: **complete**. Findings inline below.

1. **`check_monthly_quota` call sites** — ✅ single production caller at [backend/handlers/api.py:241](../backend/handlers/api.py#L241). Tests patch in 6 sites in `backend/tests/test_api_handler.py` and 3 sites in `backend/tests/test_api_auth.py`; the `.build/` matches are stale build artifacts. Phase 2 signature change is contained.
2. **Hardcoded `'starter'` literals** — ✅ all accounted for. Production: `lib/api-keys.ts:6,73`, `app/api/webhooks/stripe/route.ts:192,195`, `components/marketing/APIPricing.tsx:29`. The `app/api/developer/subscribe/route.ts:10,25` literals are the docstring + 400 error message naming Stripe-allowed paid tiers — intentionally exclude `'free'`, no change needed. Test fixtures at `backend/tests/test_api_handler.py:52,443` will update with the test changes.
3. **Bank-PDF endpoint and current gating** — ⚠️ **No tier gating today**. The single `/v1/parse` endpoint at [backend/handlers/api.py:128](../backend/handlers/api.py#L128) dispatches to `_parse_bank` purely on `.pdf` extension at line 201. The `app/api/bank/*` routes are the **web UI** flow (session auth, jobId-based) and are not part of API tier gating — leave them alone. Phase 2 must add the gate at the dispatcher.
4. **Tier logging on `/v1/parse`** — ⚠️ **Not logged today**. `record_request(...)` ([backend/services/api_auth.py:167](../backend/services/api_auth.py#L167)) takes 12 params; tier is not one of them. The `api_requests` table schema ([db/migrations/006_add_api_keys.sql:47](../db/migrations/006_add_api_keys.sql#L47), with [008](../db/migrations/008_add_request_id.sql) adding `request_id`) has no `tier` column. **Decision:** add a `logger.info` emit in `handle_v1_parse` (CloudWatch-greppable). Persistent column is deferred — it requires a schema migration and isn't on the critical path for the launch PR.
5. **Lambda `APP_URL` env var** — ⚠️ **Does not exist; must be added**. Next.js side already uses `NEXT_PUBLIC_APP_URL` consistently (`subscribe`, `customer-portal`, `middleware`, `lib/email.ts`, `.env.example`). The API Lambda env block at [backend/terraform/lambda.tf:479-485](../backend/terraform/lambda.tf#L479-L485) only sets `ENVIRONMENT`, `UPLOADS_BUCKET`, `RESULTS_BUCKET`, `SECRETS_ARN`. **Locked name: `APP_URL`** (avoiding the misleading `NEXT_PUBLIC_*` prefix on Lambda). Phase 2 adds the Terraform edit.

**Phase 0 deltas to the plan:**

- **Phase 2 expanded** with a Terraform edit to set `APP_URL` on the API Lambda. Without it, the `https://taxformatter.com` fallback always fires in production and the env-driven design is decorative.
- **Phase 0.5 (tier-logging substrate)** added below — a one-line `logger.info` emit in `handle_v1_parse` so free→paid conversion is measurable from CloudWatch from day one. No schema change.
- **No surprises elsewhere** — every other plan assumption holds.

### Phase 0.5: Tier-logging substrate (new in v3, post-Phase-0)

**Files to change:**

- `backend/handlers/api.py` — at the top of `handle_v1_parse` (after the route enters but before the body parse), add:

  ```python
  logger.info(
      "api_request",
      extra={
          "tier": key_record.get("tier"),
          "key_id": key_record["id"],
          "endpoint": "/v1/parse",
          "request_id": request_id,
      },
  )
  ```

  This becomes the substrate for free→paid conversion measurement. CloudWatch Logs Insights query: `filter @message = "api_request" | stats count() by tier`. No schema change; persistent `tier` column on `api_requests` is intentionally deferred to "out of scope".

### Phase 1: Backend tier definition (foundation)

**Files to change:**

1. `lib/api-keys.ts`
   - Line 6: extend `ApiTier` type → `'free' | 'starter' | 'growth' | 'business'`.
   - Line 34-38: add `free: { monthly_quota: 25, rate_limit_rpm: 10, price: 0 }` as the first entry of `API_TIERS`.
   - Line 58-88 (`createApiKey`): accept an optional `tier: ApiTier` parameter. **Keep the default at `'starter'` for now** — it flips to `'free'` in Phase 5, not here.
   - Add a `MAX_FREE_KEYS_PER_USER = 1` constant near `MAX_KEYS_PER_USER`. In `createApiKey`, when `tier === 'free'`, query for existing active free keys for this user and reject with a clear error if ≥ 1.

2. `lib/stripe.ts`
   - `API_PRICING`, `STRIPE_API_PRICES`, `validateStripeConfig`, and `StripeApiPlan` type all stay paid-only. Free tier is intentionally absent from Stripe.

3. `db/migrations/013_free_tier_constraints.sql` (new file) *(expanded in v3)*

   ```sql
   -- One active free key per user (D2)
   CREATE UNIQUE INDEX api_keys_one_active_free_per_user
     ON api_keys(user_id)
     WHERE tier = 'free' AND is_active = true;

   -- Deactivation provenance (D6)
   ALTER TABLE api_keys
     ADD COLUMN deactivated_reason TEXT NULL,
     ADD COLUMN deactivated_at TIMESTAMPTZ NULL;
   ```

   The unique index is the real guarantee against duplicate free keys (races, retries). The app-level check is for the error message only. The two new columns let the dashboard surface why a key was deactivated (D6).

**Tests (new):**
- `__tests__/lib/api-keys.test.ts`: explicit `tier='free'` creation succeeds with quota=25, rpm=10; `MAX_FREE_KEYS_PER_USER = 1` cap (second free key creation rejects); explicit `tier='starter'` argument still works; default (no tier arg) still produces `'starter'` (will flip in Phase 5).

### Phase 2: Quota enforcement policy change for Free

**Files to change:**

4. `backend/services/api_auth.py:122-143` — `check_monthly_quota`. Change signature to accept `tier: str` (or look it up from the existing DB row already fetched for auth). When `tier == 'free'` and `current_usage >= monthly_quota`, return `(allowed=False, current_usage, True)`. For all other tiers, keep current soft-flag behavior. Update the docstring.

5. `backend/handlers/api.py` — wherever `check_monthly_quota` is consumed (lines 240-244 currently set headers when `is_overage`), add a 429 short-circuit if the function returns `allowed=False`. **Lock the response shape now**:

   ```python
   import os

   app_url = os.environ.get('APP_URL', 'https://taxformatter.com')  # name confirmed in Phase 0
   upgrade_url = f"{app_url}/pricing"

   return error_response(
       status=429,
       body={
           "error": {
               "code": "quota_exceeded",
               "message": "Free tier monthly limit of 25 files reached. Resets on the 1st. Upgrade for higher limits.",
               "upgrade_url": upgrade_url,
           }
       },
       headers={
           "Retry-After": str(seconds_until_month_rollover),
           "X-Quota-Reset": iso_8601_next_month_first,
       },
   )
   ```

   The fallback to `https://taxformatter.com` exists only for the case where the Lambda is misconfigured (env var missing). Log a warning if the fallback fires; in normal operation `APP_URL` is always set.

   Customers will integrate against this response shape; changing it later is a breaking change.

**Terraform edit (new in v3 post-Phase-0):**

6a. `backend/terraform/lambda.tf` — API Lambda environment block at lines 479-485 — add `APP_URL = var.app_url` to `environment.variables`.

6b. `backend/terraform/variables.tf` — declare `variable "app_url" { type = string; description = "Public app URL used for upgrade_url in API error responses (e.g., https://taxformatter.com or http://localhost:3000)." }`. The actual value is supplied per-environment via `terraform.tfvars` or CI; in dev it should be `http://localhost:3000`, in prod it should match `NEXT_PUBLIC_APP_URL`. Without this Lambda var the fallback in `api.py` will always fire in production.

6. **Bank PDF gating** (depending on Phase 0 finding): if Phase 0 found that bank PDF is not yet gated by tier, add the gate now. Free tier returns 403 with the same `upgrade_url` env var convention:

   ```python
   return error_response(
       status=403,
       body={
           "error": {
               "code": "feature_not_available",
               "message": "Bank PDF parsing requires Growth tier or higher.",
               "upgrade_url": upgrade_url,
           }
       },
   )
   ```

**Tests (new):**
- `backend/tests/test_api_auth.py`: `check_monthly_quota` for free key at usage=25 returns `(False, 25, True)`; for starter key at usage=100 returns `(True, 100, True)` (regression — soft-flag still works).
- `backend/tests/test_api_handler.py`: full request flow — Free key at quota gets 429 with the locked response shape, including `Retry-After` and `X-Quota-Reset` headers; `upgrade_url` reflects the test environment's `APP_URL`, not a hardcoded production URL.
- `backend/tests/test_api_handler.py`: Free key calling bank-PDF endpoint gets 403 with `feature_not_available`; `upgrade_url` likewise from env.
- **Regression check explicit:** Starter key at 101/100 still returns 200 with `X-Api-Overage: true`. (M-1 idempotency and M-3 price verification tests must continue to pass.)

### Phase 3: Stripe webhook — downgrade-to-Free with collision handling and provenance

**Files to change:**

7. `app/api/webhooks/stripe/route.ts:183-202` (`customer.subscription.deleted` case). Three changes *(third is new in v3)*:

   First, before downgrading the canceled key, deactivate any pre-existing free key for the same user — and **record the reason** (D6, v3 expansion):

   ```ts
   const deactivateResult = await execute(
     `UPDATE api_keys
      SET is_active = false,
          deactivated_reason = $3,
          deactivated_at = NOW()
      WHERE user_id = $1
        AND tier = 'free'
        AND is_active = true
        AND id != $2`,
     [apiKey.user_id, apiKey.id, `downgraded_replaced_by:${apiKey.id}`]
   )

   if (deactivateResult.rowCount > 0) {
     logger.info('Deactivated pre-existing free key on paid downgrade', {
       user_id: apiKey.user_id,
       replaced_by_key_id: apiKey.id,
       deactivated_count: deactivateResult.rowCount,
     })
   }
   ```

   Then, downgrade the canceled key to free:

   ```ts
   const freeTier = API_TIERS['free']
   await execute(
     `UPDATE api_keys
      SET tier = 'free', monthly_quota = $1, rate_limit_rpm = $2, stripe_subscription_id = NULL
      WHERE id = $3`,
     [freeTier.monthly_quota, freeTier.rate_limit_rpm, apiKey.id]
   )
   ```

   Update the log line to `downgraded to free tier`.

8. **Defensive guard** at `app/api/webhooks/stripe/route.ts:111` (where `apiTier.toUpperCase() as StripeApiPlan` happens for checkout): if `apiTier === 'free'` ever appears in checkout metadata, log a warning and skip — `'free'` should never go through Stripe checkout.

**Tests (update):**
- `__tests__/api/webhooks/stripe.test.ts`: existing `customer.subscription.deleted` test asserts `tier='starter'` after cancel. Update to assert `tier='free'` with quota=25, rpm=10, and `stripe_subscription_id = NULL`.
- New test: user with both an active free key and an active paid key cancels paid sub → free key is deactivated **with `deactivated_reason` matching the pattern `downgraded_replaced_by:<id>` and `deactivated_at` set to a recent timestamp**, paid key downgrades to free, no UNIQUE constraint violation. **Non-negotiable; without it the partial unique index will crash production on the first such cancel.**
- New test: defensive guard — webhook with `apiTier='free'` in checkout metadata is logged and skipped, no DB write.

### Phase 4: Signup auto-provisions a free API key

**Files to change:**

9. `app/api/auth/verify/route.ts` — after `verifyEmailCode(validatedEmail, code)` returns `result.success === true` (around line 43-50), call `createApiKey(result.user.id, 'Default key', 'free')` inside a `try/catch`. Idempotency: if the user already has any active key, skip. Errors are logged but don't block the response. Place the call BEFORE the `NextResponse.json(...)` return.

10. `app/api/auth/register/route.ts`: do NOT create the key here (pre-verification). Wait for verify so we don't create keys for unverified emails.

**Tests (new):**
- `__tests__/api/auth/verify.test.ts`: post-verification, exactly one active free key exists for the user.
- Re-verification doesn't create a duplicate (partial unique index would prevent it anyway, but the app-level idempotency check should also catch it before the DB).
- Verify still succeeds (returns 200) even if `createApiKey` throws.

### Phase 5: Flip default tier + ship pricing UI + surface D6 deactivations

**Files to change:**

11. `lib/api-keys.ts` — flip `createApiKey`'s default tier from `'starter'` to `'free'`. Deferred from Phase 1.

12. `app/api/developer/keys/route.ts:58` — verify behavior. The endpoint currently calls `createApiKey(userId, name)` with no tier arg, so it'll now default to `'free'`. **Intended behavior** for users hitting "Generate API key" without going through Stripe checkout. Stripe checkout success path passes the paid tier explicitly, so it's unaffected.

13. `components/marketing/APIPricing.tsx`
    - Line 15-71: prepend a fourth tier object as the FIRST entry:

      ```ts
      {
        name: 'Free',
        price: '$0',
        period: '/ month',
        description: 'For evaluating the API.',
        features: [
          '25 files / month',
          '10 requests / minute',
          'All 14 exchanges',
          'Auto-detection',
          'JSON response',
        ],
        cta: 'Start Free',
        tier: 'free',
        style: 'bg-white/2 border-white/6',
        checkColor: 'text-slate-500',
      },
      ```

    - Line 107: change grid from `md:grid-cols-3` to `md:grid-cols-4`. **Container width: `max-w-5xl` → `max-w-7xl`.**
    - Tablet behavior: keep `md:grid-cols-2` so cards stack 2x2 cleanly between mobile and desktop.
    - Below the Free card's button only, add `<p className="text-xs text-slate-500 mt-2 text-center">No credit card required</p>`. Conditional on `tier.tier === 'free'`.
    - Growth retains its purple highlight and "POPULAR" badge.

14. `<ApiKeyManager />` component — render D6 deactivation reason on key cards *(new in v3)*. When `key.is_active === false` AND `key.deactivated_reason` matches the pattern `downgraded_replaced_by:*`, look up the replacing key by ID from the same user's key list and render:

    ```tsx
    {key.deactivated_reason?.startsWith('downgraded_replaced_by:') && (
      <p className="text-xs text-slate-500 mt-1">
        Deactivated {formatDate(key.deactivated_at)} when{' '}
        <span className="font-medium">{replacingKey?.name ?? 'a paid key'}</span>{' '}
        was downgraded to Free.
      </p>
    )}
    ```

    Make sure the `/api/developer/keys` GET endpoint returns the new columns (`deactivated_reason`, `deactivated_at`) on each key object — this may already happen via `SELECT *` but confirm. If the endpoint uses an explicit column list, add the two columns there.

    Generic deactivation (a user clicking "Deactivate" themselves) leaves `deactivated_reason` NULL, so the conditional render skips the note. No regression for normal deactivation UX.

15. `app/dashboard/developer/page.tsx` — eyeball-check tier display handles `'free'`. Likely just renders the string from DB; no code change. If quota display shows hardcoded paid-tier numbers anywhere, fix.

**Tests (new/update):**
- Update Phase 1's `createApiKey` default test: now expects `'free'`.
- `__tests__/components/APIPricing.test.tsx` (path TBD): four cards render; clicking Free's CTA stores `'free'` in `sessionStorage` and routes to `/signup`; "No credit card required" microcopy renders only on Free card.
- `__tests__/components/ApiKeyManager.test.tsx` *(new in v3)*: a deactivated key with `deactivated_reason = 'downgraded_replaced_by:<id>'` renders the explanation note with the replacing key's name; a deactivated key with `deactivated_reason = NULL` renders no note (regression check for user-initiated deactivation).

### Phase 6: Verification

16. Manual: fresh signup → verify → dashboard shows one free key with `quota=25, rpm=10`.
17. Manual: hit `/v1/parse` 26 times with that key; 26th returns 429 with the locked response shape and headers, and `upgrade_url` resolves to the current environment's pricing page (not hardcoded).
18. Manual: hit bank-PDF endpoint with that key; returns 403 `feature_not_available` with environment-correct `upgrade_url`.
19. Manual: Stripe test-mode subscription cancel → DB tier flips to `'free'`. If user had a pre-existing free key, that key is deactivated with `deactivated_reason` and `deactivated_at` populated, and the dashboard renders the explanation note referencing the formerly-paid key by name.
20. Manual: existing Starter user makes their 101st call → still returns 200 with `X-Api-Overage: true` (regression).
21. Manual: existing paid user (Starter/Growth/Business) keys still authenticate and return correct tier in responses.
22. Manual: user-initiated deactivation (clicking "Deactivate" in dashboard) leaves `deactivated_reason = NULL` and shows no D6 explanation note (regression).
23. Run full test suite. All green.

---

## 4. File-by-file change summary

| Phase | File | Change type | Notes |
|---|---|---|---|
| 0 | (greps + audit) | Read-only | Document findings; lock `APP_URL` env var name; update phases if surprises |
| 0.5 | `backend/handlers/api.py` | Edit | One-line `logger.info("api_request", extra={"tier": ...})` emit at top of `handle_v1_parse` (substrate for conversion measurement) |
| 2 | `backend/terraform/lambda.tf` | Edit | Add `APP_URL = var.app_url` to API Lambda env block (lines 479-485) |
| 2 | `backend/terraform/variables.tf` | Edit | Declare `variable "app_url"` |
| 1 | `lib/api-keys.ts` | Edit | Type union, `API_TIERS['free']`, optional tier arg, free-key cap. **Default stays `'starter'` until Phase 5.** |
| 1 | `db/migrations/013_free_tier_constraints.sql` | New | Partial unique index + `deactivated_reason` + `deactivated_at` columns |
| 1 | `__tests__/lib/api-keys.test.ts` | Edit | Free creation tests, free-cap tests |
| 2 | `backend/services/api_auth.py` | Edit | `check_monthly_quota` accepts tier, hard-blocks for free |
| 2 | `backend/handlers/api.py` | Edit | 429 with locked response shape (env-driven `upgrade_url`); bank-PDF 403 if not already gated |
| 2 | `backend/tests/test_api_auth.py` | Edit | Free hard-block, paid soft-flag regression |
| 2 | `backend/tests/test_api_handler.py` | Edit | Full-flow 429 + 403 tests; assert `upgrade_url` is env-driven |
| 3 | `app/api/webhooks/stripe/route.ts` | Edit | Deactivate pre-existing free key with reason+timestamp, downgrade to free, defensive guard |
| 3 | `__tests__/api/webhooks/stripe.test.ts` | Edit | Update assertion to `tier='free'`; D6 collision test asserts `deactivated_reason` and `deactivated_at`; defensive-guard test |
| 4 | `app/api/auth/verify/route.ts` | Edit | Auto-create one free key after successful verify |
| 4 | `__tests__/api/auth/verify.test.ts` | New/Edit | Auto-key creation, idempotency, error swallow |
| 5 | `lib/api-keys.ts` | Edit | Flip `createApiKey` default to `'free'` |
| 5 | `__tests__/lib/api-keys.test.ts` | Edit | Update default-tier test expectation |
| 5 | `components/marketing/APIPricing.tsx` | Edit | Fourth card, grid 4, max-w-7xl, microcopy |
| 5 | `__tests__/components/APIPricing.test.tsx` | New/Edit | Four-card render, CTA wiring |
| 5 | `<ApiKeyManager />` component | Edit | Render D6 deactivation note when reason matches; verify `/api/developer/keys` GET returns new columns |
| 5 | `__tests__/components/ApiKeyManager.test.tsx` | New | D6 note renders with replacing-key name; null-reason path renders no note |
| 5 | `app/dashboard/developer/page.tsx` | Eyeball | Confirm tier display |

Total: ~8 production files, ~7 test files, 1 migration. Surgical per CLAUDE.md.

---

## 5. What could break

- **`StripeApiPlan` vs `ApiTier` type drift.** `ApiTier` includes `'free'`; `StripeApiPlan` doesn't. Conversion sites: `app/api/developer/subscribe/route.ts:20` and `app/api/webhooks/stripe/route.ts:111`. Subscribe route's `if (!STRIPE_API_PRICES[tier])` 400 will reject `'free'` — keep that. Webhook's M-3 price verification fails for `'free'` since there's no price ID — Phase 3's defensive guard handles this.
- **D6 collision crash.** Without the deactivation step, the partial unique index throws a UNIQUE violation in production the first time a user with both a free and a paid key cancels. The Phase 3 collision test is the seatbelt.
- **Phase 2's `check_monthly_quota` signature change.** Phase 0 grep confirms call sites; if a second caller exists and is missed, that endpoint throws on every request. Phase 0 is the seatbelt.
- **Auto-provisioned key at signup race.** Partial unique index prevents duplicates at the DB level. App-level idempotency check is a UX nicety.
- **Pricing page width at four columns.** Locked at `max-w-7xl`. Revisit only if real-world rendering shows it's still cramped.
- **Bank PDF gating regression.** If Phase 0 finds bank PDF is gated via a check like `tier !== 'starter'`, that check now lets Free through. The Phase 2 explicit gate is the fix.
- **`upgrade_url` env var missing in Lambda env** *(new in v3)*. The fallback to `https://taxformatter.com` keeps responses functional, but logs a warning. Phase 6 manual verification should confirm `upgrade_url` resolves correctly in dev/staging — if it always shows production URL, the env var didn't propagate.
- **Dashboard rendering of deactivated-with-reason key references a missing replacing key.** If the replacing key has been deleted or doesn't exist for any reason, the lookup returns `undefined`; the fallback `'a paid key'` keeps the note rendering gracefully. Test the null-reason path explicitly.

---

## 6. Stripe Dashboard work

None required for the Free tier itself. Verify:
- The three `STRIPE_API_PRICE_*` env vars (`STARTER`, `GROWTH`, `BUSINESS`) remain set; `validateStripeConfig` unchanged.
- The webhook endpoint URL still points at `/api/webhooks/stripe` and the four event types in `app/api/webhooks/stripe/route.ts` are subscribed.

---

## 7. Test plan

**Regression-critical existing tests** (must continue to pass):
- M-1: webhook idempotency (`__tests__/api/webhooks/stripe.test.ts`)
- M-3: webhook price verification (same file)
- Subscribe route tier validation (`__tests__/api/developer/subscribe.test.ts`)
- Usage roll-up (`__tests__/api/developer/usage.test.ts`)
- Existing rate-limit tests (`lib/__tests__/rate-limit.test.ts`)

If any of these go red after a phase, stop and review.

**New tests** (consolidated):

1. `lib/api-keys.test.ts`: explicit `tier='free'` creates with quota=25, rpm=10.
2. `lib/api-keys.test.ts`: second free-key creation for same user rejects.
3. `lib/api-keys.test.ts`: explicit `tier='starter'` still works.
4. `lib/api-keys.test.ts`: default (no tier arg) — Phase 1 expects `'starter'`, Phase 5 flips expectation to `'free'`.
5. `__tests__/api/auth/verify.test.ts`: verify creates exactly one free key.
6. `__tests__/api/auth/verify.test.ts`: re-verify does not duplicate.
7. `__tests__/api/auth/verify.test.ts`: verify returns 200 even if key creation throws.
8. `backend/tests/test_api_auth.py`: free key at quota → `(False, 25, True)`.
9. `backend/tests/test_api_auth.py`: starter key at quota → `(True, 100, True)`.
10. `backend/tests/test_api_handler.py`: free at quota → 429 with locked shape, `Retry-After`, `X-Quota-Reset`, env-driven `upgrade_url`.
11. `backend/tests/test_api_handler.py`: free hitting bank-PDF → 403 `feature_not_available` with env-driven `upgrade_url`.
12. `__tests__/api/webhooks/stripe.test.ts`: subscription.deleted → `tier='free'` with correct quota/rpm.
13. `__tests__/api/webhooks/stripe.test.ts`: D6 collision — pre-existing free key deactivated with `deactivated_reason` matching `downgraded_replaced_by:<id>` and `deactivated_at` set; paid key downgrades to free; no UNIQUE violation.
14. `__tests__/api/webhooks/stripe.test.ts`: defensive guard — `'free'` in checkout metadata is logged and skipped.
15. `__tests__/components/APIPricing.test.tsx`: four cards render, Free CTA wires correctly, microcopy renders only on Free.
16. `__tests__/components/ApiKeyManager.test.tsx`: D6 note renders with replacing-key name when `deactivated_reason` matches the pattern.
17. `__tests__/components/ApiKeyManager.test.tsx`: D6 note does NOT render when `deactivated_reason` is null (user-initiated deactivation).
18. `__tests__/components/ApiKeyManager.test.tsx`: D6 note falls back to "a paid key" when the replacing key ID can't be resolved (defensive).

**Manual smoke** (post-deploy):

- Fresh signup → verify → dashboard shows one free key, correct quotas.
- 26th call returns 429 with locked shape; `upgrade_url` is environment-correct.
- Bank-PDF call from free key returns 403 with environment-correct `upgrade_url`.
- Stripe test-mode cancel → tier flips to free; D6 collision case verified, dashboard renders the explanation note.
- User-initiated deactivation shows no D6 note (regression).
- Existing Starter at 101/100 still 200 (regression).
- Existing paid users unaffected (regression).

---

## 8. Rollout

The v1 plan had a window where dashboard manual key creation would silently default to `'free'` before users could find Free in the UI. v2/v3 fixes this by **keeping the default `'starter'` until the pricing UI ships**.

Recommended PR sequence:

1. **PR 1 (Phase 0 + Phase 1):** confirmation pass + type union + `API_TIERS['free']` + optional tier arg + migration (unique index + deactivation columns). Default stays `'starter'`. No user-visible change.
2. **PR 2 (Phase 2):** backend quota policy + bank-PDF gate + locked response shape with env-driven `upgrade_url`. No user-visible change for paid users.
3. **PR 3 (Phase 3):** webhook downgrade-to-free + D6 collision handling with provenance + defensive guard. No user-visible change unless someone cancels mid-deploy.
4. **PR 4 (Phase 4 + Phase 5):** auto-provision on verify + flip default tier + pricing UI + D6 deactivation surfacing. **Launch PR.** New signups now get free keys, dashboard manual-create defaults to free, pricing page advertises it, and any future D6 collisions render with a clear explanation.

Or ship as a single PR if reviewable.

---

## 9. Out of scope (intentionally deferred)

- Persistent / cross-Lambda rate limiting (Redis, DynamoDB-based limiter).
- Upgrade-nudge emails when a Free user hits 80% / 100% of quota.
- Free-tier abuse detection (multi-account signups for unlimited free usage).
- Backfilling existing Starter keys without subscriptions to Free.
- Renaming the README's mentions of "Free / Pro / Premium" tiers (separate doc-cleanup task).
- Full conversion-funnel dashboard. Phase 0 ensures tier is logged on every request, which is the minimum substrate for measuring conversion later.

---

## 10. Pricing page mockup reference

Four-column layout. Order: **Free** (leftmost), Starter, **Growth (Most popular)**, Business. Container `max-w-7xl`.

- Free: $0/month, five-feature list, "Start Free" CTA, "No credit card required" microcopy.
- Growth retains purple highlight and "POPULAR" badge.
- All other tier cards unchanged.

---

## 11. Verification checklist (before merging launch PR)

- [ ] Phase 0 grep findings documented; `APP_URL` env var name locked
- [ ] `pnpm test` green
- [ ] `pytest backend/tests/` green
- [ ] M-1 idempotency and M-3 price verification tests still green
- [ ] Migration `013_free_tier_constraints.sql` applied successfully (unique index + new columns)
- [ ] Fresh signup creates exactly one `'free'` API key
- [ ] 26th `/v1/parse` call on a Free key returns 429 with locked response shape, `Retry-After`, `X-Quota-Reset`, env-driven `upgrade_url`
- [ ] Bank-PDF endpoint with Free key returns 403 `feature_not_available` with env-driven `upgrade_url`
- [ ] 101st call on a Starter key returns 200 with `X-Api-Overage: true` (regression)
- [ ] Stripe test-mode subscription cancellation downgrades the key to `'free'`, not `'starter'`
- [ ] D6 collision: user with pre-existing free key + canceled paid key → free key deactivated with `deactivated_reason` and `deactivated_at` populated, paid key downgraded, no UNIQUE violation
- [ ] Dashboard renders D6 explanation note ("Deactivated [date] when [paid key name] was downgraded to Free") on the deactivated free key
- [ ] User-initiated deactivation leaves `deactivated_reason = NULL` and shows no explanation note
- [ ] Existing paid-tier users (Starter/Growth/Business) keys still authenticate and report correct tier
- [ ] Pricing page renders four cards at desktop (max-w-7xl), 2x2 at tablet, single column at mobile
- [ ] "Start Free" CTA from pricing page lands on signup, then on dashboard with a working free key after verification
- [ ] Tier is logged on every `/v1/parse` request (substrate for conversion measurement)
- [ ] No mentions of `'starter'` as a default fallback remain in `lib/api-keys.ts` or the webhook handler
- [ ] No new `npm` or `pip` dependencies were added

---

## Appendix: Free tier spec (for reference)

| Property | Value |
|---|---|
| Name | Free |
| Price | $0 / month |
| Files | 25 / month (hard cap, 429 at limit) |
| Rate limit | 10 requests / minute (in-memory, per Lambda) |
| Exchanges | All 14 |
| Bank PDF parsing | **Not included** (Growth+ only, 403 `feature_not_available`) |
| Output formats | JSON only |
| Response shape | Identical to paid tiers (no field gating) |
| Auto-detection | Yes |
| Support | Community / docs only |
| Credit card required | No |
| Duration | Indefinite (not a trial) |
| Keys per user | 1 active free key (paid tier unlocks default 5) |
| Behavior on paid subscription cancel | Key downgrades to Free, stays usable; pre-existing free key (if any) is deactivated with reason recorded, dashboard renders explanation |
| `upgrade_url` in error responses | Driven by `APP_URL` env var (Lambda) — environment-correct in dev/staging/prod |

---

## Changelog

### v3 (this version)
- **D8 added** (`upgrade_url` from env var, not hardcoded). Affects Phase 0 (lock env var name), Phase 2 (use it in 429 + 403 responses), Phase 6 (manual verification of environment-correctness), test plan (assert env-driven behavior).
- **D6 deactivation surfacing promoted from optional polish to launch-PR scope.** Migration in Phase 1 adds `deactivated_reason` + `deactivated_at` columns. Webhook in Phase 3 populates them. Dashboard `<ApiKeyManager />` in Phase 5 renders the explanation note when the reason matches `downgraded_replaced_by:*`. Three new component tests cover the renders.
- Verification checklist expanded with three new items: dashboard explanation note renders, user-initiated deactivation shows no note (regression), `upgrade_url` is environment-correct.

### v3 post-Phase-0 amendments (2026-05-03)
- **Phase 0 marked complete** with findings inline. Two surprises required plan deltas:
  - **Lambda has no `APP_URL` env var today.** Locked name `APP_URL`. Phase 2 expanded with a Terraform edit to `backend/terraform/lambda.tf` + `variables.tf`.
  - **Tier is not logged on `/v1/parse` today, and `api_requests` schema has no `tier` column.** Added **Phase 0.5** — a one-line `logger.info` emit in `handle_v1_parse` (CloudWatch substrate for conversion measurement). Persistent column deferred.
- All other plan assumptions verified.

### v2
- **D6 added** (downgrade-collision handling).
- **D7 added** (response identity locked to "identical to paid").
- **Phase 0 added** (confirmation grep pass + tier-logging substrate).
- **Phase 2 expanded**: locked 429 response shape; explicit bank-PDF gate.
- **Phase 3 expanded**: D6 collision handling; defensive guard for `'free'` in checkout metadata.
- **Phase 5 reordered**: now combines default-flip with pricing UI to eliminate rollout window.
- **Pricing page width locked** at `max-w-7xl` (was "eyeball" in v1).
- **Verification checklist**: added existing-paid-user regression check, D6 collision check, tier-logging check, migration check.
- **Test plan**: explicit regression-critical list (M-1, M-3, etc.).