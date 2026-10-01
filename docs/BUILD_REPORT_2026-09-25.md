# Build Report — Pricing-Page Checkout P0 and Strategic Report Revision

**Date:** 2026-09-25
**Scope:** working tree on `docs/build-report-2026-09-09` @ `f4a566d` (4 files changed, +195 / −24, **uncommitted** at time of writing)
**Trigger:** Launch-hardening item P0 from the strategic report — "payment → entitlement correctness; the reported `createApiKey()` path hardcodes `tier='free'`." Traced end to end before anything was changed.
**Methodology:** Every claim below was verified against the code in this checkout (`grep`, file reads, `git log -S` for commit dating) and against the running Jest suite. The fix was applied only after the plan was presented and approved per `CLAUDE.md`. The new tests were run against the *pre-fix* source to confirm they fail (6/6 red) before being run against the fix (6/6 green).

---

## Executive Summary

| Item | Result |
| ---- | ------ |
| **Reported bug** ("paid customer can receive free-tier behavior") | Root cause found; the real failure is worse — see headline |
| **Files changed** | 4 (1 route, 1 component, 2 test files) |
| **Tests added** | 6 (all fail on old code, pass on fix) |
| **Full Jest suite** | 57 suites / **895 passed**, 0 failed |
| **Typecheck / lint** | `tsc --noEmit` clean; ESLint 0 errors (pre-existing `any` warnings only) |
| **Strategic report** | Revised to rev. 2026-09-25: Opus 5.5 folded in, timeline re-baselined |

### Headline

**Nobody arriving from the pricing page could reach Stripe checkout.** Three commits, each correct on its own, interact so that the auto-subscribe flow always hits the one-free-key cap and 409s before checkout starts. Every signup that selected a paid tier on the pricing page since 2026-05-03 has ended on an error banner in the dashboard instead of at Stripe. The fix moves key resolution server-side into `/api/developer/subscribe`.

---

## 1. Trace: how tier actually flows

The premise in the strategic report ("`createApiKey()` hardcodes `tier='free'` regardless of subscription") turned out to be intended behavior, not the bug.

- **Tier lives on the API key row**, not on the user: `api_keys.tier` (`lib/api-keys.ts:6-24`, migration `006`). This is by design — `docs/PLAN_FREE_TIER_V3.md` line 293 states that `createApiKey(userId, name)` defaulting to `'free'` is the "intended behavior for users hitting 'Generate API key' without going through Stripe checkout."
- **Checkout binds a subscription to one key.** `app/api/developer/subscribe/route.ts` puts `api_key_id` and `api_tier` in both session and subscription metadata, after the H-1 ownership check.
- **The webhook upgrades that key.** `app/api/webhooks/stripe/route.ts` on `checkout.session.completed` cross-verifies the Stripe price against the claimed tier (M-3), re-verifies ownership, then `UPDATE api_keys SET tier=…, monthly_quota=…, rate_limit_rpm=…, stripe_subscription_id=… WHERE id = api_key_id`.
- **Enforcement reads the same row.** `backend/services/api_auth.py::validate_key` selects `tier, rate_limit_rpm, monthly_quota` from `api_keys` by key hash.

That chain is sound. A key that goes through checkout gets the paid tier.

## 2. The actual P0

### 2.1 Three commits that collide

| Commit | Date | What it added |
| ------ | ---- | ------------- |
| `b02079f` | 2026-03-19 | Pricing CTA → signup → `pending_api_tier` cookie → dashboard **auto-subscribe creates a new key**, then calls `/subscribe` with its id (`components/dashboard/ApiKeyManager.tsx`) |
| `f8eadfe` | 2026-05-03 | Verify route **auto-provisions a free "Default key"** for every new user (`app/api/auth/verify/route.ts`, D3) |
| `f8eadfe` | 2026-05-03 | **One active free key per user** cap in `createApiKey()` (`lib/api-keys.ts`, D2) plus partial unique index in migration `013` |

### 2.2 Reproduction (pre-fix)

