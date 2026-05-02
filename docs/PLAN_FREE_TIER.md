# Free Tier Implementation Plan

**Created:** 2026-05-01
**Scope:** Backend (API tier definition, signup auto-provisioning, Stripe handling, quota/rate-limit policy) + pricing page UI (four-column layout, no-credit-card CTA).
**Out of scope:** Tier-aware persistent rate limiting (Redis/DynamoDB), upgrade-nudge emails, marketing launch announcement, dashboard analytics for tier funnel.

---

## TL;DR

- Free tier is **half-built**: DB enum already includes `'free'`, schema defaults are `'free'`/quota=10/rpm=10, but TypeScript types, `API_TIERS` config, signup flow, Stripe handling, and pricing UI all assume only Starter/Growth/Business.
- Free tier spec (per prior decisions): $0/month, 25 files/month, 10 req/min, all 14 exchanges, auto-detection, JSON response, **no bank PDF parsing**, no credit card required, indefinite (not a trial).
- Critical pre-existing issue: **monthly quotas are tracked but not enforced** — `check_monthly_quota` in `backend/services/api_auth.py:122` returns `is_overage` as a header flag and explicitly comments "Never hard-block." Shipping Free without a hard cap = unlimited usage at $0. **Recommendation: change quota policy for `free` tier specifically** to hard-block; leave paid tier soft-flag behavior unchanged.
- Estimated effort: ~1–2 work sessions for code + tests, plus Stripe Dashboard config (no price ID for free, but webhook flow still needs to handle subscription cancellations downgrading to `free` instead of `starter`).
- Risk surface is small. The biggest landmines are (a) the quota-policy decision above and (b) ensuring `subscription.deleted` downgrades to `free` not `starter` in the webhook handler.

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
| Backend rate limit | `backend/services/api_auth.py:100-119` | In-memory per-Lambda; tier-aware via `key_record["rate_limit_rpm"]` — **already tier-aware**, but evaporates on cold start (acceptable for MVP per existing comment) |
| Backend quota | `backend/services/api_auth.py:122-143` | **Soft-flag only**: returns `(allowed=True, usage, is_overage)`; comment says "Never hard-block" |
| API request flow | `backend/handlers/api.py:559, 241` | Calls `check_rate_limit` (enforced) and `check_monthly_quota` (soft-flag in `X-Api-Overage` header) |
| Pricing UI | `components/marketing/APIPricing.tsx:15-71` | Three hardcoded tier objects, three-column grid (`md:grid-cols-3`), purple highlight on Growth |
| Pricing CTA | `components/marketing/APIPricing.tsx:76-86` | Stores `tier` in `sessionStorage` then `router.push('/signup')` — **already wired generically**, just needs `'free'` to be a valid value |
| Signup register | `app/signup/page.tsx` + `/api/auth/register` | Creates user; **does NOT auto-create an API key** — user must visit dashboard and manually create one |
| Default tier on key creation | `app/api/developer/keys/route.ts:58` | Calls `createApiKey(userId, name)` — no tier arg, falls through to hardcoded `'starter'` |
| Tests | `__tests__/lib/api-keys.test.ts`, `__tests__/api/webhooks/stripe.test.ts`, `__tests__/api/developer/subscribe.test.ts`, `__tests__/api/developer/usage.test.ts`, `lib/__tests__/rate-limit.test.ts` | Cover paid tier creation, webhook idempotency (M-1) and price verification (M-3), usage roll-up. **No quota-enforcement tests** (because quota isn't enforced). |

### Surprising things to know before changing code

1. **README/`docs/TIER_BASED_IMPLEMENTATION_SUMMARY.md` describe a Free tier with Gemini AI categorization that does not exist in code.** This is aspirational documentation from a different product direction. Don't rely on it; it's out-of-date.
2. **Each user can create up to 5 API keys** (`MAX_KEYS_PER_USER` in `lib/api-keys.ts:40`). With Free at 25 files/month and no per-user cap, a single user can self-provision 5 keys = 125 effective files/month free. **Decision needed below.**
3. **Quota enforcement and rate limiting are tier-aware in the Python backend, but rate limit is in-memory** — across N concurrent Lambda containers, effective RPM ceiling is N × `rate_limit_rpm`. This is documented as MVP-acceptable; Free tier doesn't change the calculus, but it does mean the Free 10 rpm could in practice be 30–50 rpm under load. Acceptable for MVP.
4. **Pricing tier intent is passed via `sessionStorage`** (per security note `L-1` in the code). The signup page reads it post-verification and the `pending_api_tier` cookie persists tier through email verification callback. `'free'` will flow through this mechanism unchanged once it's a valid string.

---

## 2. Open Decisions (resolve these before coding)

These are the decisions that change the shape of the work. Recommended answers in **bold** — happy to revise.

**D1. Quota enforcement on Free: hard block or soft flag?**
- **Hard block (recommended)**: at 25 files used, 26th request returns 429 `quota_exceeded`. Free cannot exceed cap. Forces upgrade.
- Soft flag (current paid behavior): allow overage, set `X-Api-Overage: true` header. Free becomes effectively unlimited until user notices.
- **Recommendation: hard block on `free` only**, leave paid tiers' soft-flag behavior unchanged. One conditional in `check_monthly_quota`.

**D2. Free-tier API key cap per user: 1 or default 5?**
- **1 free key per user (recommended)**: prevents trivial multiplication. Upgrading to a paid tier unlocks the full 5-key cap.
- Default 5: matches current limit; simpler code. But 5×25 = 125 free files/month per email is generous.
- **Recommendation: cap at 1 active free-tier key per user.** Paid keys uncapped (still bound by `MAX_KEYS_PER_USER = 5`).

**D3. Auto-provision a free key at signup, or wait for explicit creation?**
- **Auto-provision (recommended)**: signup → email verification → free API key created automatically → user lands on dashboard with a working key. Removes a friction step. Matches the "no credit card required" promise.
- Manual: signup → dashboard → click "Generate API key" → free key created. Existing flow works for paid tiers; user might expect same.
- **Recommendation: auto-provision on email verification.** Free tier specifically — paid tier flow unchanged (Stripe checkout still creates the key after subscription).

**D4. What happens when a paid subscription is canceled? Downgrade to Free or revoke?**
- **Downgrade to Free (recommended)**: keys keep working at Free limits. Smooth experience, encourages re-upgrade.
- Revoke (deactivate): keys stop working immediately. Harsher, more churn risk.
- **Recommendation: downgrade to Free.** The webhook handler currently downgrades to `starter`; this changes one literal string and the tier config lookup.

**D5. Existing users without a paid subscription — backfill to Free or leave alone?**
- Today, every active key is `'starter'` (because that's the only default). After this change, new keys without a subscription would be `'free'`.
- **Recommendation: leave existing keys alone.** A one-time backfill is risky (changes paid promises) and unnecessary if the change is forward-looking. New users get Free; existing users keep whatever tier they have.

---

## 3. Sequenced Implementation

Order matters. Each phase ends with a green `pnpm test` (or whatever the project uses — check `package.json` scripts before each phase).

### Phase 1: Backend tier definition (foundation)

**Files to change:**

1. `lib/api-keys.ts`
   - Line 6: extend `ApiTier` type → `'free' | 'starter' | 'growth' | 'business'`.
   - Line 34-38: add `free: { monthly_quota: 25, rate_limit_rpm: 10, price: 0 }` as the first entry of `API_TIERS`.
   - Line 58-88 (`createApiKey`): accept an optional `tier: ApiTier = 'free'` parameter. When the caller doesn't specify, default to `'free'` (was hardcoded `'starter'`). Pass `tierConfig.monthly_quota` and `tierConfig.rate_limit_rpm` from the looked-up tier (already does this, just becomes correct for `'free'` by virtue of the default change).
   - Add a `MAX_FREE_KEYS_PER_USER = 1` constant near `MAX_KEYS_PER_USER`. In `createApiKey`, when `tier === 'free'`, query for existing active free keys for this user and reject with a clear error if ≥ 1.

2. `lib/stripe.ts`
   - Line 29-33: leave `API_PRICING` paid-only. `STRIPE_API_PRICES` (line 23-27) stays paid-only. `validateStripeConfig` (line 38-48) unchanged. **Free tier is intentionally absent from Stripe** — there is no Stripe product for it.
   - Line 35: extend `StripeApiPlan` type? **No** — keep it as the three paid tiers since this type is only used in checkout/webhook contexts where free is invalid. This keeps `subscribe/route.ts:23`'s validation honest.

**Tests (new):**
- `__tests__/lib/api-keys.test.ts`: test `createApiKey` defaults to `'free'`; test the `MAX_FREE_KEYS_PER_USER = 1` cap (second free key creation should reject); test explicit `tier` argument paths.

### Phase 2: Signup auto-provisions a free API key

**Files to change:**

3. `app/api/auth/verify/route.ts` — after `verifyEmailCode(validatedEmail, code)` returns `result.success === true` (around line 43-50), and after the existing successful response is constructed, call `createApiKey(result.user.id, 'Default key', 'free')` inside a `try/catch`. Idempotency: if the user already has any active key, skip the create. Ignore errors silently — failing to create a key shouldn't block signup; user can always create one manually from the dashboard. Place the call BEFORE the `NextResponse.json(...)` return so any failure is logged but doesn't change the response shape.
4. `app/api/auth/register/route.ts`: do NOT create the key here (pre-verification). Wait for the verify endpoint so we don't create keys for unverified emails.

**Tests (new):**
- `__tests__/api/auth/verify.test.ts` (or wherever verification is tested): assert that successful verification creates exactly one free-tier API key and that re-verification doesn't create duplicates.

### Phase 3: Quota enforcement policy change for Free

**Files to change:**

5. `backend/services/api_auth.py:122-143` — `check_monthly_quota`. Change signature to accept `tier: str` (or look it up from the DB row). When `tier == 'free'` and `current_usage >= monthly_quota`, return `(allowed=False, current_usage, True)`. For all other tiers, keep current soft-flag behavior. Update the docstring/comment to reflect the policy split.

6. `backend/handlers/api.py` — wherever `check_monthly_quota` is consumed (lines 240-244 currently set headers when `is_overage`), add a 429 short-circuit if the function returns `allowed=False`. Use the existing `error_response` pattern with code `quota_exceeded`, message that explains the cap, and a suggestion pointing to the upgrade flow on the dashboard.

**Tests (new):**
- `backend/tests/test_api_handler.py` (or `test_api_auth.py`): test that a Free key at 25/25 usage gets 429 on the 26th file; test that a Starter key at 100/100 still gets 200 with `X-Api-Overage: true`.

### Phase 4: Stripe webhook — downgrade-to-Free

**Files to change:**

7. `app/api/webhooks/stripe/route.ts:183-202` (`customer.subscription.deleted` case). Replace the literal `'starter'` and the `API_TIERS['starter']` lookup with `'free'` and `API_TIERS['free']`. The query at line 193-198 becomes:

```ts
const freeTier = API_TIERS['free']
await execute(
  `UPDATE api_keys
   SET tier = 'free', monthly_quota = $1, rate_limit_rpm = $2, stripe_subscription_id = NULL
   WHERE id = $3`,
  [freeTier.monthly_quota, freeTier.rate_limit_rpm, apiKey.id]
)
```

The log message on line 199 should also change to `downgraded to free tier`.

**Tests (update):**
- `__tests__/api/webhooks/stripe.test.ts`: existing `customer.subscription.deleted` test currently asserts the result is `tier='starter'`. Change to `tier='free'` with the corresponding quota/rpm values. Add a separate test for the previous starter behavior only if any non-Free downgrade path remains (it doesn't — all paid tiers go to Free on cancel).

### Phase 5: Pricing page — four-column layout

**Files to change:**

8. `components/marketing/APIPricing.tsx`
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

   - Line 107: change grid from `md:grid-cols-3` to `md:grid-cols-4` and adjust `max-w-5xl` if it gets cramped (likely needs `max-w-6xl` or `max-w-7xl` — eyeball after building).
   - Below each non-popular tier card's button, add small "No credit card required" microcopy specifically for the Free card. Conditional on `tier.tier === 'free'`. Use `text-xs text-slate-500 mt-2 text-center`.
   - The CTA wiring at line 76-86 already calls `router.push('/signup')` for any tier — `'free'` flows through without changes. The signup page's existing `sessionStorage` lookup will treat `'free'` like any other tier; ensure the post-verification step that auto-creates the key reads this value and respects it (it should always be `'free'` for free-tier signups; paid tiers go through Stripe checkout from the dashboard, not the pricing page CTA — confirm this assumption when you hit Phase 2).

**Tests (new):**
- Add a render test for `APIPricing` that asserts four cards render and the Free card's CTA stores `'free'` in `sessionStorage` (existing tests likely use `@testing-library/react`).

### Phase 6: Dashboard tier display

**Files to change:**

9. `app/dashboard/developer/page.tsx` and `<ApiKeyManager />` component (find via grep). Confirm tier display handles `'free'` — it should, since it's just rendering whatever string is in the DB. Eyeball-check.
10. **Optional polish (defer if time-constrained)**: when a Free user is at ≥80% of their 25 cap, surface a banner above the API key list with "You've used N of 25 files. [Upgrade to Starter]" linking to `/pricing#pricing`. Pure UX; no functional consequence. Skip for MVP if it adds scope.

### Phase 7: Verification

11. Manual: create a fresh user, verify email, confirm a `'free'` API key appears in the dashboard. Hit `/v1/parse` 26 times with that key; the 26th should 429.
12. Manual: simulate a `customer.subscription.deleted` Stripe webhook (test mode); confirm the affected key's tier becomes `'free'` not `'starter'`.
13. Run full test suite: `pnpm test` (TypeScript) + `pytest backend/tests/` (Python). All green.

---

## 4. File-by-file change summary

| Phase | File | Change type | Lines affected |
|---|---|---|---|
| 1 | `lib/api-keys.ts` | Edit | Type union (line 6); `API_TIERS` (line 34-38); `createApiKey` signature/default (line 58-88); add `MAX_FREE_KEYS_PER_USER` constant |
| 1 | `__tests__/lib/api-keys.test.ts` | Edit | Add free-tier creation tests, free-key cap tests |
| 2 | `app/api/auth/verify/route.ts` | Edit | Auto-create one free key after successful `verifyEmailCode` |
| 2 | `__tests__/api/auth/verify.test.ts` (create if absent) | New / Edit | Assert auto-key creation; assert idempotency on re-verification |
| 3 | `backend/services/api_auth.py` | Edit | `check_monthly_quota` accepts tier, hard-blocks for `free` |
| 3 | `backend/handlers/api.py` | Edit | Short-circuit 429 when quota check returns `allowed=False` |
| 3 | `backend/tests/test_api_auth.py` | Edit | Test `free` hard-block; test paid soft-flag still works |
| 4 | `app/api/webhooks/stripe/route.ts` | Edit | `subscription.deleted` downgrades to `free` not `starter` |
| 4 | `__tests__/api/webhooks/stripe.test.ts` | Edit | Update assertion to `tier='free'` |
| 5 | `components/marketing/APIPricing.tsx` | Edit | Add Free tier object; grid `cols-3` → `cols-4`; "No credit card" microcopy |
| 5 | `__tests__/components/APIPricing.test.tsx` (path TBD) | New / Edit | Assert four-card render and free CTA wiring |
| 6 | `app/dashboard/developer/page.tsx` and `<ApiKeyManager />` | Eyeball | Confirm `'free'` renders correctly |

Total: ~6 production files, ~5 test files. Surgical per CLAUDE.md.

---

## 5. What could break

- **`StripeApiPlan` type vs `ApiTier` type drift.** Once `ApiTier` includes `'free'` but `StripeApiPlan` doesn't, any code that converts between them needs a guard. The conversion sites are `app/api/developer/subscribe/route.ts:20` (`tier?.toUpperCase() as StripeApiPlan`) and `app/api/webhooks/stripe/route.ts:111` (`apiTier.toUpperCase() as StripeApiPlan`). The subscribe route's existing `if (!STRIPE_API_PRICES[tier])` 400 will reject `'free'` — good, do not weaken. The webhook's M-3 price verification will fail for `'free'` since there's no expected price ID — but `'free'` should never appear in webhook metadata since you can't checkout for free. Add a defensive log+skip if `apiTier === 'free'` shows up in checkout webhook (would indicate metadata tampering or a bug).
- **The `MAX_FREE_KEYS_PER_USER = 1` check** must run inside the same transaction as the INSERT, or be a unique partial index. Current `createApiKey` does the count in a separate query (line 63-70). For Free, prefer adding a partial unique index: `CREATE UNIQUE INDEX api_keys_one_active_free_per_user ON api_keys(user_id) WHERE tier = 'free' AND is_active = true;` in a new migration `013_free_tier_constraints.sql`. The application-level check stays as a UX nicety with a clear error message, but the DB index is the real guarantee.
- **Auto-provisioned key at signup.** If verification can be retried or hit twice, the partial unique index above prevents duplicates at the DB level. Without it, a race could create two keys.
- **Existing soft-flag header behavior on paid tiers.** Phase 3 changes `check_monthly_quota` signature. Make sure every call site passes the new tier argument. There's only one call site (`backend/handlers/api.py:241`), but verify with grep.
- **Pricing page width at four columns.** At ~1024px viewport, four cards may feel cramped. The existing `max-w-5xl` is 1024px / 5rem. Consider `max-w-6xl` (72rem) or letting cards stack at `lg:grid-cols-4` while staying `md:grid-cols-2` on tablet.

---

## 6. Stripe Dashboard work

None required for the Free tier itself (no product, no price). Verify that:
- The four `STRIPE_API_PRICE_*` env vars (`STARTER`, `GROWTH`, `BUSINESS`) remain set; `validateStripeConfig` is unchanged.
- The webhook endpoint URL in Stripe Dashboard still points at `/api/webhooks/stripe` and the four event types in `app/api/webhooks/stripe/route.ts` are subscribed.

---

## 7. Test plan

**New tests:**

1. `lib/api-keys.test.ts`: `createApiKey` defaults to `'free'` with quota=25, rpm=10.
2. `lib/api-keys.test.ts`: second `createApiKey(userId, name, 'free')` for same user rejects with the cap message.
3. `lib/api-keys.test.ts`: `createApiKey(userId, name, 'starter')` still works post-checkout.
4. `__tests__/api/auth/verify.test.ts`: post-verification, exactly one active free key exists for the user.
5. `__tests__/api/auth/verify.test.ts`: re-running verification doesn't create a second key.
6. `backend/tests/test_api_auth.py`: `check_monthly_quota('<free-key>', 25)` at usage=25 returns `(False, 25, True)`.
7. `backend/tests/test_api_auth.py`: `check_monthly_quota('<starter-key>', 100)` at usage=100 returns `(True, 100, True)`.
8. `backend/tests/test_api_handler.py`: full request flow — Free key at quota gets 429 with `quota_exceeded` code.
9. `__tests__/api/webhooks/stripe.test.ts` (update): `customer.subscription.deleted` downgrades to `free` with the right quota/rpm.
10. `__tests__/components/APIPricing.test.tsx`: four cards render; clicking Free's CTA sets `sessionStorage['pending_api_tier'] = 'free'` and routes to `/signup`.

**Manual smoke:**

- Fresh signup → verify → dashboard shows one free key with correct quotas displayed.
- 26 sequential `/v1/parse` calls with that key → 26th returns 429.
- Stripe test-mode subscription cancel → DB `tier` flips to `'free'`.

---

## 8. Rollout

The change is small enough that a feature flag is overkill. Ship in one PR, but stage the order so each phase passes tests in isolation:

1. PR 1 (Phase 1): TypeScript types + `API_TIERS` + `createApiKey` default. No user-visible change yet.
2. PR 2 (Phase 3 + Phase 4): backend quota policy + webhook downgrade target. No user-visible change unless someone has a canceled subscription mid-deploy.
3. PR 3 (Phase 2): signup auto-provisions a free key. Now Free tier is live for new signups but invisible.
4. PR 4 (Phase 5 + Phase 6): pricing page UI. Public announcement.

Or: ship as a single PR if the diff is reviewable. Up to whoever's reviewing.

---

## 9. Out of scope (intentionally deferred)

- Persistent / cross-Lambda rate limiting (Redis, DynamoDB-based limiter). The in-memory `_rpm_tracker` is documented as MVP-acceptable and Free tier doesn't change that calculus.
- Upgrade-nudge emails when a Free user hits 80% / 100% of quota. Reach for this in the post-launch retention work.
- Free-tier abuse detection (multi-account signups for unlimited free usage). Watch the data; tackle if it shows up.
- Backfilling existing Starter keys without subscriptions to Free. Don't change paid promises retroactively.
- Renaming the README's mentions of "Free / Pro / Premium" tiers (the Gemini-based aspirational doc). Separate doc-cleanup task.

---

## 10. Pricing page mockup reference

The four-column layout mockup was rendered earlier in the conversation that produced this plan. Key elements:

- Order: **Free** (leftmost), Starter, **Growth (Most popular)**, Business.
- Free card: $0/month, the five-feature list above, "Start Free" CTA, "No credit card required" microcopy below the button.
- Growth card retains its purple highlight and "POPULAR" badge per existing component.
- All other tier cards unchanged.

---

## 11. Verification checklist (before merging)

- [ ] `pnpm test` green (TypeScript)
- [ ] `pytest backend/tests/` green (Python)
- [ ] Fresh signup creates exactly one `'free'` API key
- [ ] 26th `/v1/parse` call on a Free key returns 429
- [ ] 101st call on a Starter key returns 200 with `X-Api-Overage: true` (regression check)
- [ ] Stripe test-mode subscription cancellation downgrades the key to `'free'`, not `'starter'`
- [ ] Pricing page renders four cards at desktop, two at tablet, one at mobile
- [ ] "Start Free" CTA from pricing page lands on signup, then on dashboard with a working free key
- [ ] No mentions of `'starter'` as a default fallback remain in `lib/api-keys.ts` or the webhook handler
- [ ] No new `npm` or `pip` dependencies were added

---

## Appendix: Free tier spec (for reference)

| Property | Value |
|---|---|
| Name | Free |
| Price | $0 / month |
| Files | 25 / month (hard cap, returns 429 at limit) |
| Rate limit | 10 requests / minute (in-memory, per Lambda) |
| Exchanges | All 14 |
| Bank PDF parsing | **Not included** (Growth+ only) |
| Output formats | JSON only |
| Auto-detection | Yes |
| Support | Community / docs only |
| Credit card required | No |
| Duration | Indefinite (not a trial) |
| Keys per user | 1 active free key (paid tier unlocks default 5) |
| Behavior on paid subscription cancel | Key downgrades to Free, stays usable |
