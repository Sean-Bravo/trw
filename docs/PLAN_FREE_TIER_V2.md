# Free Tier Implementation Plan (v2)

> ⚠️ **DEPRECATED — DO NOT USE.** This plan has been superseded by [PLAN_FREE_TIER_V3.md](PLAN_FREE_TIER_V3.md), which adds dashboard surfacing for D6 deactivation events on top of v2's rollout-order fix and downgrade-collision handling. This file is kept for diff/history reference only.

**Created:** 2026-05-01
**Supersedes:** v1 (same date)
**Scope:** Backend (API tier definition, signup auto-provisioning, Stripe handling, quota/rate-limit policy) + pricing page UI (four-column layout, no-credit-card CTA) + minimal observability for free→paid conversion tracking.
**Out of scope:** Tier-aware persistent rate limiting (Redis/DynamoDB), upgrade-nudge emails, marketing launch announcement, full dashboard analytics for tier funnel, free-tier abuse detection.

---

## TL;DR

- Free tier is **half-built**: DB enum already includes `'free'`, schema defaults are `'free'`/quota=10/rpm=10, but TypeScript types, `API_TIERS` config, signup flow, Stripe handling, and pricing UI all assume only Starter/Growth/Business.
- Free tier spec: $0/month, 25 files/month, 10 req/min, all 14 exchanges, auto-detection, JSON response, **no bank PDF parsing**, no credit card required, indefinite (not a trial), 1 active free key per user.
- Critical pre-existing issue: **monthly quotas are tracked but not enforced** — `check_monthly_quota` in `backend/services/api_auth.py:122` returns `is_overage` as a header flag and explicitly comments "Never hard-block." Shipping Free without a hard cap = unlimited usage at $0. **Policy: hard-block on `free` tier specifically**; leave paid tier soft-flag behavior unchanged.
- Estimated effort: ~2 work sessions for code + tests, plus a confirmation pass (Phase 0) and one DB migration.
- Two changes from v1 worth flagging up front:
  1. **Rollout order changed** to eliminate a window where dashboard-created keys would silently default to free during the rollout.
  2. **Downgrade-collision handling added** (D6) — when a paid sub is canceled and the user already had a free key from before subscribing, the webhook deactivates the old free key before downgrading.

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
| Webhook: subscription canceled | `app/api/webhooks/stripe/route.ts:183-202` | Downgrades to **`'starter'`** with starter quotas — **bug in the context of a free tier**: should downgrade to `'free'` |
| Backend rate limit | `backend/services/api_auth.py:100-119` | In-memory per-Lambda; tier-aware via `key_record["rate_limit_rpm"]` — already tier-aware, evaporates on cold start (acceptable for MVP per existing comment) |
| Backend quota | `backend/services/api_auth.py:122-143` | **Soft-flag only**: returns `(allowed=True, usage, is_overage)`; comment says "Never hard-block" |
| API request flow | `backend/handlers/api.py:559, 241` | Calls `check_rate_limit` (enforced) and `check_monthly_quota` (soft-flag in `X-Api-Overage` header) |
| Pricing UI | `components/marketing/APIPricing.tsx:15-71` | Three hardcoded tier objects, three-column grid (`md:grid-cols-3`), purple highlight on Growth |
| Pricing CTA | `components/marketing/APIPricing.tsx:76-86` | Stores `tier` in `sessionStorage` then `router.push('/signup')` — already wired generically |
| Signup register | `app/signup/page.tsx` + `/api/auth/register` | Creates user; **does NOT auto-create an API key** — user must visit dashboard and manually create one |
| Default tier on key creation | `app/api/developer/keys/route.ts:58` | Calls `createApiKey(userId, name)` — no tier arg, falls through to hardcoded `'starter'` |

### Surprising things to know before changing code