1. Pick Growth on the pricing page → `/signup` → cookie `pending_api_tier=growth` set.
2. `/verify` → server auto-provisions `Default key` (`tier='free'`, active).
3. Redirect to `/dashboard/developer` → `ApiKeyManager` mounts → auto-subscribe effect fires.
4. `POST /api/developer/keys { name: 'My API Key' }` → `createApiKey(user, 'My API Key')` → tier defaults to `'free'` → free-key cap → **409 `Only one active free API key per user`**.
5. Client `throw`s → error banner. `/api/developer/subscribe` is never called. No Stripe session exists.

The login path (`app/login/page.tsx`) sets the same cookie and fails the same way for any returning user who already has a key — which is every verified user.

### 2.3 Why existing tests missed it

- `__tests__/api/developer/keys.test.ts` mocks `createApiKey`, so the cap never fires.
- `__tests__/components/dashboard/ApiKeyManager.test.tsx` mocks `fetch` and had no auto-subscribe case at all.
- `__tests__/api/webhooks/stripe.test.ts` covers the upgrade path from a well-formed event onward — correct, but downstream of the break.

## 3. Fix

Two options were considered. **A** (client-side: reuse an existing free key from the already-fetched list) was rejected because it leaves a billing-critical decision in the browser. **B** (server-side resolution) was chosen and approved.

### 3.1 `app/api/developer/subscribe/route.ts`

`apiKeyId` is now optional. When omitted, the route selects the user's oldest active free key; if none exists, it calls `createApiKey(userId, 'My API Key', 'free')`. The resolved key then goes through the unchanged H-1 ownership check, metadata, idempotency key, and Stripe call.

```ts
if (!apiKeyId) {
  const freeKey = await queryOne<{ id: string }>(
    `SELECT id FROM api_keys
     WHERE user_id = $1 AND tier = 'free' AND is_active = true
     ORDER BY created_at ASC
     LIMIT 1`,
    [session.user.id],
  );
  apiKeyId = freeKey ? freeKey.id : (await createApiKey(session.user.id, 'My API Key', 'free')).id;
}
```

Upgrading the auto-provisioned Default key is exactly what D3 intended; the key keeps its name.

### 3.2 `components/dashboard/ApiKeyManager.tsx`

The auto-subscribe effect no longer `POST`s `/api/developer/keys` first. It calls `/api/developer/subscribe` with `{ tier }` only. Error handling is unchanged.

### 3.3 Tests

**`__tests__/api/developer/subscribe.test.ts`** — replaced the obsolete "400 when `apiKeyId` is missing" case with a describe block, `apiKeyId omitted (pricing-page auto-subscribe)`:

1. Upgrades the existing active free key; `createApiKey` **not** called; metadata and idempotency key carry that key's id.
2. Creates a free key when the user has none, then checks out against it.
3. Still enforces H-1 on the resolved key (403, no Stripe call).
4. Returns 500 with no partial checkout when key creation throws.

`beforeEach` now `mockReset()`s `queryOne` and `createApiKey` so sequenced `mockResolvedValueOnce` queues cannot leak across cases.

**`__tests__/components/dashboard/ApiKeyManager.test.tsx`** — new describe block, `Auto-subscribe (pending_api_tier cookie)`:

5. Starts checkout with the tier only and never `POST`s a new key first; the mock returns the old 409 on any key-create call as a regression guard; cookie is cleared.
6. Surfaces the server error when checkout cannot start.

### 3.4 Verification

