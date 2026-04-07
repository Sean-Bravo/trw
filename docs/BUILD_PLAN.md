# TaxFormatter — Build Plan

> **Created:** 2026-03-23
> **Completed:** 2026-03-24
> **Phases:** 4 (Stripe → API → MCP → SDKs)
> **Commits:** 7

---

## Overview

All 4 phases complete. The product is hardened and packaged for launch.

| # | Phase | Goal | Status | Commit |
|---|-------|------|--------|--------|
| 1 | **Stripe Billing** | Real keys, products, payment failure handling | Done | `509eaa0` |
| 2 | **REST API Polish** | Bug fixes, request IDs, validation | Done | `c351d0c` |
| 3 | **MCP Server** | npm publish-ready `@taxformatter/mcp-server` | Done | `eab3f4e` |
| 4 | **SDKs** | `@taxformatter/sdk` (Node) + `taxformatter` (Python) | Done | `9d3f37c` |

---

## Phase 1: Stripe Billing — Production Ready

### Step 1.1 — Stripe product/price setup _(skipped — products created manually in Dashboard)_

Products created in Stripe Dashboard (Mar 19):
- TaxFormatter API — Starter: $29/mo
- TaxFormatter API — Growth: $99/mo
- TaxFormatter API — Business: $249/mo

Price IDs set in Vercel as `STRIPE_API_PRICE_STARTER`, `STRIPE_API_PRICE_GROWTH`, `STRIPE_API_PRICE_BUSINESS`.

### Step 1.2 — Env var validation

- [x] `lib/stripe.ts` — lazy `getApiPrice(tier)` throws if env var missing
- [x] `validateStripeConfig()` checks all 5 required Stripe env vars

### Step 1.3 — DB migration: stripe_customer_id

- [x] `db/migrations/007_add_stripe_customer_id.sql` — run against Neon
- [x] `stripe_customer_id text UNIQUE` column + index on `users` table

### Step 1.4 — Fix customer portal lookup

- [x] `app/api/customer-portal/route.ts` — DB lookup on `users.stripe_customer_id`
- [x] Fallback: creates Stripe customer, persists ID to DB
- [x] Returns portal URL pointing to `/dashboard/developer`

### Step 1.5 — Add idempotency key to checkout

- [x] `app/api/developer/subscribe/route.ts` — `idempotencyKey: checkout_${userId}_${apiKeyId}_${tier}`

### Step 1.6 — Webhook hardening

- [x] Event idempotency — in-memory `Set<string>` (capped at 10k), returns `{ received: true, duplicate: true }`
- [x] `invoice.payment_failed` — disables API key (`is_active = false`)
- [x] `invoice.payment_succeeded` — re-enables API key (`is_active = true`)
- [x] `checkout.session.completed` — persists `stripe_customer_id` to `users` table
- [x] Webhook registered: `https://taxformatter.com/api/webhooks/stripe` (7 events)

### Step 1.7 — Success UX after checkout

- [x] `ApiKeyManager.tsx` reads `?upgraded=true`, shows success banner, cleans URL

### Step 1.8 — Update STRIPE_SETUP.md

- [x] `docs/STRIPE_SETUP.md` fully rewritten for API-only billing
- [x] Documents all 7 webhook events, env vars, checkout flow, customer portal

### Step 1.9 — Tests

- [x] All webhook + subscribe tests passing
- [x] Tests for `invoice.payment_failed` / `invoice.payment_succeeded` / event dedup added

### Additional (Phase 1 pre-work, 2026-03-23)

- [x] Consumer tiers removed (Pro $9, Premium $19) — commit `c94b55c`
- [x] `subscriptionTier` removed from session, JWT, auth-db, types
- [x] Pricing page switched to `APIPricing` component
- [x] Consumer checkout returns 410 Gone
- [x] Tailwind canonical class warnings fixed across 7+ files
- [x] Vercel env vars configured: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, 3 price IDs

### Stripe env vars in Vercel

| Var | Scope |
|-----|-------|
| `STRIPE_SECRET_KEY` | All Environments |
| `STRIPE_PUBLISHABLE_KEY` | All Environments |
| `STRIPE_WEBHOOK_SECRET` | All Environments |
| `STRIPE_API_PRICE_STARTER` | Production |
| `STRIPE_API_PRICE_GROWTH` | Production |
| `STRIPE_API_PRICE_BUSINESS` | Production |

---

## Phase 2: REST API Polish

### Step 2.1 — Add X-Request-Id header

- [x] `backend/handlers/api.py` — `uuid4()` generated at top of `handler()`
- [x] `X-Request-Id` header on every response (including OPTIONS, health, errors)
- [x] Passed to `record_request()` calls
- [x] `db/migrations/008_add_request_id.sql` — `request_id text` column on `api_requests`
- [x] Migration run against Neon

### Step 2.2 — Fix retry_after_seconds metadata overwrite bug

- [x] `error_response()` line 56: `body.setdefault("metadata", {})["api_version"] = API_VERSION`
- [x] `extra.metadata` (e.g., `retry_after_seconds`) no longer overwritten

### Step 2.3 — Add Retry-After header on 429

- [x] `Retry-After: 60` header injected on 429 responses