1. **README/`docs/TIER_BASED_IMPLEMENTATION_SUMMARY.md` describe a Free tier with Gemini AI categorization that does not exist in code.** This is aspirational documentation from a different product direction. Don't rely on it.
2. **Each user can create up to 5 API keys** (`MAX_KEYS_PER_USER` in `lib/api-keys.ts:40`). Free needs a separate, lower cap.
3. **Quota enforcement and rate limiting are tier-aware in the Python backend, but rate limit is in-memory** — across N concurrent Lambda containers, effective RPM ceiling is N × `rate_limit_rpm`. Documented as MVP-acceptable.
4. **Pricing tier intent is passed via `sessionStorage`** (per security note `L-1`). The signup page reads it post-verification and the `pending_api_tier` cookie persists tier through email verification callback.

---

## 2. Open Decisions

Recommended answers in **bold**.

**D1. Quota enforcement on Free: hard block or soft flag?**
- **Hard block on `free` only** — at 25 files used, 26th request returns 429 `quota_exceeded`. Paid tiers retain current soft-flag behavior. One conditional in `check_monthly_quota`.

**D2. Free-tier API key cap per user: 1 or default 5?**
- **1 active free-tier key per user.** Paid tier unlocks default 5 (`MAX_KEYS_PER_USER`). Enforced via partial unique index at the DB level; app-level check provides the user-facing error message.
- *Note for D3 interaction:* "active" here means `is_active = true`. Deactivated free keys don't count toward the cap, so a user who deletes their auto-provisioned key can create a new one with a custom name. This needs to be surfaced in the dashboard error message ("Deactivate your existing free key to create a new one").

**D3. Auto-provision a free key at signup, or wait for explicit creation?**
- **Auto-provision after email verification.** Free tier specifically — paid tier flow unchanged (Stripe checkout still creates the key after subscription). The `MAX_FREE_KEYS_PER_USER = 1` cap is harmless because verification only happens once and the create call is idempotent (skip if any active key exists).

**D4. What happens when a paid subscription is canceled? Downgrade to Free or revoke?**
- **Downgrade to Free.** Keys keep working at Free limits.

**D5. Existing users without a paid subscription — backfill to Free or leave alone?**
- **Leave existing keys alone.** New users get Free; existing users keep whatever tier they have. A one-time backfill is risky and unnecessary if the change is forward-looking.

**D6. Downgrade collision: user has both a pre-existing free key and a paid key, then cancels the paid sub. What happens?** *(new in v2)*
- The webhook would otherwise downgrade the canceled key to `'free'`, creating two active free keys for the user — violating the `MAX_FREE_KEYS_PER_USER = 1` constraint and crashing the partial unique index UPDATE.
- **Recommended:** webhook deactivates any other active free key for the user *before* downgrading the canceled paid key. Rationale: paid history > free history; the user invested money in the canceled key, so it should "win." One extra `UPDATE api_keys SET is_active = false WHERE user_id = $1 AND tier = 'free' AND is_active = true AND id != $2` before the existing downgrade UPDATE.
- Surface in dashboard: when this happens, the deactivated free key shows a small note ("Deactivated when [paid key name] downgraded"). Optional polish; defer if scope-bound.

**D7. Free tier response identity: does the JSON match paid tiers exactly?** *(new in v2)*
- **Yes, identical JSON shape.** No confidence-score gating, no provenance-metadata gating. Bank PDF parsing is the only feature gate (Growth+ only, enforced at endpoint level). Reasoning: gating response richness creates integration-time surprises when users upgrade; cleaner to gate by feature/endpoint than by response field. If we want to push upgrades, do it via quota and feature scope, not by silently degrading output.

---

## 3. Sequenced Implementation

Order matters. Each phase ends with a green test run (`pnpm test` for TypeScript, `pytest backend/tests/` for Python — confirm exact scripts in `package.json` before running).

### Phase 0: Confirmation pass *(new in v2)*

Before writing any code, run these greps and resolve any findings:

1. `grep -rn "check_monthly_quota" backend/` — confirm single call site (expected: only `backend/handlers/api.py:241`). If a second caller exists (admin endpoint, batch job, internal cron), Phase 3's signature change must update those too.
2. `grep -rn "'starter'" backend/ app/ lib/ components/` and `grep -rn '"starter"' backend/ app/ lib/ components/` — find any other hardcoded starter assumptions beyond the two known sites (`createApiKey` default and webhook downgrade target).
3. `grep -rn "tier" app/api/` and look for any endpoint that's gated by tier. Specifically confirm where bank-PDF parsing is gated. If it's gated by checking `tier !== 'starter'` (because that was the lowest paid tier), the check must change to handle Free correctly. Likely candidate: `/v1/parse` handler or a bank-pdf-specific endpoint. **Bank PDF must reject Free keys with a 403 `feature_not_available` response.**
4. Confirm tier is logged on every `/v1/parse` call. If not, add a one-line emit in the handler so we can measure free→paid conversion later. (Improvement E in v1 review.)

Document findings inline before proceeding. If anything unexpected surfaces (a third caller, a hidden tier check, missing tier logging), update the affected phase below.

### Phase 1: Backend tier definition (foundation)

**Files to change:**

1. `lib/api-keys.ts`
   - Line 6: extend `ApiTier` type → `'free' | 'starter' | 'growth' | 'business'`.
   - Line 34-38: add `free: { monthly_quota: 25, rate_limit_rpm: 10, price: 0 }` as the first entry of `API_TIERS`.
   - Line 58-88 (`createApiKey`): accept an optional `tier: ApiTier` parameter. **Keep the default at `'starter'` for now** — it flips to `'free'` in Phase 5, not here. (See Section 8 rollout for why.)
   - Add a `MAX_FREE_KEYS_PER_USER = 1` constant near `MAX_KEYS_PER_USER`. In `createApiKey`, when `tier === 'free'`, query for existing active free keys for this user and reject with a clear error if ≥ 1.

2. `lib/stripe.ts`
   - `API_PRICING`, `STRIPE_API_PRICES`, `validateStripeConfig`, and `StripeApiPlan` type all stay paid-only. Free tier is intentionally absent from Stripe.

3. `db/migrations/013_free_tier_constraints.sql` (new file)
   ```sql
   CREATE UNIQUE INDEX api_keys_one_active_free_per_user
     ON api_keys(user_id)
     WHERE tier = 'free' AND is_active = true;
   ```
   This is the real guarantee against duplicate free keys (races, retries). The app-level check is for the error message only.

**Tests (new):**
- `__tests__/lib/api-keys.test.ts`: test explicit `tier='free'` creation succeeds with quota=25, rpm=10; test `MAX_FREE_KEYS_PER_USER = 1` cap (second free key creation rejects); test explicit `tier='starter'` argument still works; test default (no tier arg) still produces `'starter'` (will flip in Phase 5).

### Phase 2: Quota enforcement policy change for Free

**Files to change:**

4. `backend/services/api_auth.py:122-143` — `check_monthly_quota`. Change signature to accept `tier: str` (or look it up from the existing DB row already fetched for auth). When `tier == 'free'` and `current_usage >= monthly_quota`, return `(allowed=False, current_usage, True)`. For all other tiers, keep current soft-flag behavior. Update the docstring to reflect the policy split.

5. `backend/handlers/api.py` — wherever `check_monthly_quota` is consumed (lines 240-244 currently set headers when `is_overage`), add a 429 short-circuit if the function returns `allowed=False`. **Lock the response shape now** *(new in v2)*:

   ```json
   {
     "error": {
       "code": "quota_exceeded",
       "message": "Free tier monthly limit of 25 files reached. Resets on the 1st. Upgrade for higher limits.",
       "upgrade_url": "https://taxformatter.com/pricing"
     }
   }
   ```

   Headers: `Retry-After: <seconds-until-month-rollover>` and `X-Quota-Reset: <ISO-8601-timestamp>`. Customers will integrate against this; changing it later is a breaking change.