| Check | Result |
| ----- | ------ |
| New tests vs. **old** source | 6 failed / 26 passed (the 6 are exactly the new cases) |
| New tests vs. fix | 32 / 32 in the two touched suites |
| Full suite `npx jest` | 57 suites, 895 tests, 0 failures, 13.6 s |
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` on the 4 files | 0 errors, 16 warnings (all pre-existing `@typescript-eslint/no-explicit-any`) |

Tests ran in a Linux container from a source tarball plus `npm ci`, because the macOS `node_modules` carries the darwin SWC binary and `next/jest` cannot load it inside the Cowork sandbox. **Run `npm test` locally once before committing** to see the same result on the Mac.

Suggested commit message:

```
fix: resolve API key server-side in /subscribe so pricing-page checkout survives the one-free-key cap
```

## 4. Found, not fixed (flagged for follow-up)

| # | Finding | Where | Why deferred |
| - | ------- | ----- | ------------ |
| 1 | A paid user's additional keys are always `'free'` and capped at one, so Business effectively gets 1 paid + 1 free key. D2 says "paid tier unlocks default 5." | `lib/api-keys.ts:43-44,80-92`; `app/api/developer/keys/route.ts:61` | Product decision (per-key vs. per-account entitlement), not a bug fix |
| 2 | No key rotation for paid keys. Rotate = create (free) + revoke (paid) while the subscription stays bound to the revoked key. | no `rotate` function or endpoint exists | New feature; needs a subscription re-bind path in the webhook model |
| 3 | If `createApiKey` throws inside `/subscribe` (e.g. 5-key max), the user sees the generic "Failed to create checkout session" 500. | `app/api/developer/subscribe/route.ts` catch block | Edge case; a 409 mapping like `keys/route.ts:71` would be a small follow-up |
| 4 | API docs tier table still names Gemini 2.5 Flash / Claude Sonnet 4.6 / Claude Opus 4.7; pricing page already uses outcome labels. Legacy consumer "Pro $49/year" docs page still live. | `taxformatter.com/docs/api`, `/docs/understanding-your-results/free-vs-pro-differences` | Copy; tracked as P1 "Pricing and tier consistency" in the strategic report |
| 5 | `.claude/` is untracked and contains two old worktrees with their own `__tests__`; Jest's `testMatch` will collect them if the directory is present. | `jest.config.js` `testPathIgnorePatterns` | One-line `'/.claude/'` entry; not touched to keep this change single-concern |
| 6 | Temp tarball `.claude/tmp/_to_delete_trw-src.tgz` (3.6 MB) created to move source to the test container. | `.claude/tmp/` | Sandbox cannot delete; trash manually |

## 5. Strategic report revision (outside the repo)

`TaxFormatter_Strategic_Product_Report_20260925.pdf` (16 pages) supersedes the 2026-09-01 revision.

- **Model landscape.** Claude Fable 5.1 (2026-09-01) remains the newest Fable. Claude Opus 5.5 shipped 2026-09-22 at $4 / $20 per MTok ($0.20 cache reads), positioned by Anthropic as matching Fable 5.1 on most work at ~40 % lower cost than Opus 5.
- **Insights ladder recommendation changed.** Business: Opus 4.7 → **Opus 5.5** (better and ~20 % cheaper than the incumbent; clears the $0.12/call rule uncached at ~$0.06). Growth: Sonnet 4.6 → Sonnet 5. Fable 5.1 becomes the premium ceiling — shadow benchmark, shipped only as an add-on if it earns 2.5× the price. Both new models reject forced `tool_choice` and return refusals as HTTP 200 `stop_reason: "refusal"`; both are handled in the adoption sequence.
- **Timeline re-baselined** (Sept 2 review did not occur): launch hardening through **Oct 9**, observation through **Nov 6**, watch-list review **Nov 9**. A "Season missed" risk row was added; Jan–Apr crypto-tax search is the real deadline.
- **Verified against the live site:** pricing page no longer names models (done); API docs still do (open, §4 item 4).

## 6. Launch-hardening status after today

| P0 / P1 item (strategic report §3) | Status |
| ---------------------------------- | ------ |
| Payment → entitlement correctness | **Fixed in working tree** (this report §3); commit + `npm test` locally pending |
| Supported-bank truthfulness (source registry vs. public claims) | Not started — next |
| Retention consistency | Not started |
| API-key wording (TaxFormatter keys vs. exchange credentials) | Not started |
| Pricing and tier consistency | Pricing page done; API docs + legacy Pro page open |
| Security/location claims | Not started |
| Third-party model names | Pricing page done; docs open |
| Sticky-header rendering | Covered by the 2026-09-09 audit (see that report) |