### Step 2.4 — Input validation on /v1/parse

- [x] Filename length check (max 255 chars) → 400 error
- [x] Unknown top-level keys logged but not rejected (forward compatibility)

### Step 2.5 — Tests

- [x] 51/51 API handler + auth tests passing

---

## Phase 3: MCP Server — npm Publish Ready

### Step 3.1 — Rewrite client.ts

- [x] Configurable base URL: `TAXFORMATTER_API_URL` env var or constructor option
- [x] Fetch timeout via `AbortController` (30s default)
- [x] Non-200 throws `TaxFormatterError` with code, statusCode, suggestion
- [x] `getUsage()` method added

### Step 3.2 — Fix Windows path bug

- [x] `basename()` from `path` replaces `filePath.split('/').pop()`
- [x] `fs.access()` check before `readFile()` — throws "File not found" on missing files

### Step 3.3 — Export types from package

- [x] `index.ts` exports `TaxFormatterClient`, `TaxFormatterError`, `ClientOptions`
- [x] Type exports: `ParseResponse`, `SourcesResponse`, `UsageResponse`

### Step 3.4 — Add UsageResponse type

- [x] `UsageResponse` interface added to `types.ts`

### Step 3.5 — Package metadata

- [x] `package.json` — `repository`, `bugs`, `homepage`, `author`, `prepublishOnly`

### Step 3.6 — Add LICENSE + CHANGELOG

- [x] `packages/mcp-server/LICENSE` (MIT)
- [x] `packages/mcp-server/CHANGELOG.md` (v0.1.0)

### Step 3.7 — Update README

- [x] Configuration table with `TAXFORMATTER_API_URL`
- [x] Programmatic usage example
- [x] Error handling section

### Step 3.8 — Tests

- [x] 19/19 MCP server tests passing
- [x] `npm run build` — clean TypeScript build
- [x] `npm pack --dry-run` — 5.9kB tarball, 12 files

---

## Phase 4: SDKs — Node + Python

### Step 4.1 — Node SDK: `@taxformatter/sdk`

- [x] `packages/sdk-node/` — full package created
- [x] `TaxFormatter` class: `parse`, `listSources`, `getUsage`, `health`
- [x] Accepts file path (`string`) or `Buffer`
- [x] Base64 encoding handled internally
- [x] Auto-retry on 429 with exponential backoff (max 3)
- [x] Configurable: `baseUrl`, `timeout`, `maxRetries`
- [x] Typed errors: `AuthenticationError` (401), `RateLimitError` (429), `ParseError` (422)
- [x] Zero runtime deps, Node 18+
- [x] 17/17 tests passing
- [x] `npm pack` — 6.7kB tarball

### Step 4.2 — Python SDK: `taxformatter`

- [x] `packages/sdk-python/` — full package created
- [x] `TaxFormatter` class: `parse`, `list_sources`, `get_usage`, `health`
- [x] Accepts file path (`str`/`Path`) or `bytes`
- [x] Base64 encoding handled internally
- [x] Auto-retry on 429 with exponential backoff (max 3)
- [x] Configurable: `base_url`, `timeout`, `max_retries`
- [x] Typed errors + TypedDict response types
- [x] Python 3.8+, single dep (`requests`)
- [x] 19/19 tests passing
- [x] `pip install -e .` — clean install

---

## Remaining (not in original plan)

- [ ] Google OAuth redirect URI — add `https://taxformatter.com/api/auth/callback/google` in Google Cloud Console
- [ ] Stripe branding — upload logo/icon in Stripe Dashboard > Business settings
- [ ] npm publish `@taxformatter/mcp-server` and `@taxformatter/sdk`
- [ ] PyPI publish `taxformatter`
- [ ] Live Stripe checkout test (real card, then refund)

---

## Files Changed (all phases)

### Modified
| File | Phase |
|------|-------|
| `lib/stripe.ts` | 1 |
| `app/api/webhooks/stripe/route.ts` | 1 |
| `app/api/developer/subscribe/route.ts` | 1 |
| `app/api/customer-portal/route.ts` | 1 |
| `components/dashboard/ApiKeyManager.tsx` | 1 |
| `app/dashboard/settings/SettingsClient.tsx` | 1 |
| `docs/STRIPE_SETUP.md` | 1 |
| `backend/handlers/api.py` | 2 |
| `backend/services/api_auth.py` | 2 |
| `packages/mcp-server/src/client.ts` | 3 |
| `packages/mcp-server/src/tools.ts` | 3 |
| `packages/mcp-server/src/index.ts` | 3 |
| `packages/mcp-server/src/types.ts` | 3 |
| `packages/mcp-server/package.json` | 3 |
| `packages/mcp-server/README.md` | 3 |

### Created
| File | Phase |
|------|-------|
| `db/migrations/007_add_stripe_customer_id.sql` | 1 |
| `db/migrations/008_add_request_id.sql` | 2 |
| `packages/mcp-server/LICENSE` | 3 |
| `packages/mcp-server/CHANGELOG.md` | 3 |
| `packages/sdk-node/*` (11 files) | 4 |
| `packages/sdk-python/*` (10 files) | 4 |