6. **Bank PDF gating** *(new in v2, depending on Phase 0 finding)*: if Phase 0 found that bank PDF is not yet gated by tier, add the gate now. Free tier returns 403 with:

   ```json
   {
     "error": {
       "code": "feature_not_available",
       "message": "Bank PDF parsing requires Growth tier or higher.",
       "upgrade_url": "https://taxformatter.com/pricing"
     }
   }
   ```

**Tests (new):**
- `backend/tests/test_api_auth.py`: `check_monthly_quota` for free key at usage=25 returns `(False, 25, True)`; for starter key at usage=100 returns `(True, 100, True)` (regression — soft-flag still works).
- `backend/tests/test_api_handler.py`: full request flow — Free key at quota gets 429 with the locked response shape, including `Retry-After` and `X-Quota-Reset` headers.
- `backend/tests/test_api_handler.py`: Free key calling bank-PDF endpoint gets 403 with `feature_not_available`.
- **Regression check explicit:** Starter key at 101/100 still returns 200 with `X-Api-Overage: true`. (M-1 idempotency and M-3 price verification tests must continue to pass — flag for reviewer.)

### Phase 3: Stripe webhook — downgrade-to-Free with collision handling

**Files to change:**

7. `app/api/webhooks/stripe/route.ts:183-202` (`customer.subscription.deleted` case). Two changes:

   First, before downgrading the canceled key, deactivate any pre-existing free key for the same user (D6):

   ```ts
   await execute(
     `UPDATE api_keys
      SET is_active = false
      WHERE user_id = $1
        AND tier = 'free'
        AND is_active = true
        AND id != $2`,
     [apiKey.user_id, apiKey.id]
   )
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

   Update the log line to `downgraded to free tier` and log the deactivation count if > 0.

8. **Defensive guard** at `app/api/webhooks/stripe/route.ts:111` (where `apiTier.toUpperCase() as StripeApiPlan` happens for checkout): if `apiTier === 'free'` ever appears in checkout metadata, log a warning and skip — `'free'` should never go through Stripe checkout.

**Tests (update):**
- `__tests__/api/webhooks/stripe.test.ts`: existing `customer.subscription.deleted` test asserts `tier='starter'` after cancel. Update to assert `tier='free'` with quota=25, rpm=10, and `stripe_subscription_id = NULL`.
- New test: user with both an active free key and an active paid key cancels paid sub → free key is deactivated, paid key downgrades to free, no UNIQUE constraint violation. **This is the D6 test — non-negotiable; without it the partial unique index will crash production on the first such cancel.**
- New test: defensive guard — webhook with `apiTier='free'` in checkout metadata is logged and skipped, no DB write.

### Phase 4: Signup auto-provisions a free API key

**Files to change:**

9. `app/api/auth/verify/route.ts` — after `verifyEmailCode(validatedEmail, code)` returns `result.success === true` (around line 43-50), call `createApiKey(result.user.id, 'Default key', 'free')` inside a `try/catch`. Idempotency: if the user already has any active key, skip. Errors are logged but don't block the response. Place the call BEFORE the `NextResponse.json(...)` return.

10. `app/api/auth/register/route.ts`: do NOT create the key here (pre-verification). Wait for verify so we don't create keys for unverified emails.

**Tests (new):**
- `__tests__/api/auth/verify.test.ts`: post-verification, exactly one active free key exists for the user.
- Re-verification doesn't create a duplicate (partial unique index would prevent it anyway, but the app-level idempotency check should also catch it before the DB).
- Verify still succeeds (returns 200) even if `createApiKey` throws — failure is logged, not propagated.

### Phase 5: Flip default tier + ship pricing UI *(combined — this is the rollout-window fix)*

**Files to change:**

11. `lib/api-keys.ts` — flip `createApiKey`'s default tier from `'starter'` to `'free'`. This is the change deferred from Phase 1.

12. `app/api/developer/keys/route.ts:58` — verify behavior. The endpoint currently calls `createApiKey(userId, name)` with no tier arg, so it'll now default to `'free'`. **This is the intended behavior** for users hitting "Generate API key" without going through Stripe checkout — they get a free key. Confirm by reading the dashboard flow: Stripe checkout success path passes the paid tier explicitly, so it's unaffected.

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

    - Line 107: change grid from `md:grid-cols-3` to `md:grid-cols-4`. **Container width: change `max-w-5xl` to `max-w-7xl`** *(decision locked in v2 — was "eyeball" in v1)*. At 80rem, four cards have breathing room without the Free card crowding the paid three.
    - Tablet behavior: keep `md:grid-cols-2` so cards stack 2x2 cleanly between mobile and desktop.
    - Below the Free card's button only, add `<p className="text-xs text-slate-500 mt-2 text-center">No credit card required</p>`. Conditional on `tier.tier === 'free'`.
    - Growth retains its purple highlight and "POPULAR" badge.

14. `app/dashboard/developer/page.tsx` and `<ApiKeyManager />` — eyeball-check tier display handles `'free'`. Likely just renders the string from DB; no code change. If quota display shows hardcoded paid-tier numbers anywhere, fix.

**Tests (new/update):**
- Update Phase 1's `createApiKey` default test: now expects `'free'`.
- `__tests__/components/APIPricing.test.tsx` (path TBD): four cards render; clicking Free's CTA stores `'free'` in `sessionStorage` and routes to `/signup`; "No credit card required" microcopy renders only on Free card.

### Phase 6: Verification

15. Manual: fresh signup → verify → dashboard shows one free key with `quota=25, rpm=10`.
16. Manual: hit `/v1/parse` 26 times with that key; 26th returns 429 with the locked response shape and headers.
17. Manual: hit bank-PDF endpoint with that key; returns 403 `feature_not_available`.
18. Manual: Stripe test-mode subscription cancel → DB tier flips to `'free'`. If user had a pre-existing free key, that key is deactivated and the formerly-paid key keeps its name.
19. Manual: existing Starter user makes their 101st call → still returns 200 with `X-Api-Overage: true` (regression).
20. Manual: existing paid user (Starter/Growth/Business) keys still authenticate and return correct tier in responses *(new in v2 — explicit regression check)*.
21. Run full test suite. All green.

---

## 4. File-by-file change summary

| Phase | File | Change type | Notes |
|---|---|---|---|
| 0 | (greps + audit) | Read-only | Document findings; update phases if surprises |
| 1 | `lib/api-keys.ts` | Edit | Type union, `API_TIERS['free']`, optional tier arg, free-key cap. **Default stays `'starter'` until Phase 5.** |
| 1 | `db/migrations/013_free_tier_constraints.sql` | New | Partial unique index for one active free key per user |
| 1 | `__tests__/lib/api-keys.test.ts` | Edit | Free creation tests, free-cap tests |
| 2 | `backend/services/api_auth.py` | Edit | `check_monthly_quota` accepts tier, hard-blocks for free |
| 2 | `backend/handlers/api.py` | Edit | 429 with locked response shape; bank-PDF 403 if not already gated |
| 2 | `backend/tests/test_api_auth.py` | Edit | Free hard-block, paid soft-flag regression |
| 2 | `backend/tests/test_api_handler.py` | Edit | Full-flow 429 + 403 tests |
| 3 | `app/api/webhooks/stripe/route.ts` | Edit | Deactivate pre-existing free key, downgrade to free, defensive guard |
| 3 | `__tests__/api/webhooks/stripe.test.ts` | Edit | Update assertion to `tier='free'`; new D6 collision test; new defensive-guard test |
| 4 | `app/api/auth/verify/route.ts` | Edit | Auto-create one free key after successful verify |
| 4 | `__tests__/api/auth/verify.test.ts` | New/Edit | Auto-key creation, idempotency, error swallow |
| 5 | `lib/api-keys.ts` | Edit | Flip `createApiKey` default to `'free'` |
| 5 | `__tests__/lib/api-keys.test.ts` | Edit | Update default-tier test expectation |
| 5 | `components/marketing/APIPricing.tsx` | Edit | Fourth card, grid 4, max-w-7xl, microcopy |
| 5 | `__tests__/components/APIPricing.test.tsx` | New/Edit | Four-card render, CTA wiring |
| 5 | `app/dashboard/developer/page.tsx` + `<ApiKeyManager />` | Eyeball | Confirm tier display |

Total: ~7 production files, ~6 test files, 1 migration. Surgical per CLAUDE.md.

---

## 5. What could break

- **`StripeApiPlan` vs `ApiTier` type drift.** `ApiTier` includes `'free'`; `StripeApiPlan` doesn't. Conversion sites: `app/api/developer/subscribe/route.ts:20` and `app/api/webhooks/stripe/route.ts:111`. Subscribe route's `if (!STRIPE_API_PRICES[tier])` 400 will reject `'free'` — keep that. Webhook's M-3 price verification fails for `'free'` since there's no price ID — Phase 3's defensive guard handles this.
- **D6 collision crash.** Without the deactivation step, the partial unique index throws a UNIQUE violation in production the first time a user with both a free and a paid key cancels. The Phase 3 collision test is the seatbelt.
- **Phase 2's `check_monthly_quota` signature change.** Phase 0 grep confirms call sites; if a second caller exists and is missed, that endpoint throws on every request. Phase 0 is the seatbelt.
- **Auto-provisioned key at signup race.** Partial unique index prevents duplicates at the DB level. App-level idempotency check is a UX nicety.
- **Pricing page width at four columns.** Locked at `max-w-7xl`. If real-world rendering shows it's still cramped (long feature copy in a future tier change), revisit — but don't block on this.
- **Bank PDF gating regression.** If Phase 0 finds bank PDF is gated via a check like `tier !== 'starter'`, that check now lets Free through. The Phase 2 explicit gate (`tier in ('growth', 'business')` or equivalent) is the fix.

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

If any of these go red after a phase, stop and review — the Free tier change should not weaken paid-tier guarantees.

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
10. `backend/tests/test_api_handler.py`: free at quota → 429 with locked shape, `Retry-After`, `X-Quota-Reset`.
11. `backend/tests/test_api_handler.py`: free hitting bank-PDF → 403 `feature_not_available`.
12. `__tests__/api/webhooks/stripe.test.ts`: subscription.deleted → `tier='free'` with correct quota/rpm.
13. `__tests__/api/webhooks/stripe.test.ts`: D6 collision — pre-existing free key deactivated before paid key downgrades, no UNIQUE violation.
14. `__tests__/api/webhooks/stripe.test.ts`: defensive guard — `'free'` in checkout metadata is logged and skipped.
15. `__tests__/components/APIPricing.test.tsx`: four cards render, Free CTA wires correctly, microcopy renders only on Free.

**Manual smoke** (post-deploy):

- Fresh signup → verify → dashboard shows one free key, correct quotas.
- 26th call returns 429 with locked shape.
- Bank-PDF call from free key returns 403.
- Stripe test-mode cancel → tier flips to free; D6 collision case verified.
- Existing Starter at 101/100 still 200 (regression).
- Existing paid users unaffected (regression).

---

## 8. Rollout

The v1 plan had a window (between PR 1 and PR 3) where dashboard manual key creation would silently default to `'free'` even for users coming from paid funnels. v2 fixes this by **keeping the default `'starter'` until the pricing UI ships**, so the moment Free becomes the default for new keys is the same moment users can actually find the Free option in the UI.

Recommended PR sequence:

1. **PR 1 (Phase 0 + Phase 1):** confirmation pass + type union + `API_TIERS['free']` + optional tier arg + migration. Default stays `'starter'`. No user-visible change.
2. **PR 2 (Phase 2):** backend quota policy + bank-PDF gate + locked response shape. No user-visible change for paid users; existing free keys (if any from edge cases) start hard-blocking — should be ~zero of these in production.
3. **PR 3 (Phase 3):** webhook downgrade-to-free + D6 collision handling + defensive guard. No user-visible change unless someone cancels mid-deploy.
4. **PR 4 (Phase 4 + Phase 5):** auto-provision on verify + flip default tier + pricing UI. **This is the launch PR.** New signups now get free keys, dashboard manual-create defaults to free, and the pricing page advertises it.

Or ship as a single PR if reviewable. The sequence guarantees no rollout window where the default tier and the UI disagree.

---

## 9. Out of scope (intentionally deferred)

- Persistent / cross-Lambda rate limiting (Redis, DynamoDB-based limiter). In-memory `_rpm_tracker` is documented MVP-acceptable.
- Upgrade-nudge emails when a Free user hits 80% / 100% of quota. Post-launch retention work.
- Free-tier abuse detection (multi-account signups for unlimited free usage). Watch the data; tackle if it shows up.
- Backfilling existing Starter keys without subscriptions to Free. Don't change paid promises retroactively.
- Renaming the README's mentions of "Free / Pro / Premium" tiers (the Gemini-based aspirational doc). Separate doc-cleanup task.
- Full conversion-funnel dashboard. Phase 0 ensures tier is logged on every request, which is the minimum data substrate for measuring conversion later — but the dashboard itself is post-launch.
- D6 dashboard polish ("Deactivated when [paid key name] downgraded" note). Functional behavior is correct without this.

---

## 10. Pricing page mockup reference

Four-column layout. Order: **Free** (leftmost), Starter, **Growth (Most popular)**, Business. Container `max-w-7xl`.

- Free: $0/month, five-feature list, "Start Free" CTA, "No credit card required" microcopy.
- Growth retains purple highlight and "POPULAR" badge.
- All other tier cards unchanged.

---

## 11. Verification checklist (before merging launch PR)

- [ ] Phase 0 grep findings documented; any surprises addressed in affected phases
- [ ] `pnpm test` green
- [ ] `pytest backend/tests/` green
- [ ] M-1 idempotency and M-3 price verification tests still green
- [ ] Migration `013_free_tier_constraints.sql` applied successfully
- [ ] Fresh signup creates exactly one `'free'` API key
- [ ] 26th `/v1/parse` call on a Free key returns 429 with locked response shape, `Retry-After`, `X-Quota-Reset`
- [ ] Bank-PDF endpoint with Free key returns 403 `feature_not_available`
- [ ] 101st call on a Starter key returns 200 with `X-Api-Overage: true` (regression)
- [ ] Stripe test-mode subscription cancellation downgrades the key to `'free'`, not `'starter'`
- [ ] D6 collision: user with pre-existing free key + canceled paid key → free key deactivated, paid key downgraded, no UNIQUE violation
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
| Behavior on paid subscription cancel | Key downgrades to Free, stays usable; pre-existing free key (if any) is deactivated |

---

## Changelog from v1

- **D6 added** (downgrade-collision handling).
- **D7 added** (response identity locked to "identical to paid").
- **Phase 0 added** (confirmation grep pass + tier-logging substrate).
- **Phase 2 expanded**: locked 429 response shape (code, message, upgrade_url, headers); explicit bank-PDF gate.
- **Phase 3 expanded**: D6 collision handling; defensive guard for `'free'` in checkout metadata.
- **Phase 5 reordered**: now combines default-flip with pricing UI to eliminate rollout window. (Was Phase 1 + Phase 5 in v1, with a multi-day gap.)
- **Pricing page width locked** at `max-w-7xl` (was "eyeball" in v1).
- **Verification checklist**: added existing-paid-user regression check, D6 collision check, tier-logging check, migration check.
- **Test plan**: explicit regression-critical list (M-1, M-3, etc.) so reviewers know what must not break.