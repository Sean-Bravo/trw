# TaxFormatter — Build Plan

> **Date:** 2026-03-23
> **Status:** Ready to execute
> **Phases:** 4 (Stripe → API → MCP → SDKs)
> **Est. commits:** 10-14

---

## Overview

The core product works. What remains is hardening and packaging for launch:

| # | Phase | Goal | Status |
|---|-------|------|--------|
| 1 | **Stripe Billing** | Real keys, products, payment failure handling | ~95% done |
| 2 | **REST API Polish** | Bug fixes, request IDs, validation | ~90% done |
| 3 | **MCP Server** | npm publish-ready `@taxformatter/mcp-server` | ~90% done |
| 4 | **SDKs** | `@taxformatter/sdk` (Node) + `taxformatter` (Python) | 0% — new |

**Sequencing:** Phases 1-3 are independent. Phase 4 depends on Phase 2.

---

## Phase 1: Stripe Billing — Production Ready

### Step 1.1 — Stripe product/price setup script

- [ ] Create `scripts/stripe-setup.ts`
- [ ] Run: `npx tsx scripts/stripe-setup.ts` (requires `STRIPE_SECRET_KEY`)
- [ ] Creates 3 products + 3 recurring monthly prices via Stripe API
- [ ] Uses `metadata.tier_id` for idempotent lookups (safe to re-run)
- [ ] Prints env vars to copy into Vercel:
  ```
  STRIPE_API_PRICE_STARTER=price_xxx
  STRIPE_API_PRICE_GROWTH=price_xxx
  STRIPE_API_PRICE_BUSINESS=price_xxx
  ```

### Step 1.2 — Env var validation

- [ ] Modify `lib/stripe.ts`
- [ ] Replace fallback `'price_api_starter'` strings with lazy `getApiPrice(tier)` that throws if env var missing
- [ ] Add exported `validateStripeConfig()` → `{ valid: boolean, missing: string[] }`

### Step 1.3 — DB migration: stripe_customer_id

- [ ] Create `db/migrations/007_add_stripe_customer_id.sql`
  ```sql
  ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE;
  CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
  ```
- [ ] Run migration against Neon

### Step 1.4 — Fix customer portal lookup

- [ ] Modify `app/api/customer-portal/route.ts`
- [ ] Replace `stripe.customers.list({ email })` with DB lookup on `users.stripe_customer_id`
- [ ] Fallback: create customer via Stripe API, persist ID to DB
- [ ] Remove the `// TODO: Get customer ID from your database` comment

### Step 1.5 — Add idempotency key to checkout

- [ ] Modify `app/api/developer/subscribe/route.ts`
- [ ] Pass idempotency key to `stripe.checkout.sessions.create()`:
  ```ts
  { idempotencyKey: `checkout_${userId}_${apiKeyId}_${tier}` }
  ```

### Step 1.6 — Webhook hardening

- [ ] Modify `app/api/webhooks/stripe/route.ts`

**A) Event idempotency:**
- [ ] Add in-memory `Set<string>` for processed `event.id`s (capped at 10k)
- [ ] Return `{ received: true, duplicate: true }` on repeat events

**B) New event — `invoice.payment_failed`:**
- [ ] Look up api_key by `stripe_subscription_id`
- [ ] Set `is_active = false` (disables the key)

**C) New event — `invoice.payment_succeeded`:**
- [ ] Re-enable api_key (`is_active = true`) by `stripe_subscription_id`

**D) Persist stripe_customer_id:**
- [ ] In `checkout.session.completed`, save `session.customer` → `users.stripe_customer_id`

### Step 1.7 — Success UX after checkout

- [ ] Modify `components/dashboard/ApiKeyManager.tsx`
- [ ] Read `?upgraded=true` from URL params on mount
- [ ] Show success banner: "Subscription activated! Your API key has been upgraded."
- [ ] Clean URL via `window.history.replaceState()`

### Step 1.8 — Update STRIPE_SETUP.md

- [ ] Modify `docs/STRIPE_SETUP.md`
- [ ] Remove consumer pricing references (Pro/Premium one-time)
- [ ] Document API-only tiers (Starter $29 / Growth $99 / Business $249)
- [ ] Reference `scripts/stripe-setup.ts`
- [ ] Update webhook event list

### Step 1.9 — Tests

- [ ] Verify existing 11 webhook + 12 subscribe tests pass
- [ ] Add 2 tests: `invoice.payment_failed` / `invoice.payment_succeeded`
- [ ] Add 1 test: duplicate event idempotency
- [ ] Manual: `stripe trigger invoice.payment_failed` via Stripe CLI
- [ ] Commit: `feat: production Stripe billing with webhook hardening`

---

## Phase 2: REST API Polish

### Step 2.1 — Add X-Request-Id header

- [ ] Modify `backend/handlers/api.py`
- [ ] Generate `uuid4()` at top of `handler()`
- [ ] Include `X-Request-Id` header on every response
- [ ] Pass to `record_request()` calls
- [ ] Create `db/migrations/008_add_request_id.sql`:
  ```sql
  ALTER TABLE api_requests ADD COLUMN IF NOT EXISTS request_id text;
  ```
- [ ] Run migration

### Step 2.2 — Fix retry_after_seconds metadata overwrite bug

- [ ] Modify `backend/handlers/api.py` line 56
- [ ] **Current (broken):** `body["metadata"] = {"api_version": API_VERSION}` — overwrites `extra.metadata`
- [ ] **Fix:** `body.setdefault("metadata", {})["api_version"] = API_VERSION`
- [ ] Update test in `test_api_handler.py` to assert `retry_after_seconds` is present in 429 body

### Step 2.3 — Add Retry-After header on 429

- [ ] Modify `backend/handlers/api.py` around line 488
- [ ] After building the rate-limit error response, inject `Retry-After: 60` header

### Step 2.4 — Input validation on /v1/parse

- [ ] Modify `backend/handlers/api.py` in `handle_v1_parse()`
- [ ] Add filename length check (max 255 chars) → 400 error
- [ ] Log unknown top-level keys (don't reject — forward compatibility)

### Step 2.5 — Tests

- [ ] Verify existing 46 handler + 22 auth tests pass
- [ ] Fix the `retry_after_seconds` assertion in existing test
- [ ] Add 1 test: `X-Request-Id` header present on all responses
- [ ] Add 1 test: filename > 255 chars rejected
- [ ] Commit: `fix: API request IDs, retry_after bug, input validation`

---

## Phase 3: MCP Server — npm Publish Ready

### Step 3.1 — Rewrite client.ts

- [ ] Modify `packages/mcp-server/src/client.ts`
- [ ] Add configurable base URL: `process.env['TAXFORMATTER_API_URL'] || 'https://api.taxformatter.com'`
- [ ] Add fetch timeout via `AbortController` (30s default)
- [ ] Handle non-200: throw `TaxFormatterError` with code, status, suggestion
- [ ] Export `TaxFormatterError` class
- [ ] Add `getUsage()` method

### Step 3.2 — Fix Windows path bug

- [ ] Modify `packages/mcp-server/src/tools.ts`
- [ ] Replace `filePath.split('/').pop()` (lines 84, 128) with `basename()` from `path`
- [ ] Add file existence check via `fs.access()` before `readFile()`

### Step 3.3 — Export types from package

- [ ] Modify `packages/mcp-server/src/index.ts`
- [ ] Add: `export type { ParseResponse, SourcesResponse, UsageResponse } from './types.js'`
- [ ] Add: `export { TaxFormatterClient, TaxFormatterError } from './client.js'`

### Step 3.4 — Add UsageResponse type

- [ ] Modify `packages/mcp-server/src/types.ts`
- [ ] Add `UsageResponse` interface matching `/v1/usage` response shape

### Step 3.5 — Package metadata

- [ ] Modify `packages/mcp-server/package.json`
- [ ] Add: `repository`, `bugs`, `homepage`, `author`
- [ ] Add: `"prepublishOnly": "npm run build"` script

### Step 3.6 — Add LICENSE + CHANGELOG

- [ ] Create `packages/mcp-server/LICENSE` (MIT, Copyright 2026 TaxFormatter)
- [ ] Create `packages/mcp-server/CHANGELOG.md` (v0.1.0 initial release)

### Step 3.7 — Update README

- [ ] Modify `packages/mcp-server/README.md`
- [ ] Fix dashboard URL
- [ ] Document `TAXFORMATTER_API_URL` env var
- [ ] Add error handling section
- [ ] Add programmatic usage example

### Step 3.8 — Tests

- [ ] Verify existing 14 tests in `__tests__/packages/mcp-server/` pass
- [ ] Add in-package tests: `packages/mcp-server/__tests__/client.test.ts` (~8 tests)
- [ ] Verify: `cd packages/mcp-server && npm run build && npm pack` → clean tarball
- [ ] Commit: `feat: MCP server publish-ready with error handling and types`

---

## Phase 4: SDKs — Node + Python

### Step 4.1 — Node SDK: `@taxformatter/sdk`

**Create `packages/sdk-node/` with:**

- [ ] `package.json` — v0.1.0, MIT, zero runtime deps, Node 18+
- [ ] `tsconfig.json`
- [ ] `src/index.ts` — re-exports everything
- [ ] `src/client.ts` — `TaxFormatter` class:
  ```ts
  const tf = new TaxFormatter('tf_live_xxx');
  const result = await tf.parse('./coinbase_2024.csv');
  const result = await tf.parse(buffer, 'coinbase.csv', { outputFormat: 'turbotax' });
  const sources = await tf.listSources();
  const usage = await tf.getUsage();
  ```
  - Accepts file path or Buffer
  - Base64 encoding handled internally
  - Auto-retry on 429 with exponential backoff (max 3)
  - Configurable: `baseUrl`, `timeout`, `maxRetries`
- [ ] `src/types.ts` — `ParseResponse`, `SourcesResponse`, `UsageResponse`, `HealthResponse`, `ParseOptions`, `ClientOptions`
- [ ] `src/errors.ts`:
  - `TaxFormatterError` (base — code, statusCode, suggestion)
  - `AuthenticationError` (401)
  - `RateLimitError` (429)
  - `ParseError` (422)
- [ ] `__tests__/client.test.ts` — ~15 tests with mocked fetch
- [ ] `README.md`, `LICENSE`, `CHANGELOG.md`

**Verify:**
- [ ] `cd packages/sdk-node && npm test` — all tests pass
- [ ] `npm run build && npm pack` — clean tarball

### Step 4.2 — Python SDK: `taxformatter`

**Create `packages/sdk-python/` with:**

- [ ] `pyproject.toml` — hatchling build, Python >=3.8, deps: `requests>=2.28`
- [ ] `taxformatter/__init__.py` — exports `TaxFormatter` + error classes
- [ ] `taxformatter/client.py` — `TaxFormatter` class:
  ```python
  tf = TaxFormatter('tf_live_xxx')
  result = tf.parse('./coinbase_2024.csv')
  result = tf.parse(raw_bytes, filename='coinbase.csv', output_format='turbotax')
  sources = tf.list_sources()
  usage = tf.get_usage()
  ```
  - Accepts file path, `Path`, or bytes
  - Base64 encoding handled internally
  - Auto-retry on 429 with exponential backoff (max 3)
  - Configurable: `base_url`, `timeout`, `max_retries`
- [ ] `taxformatter/types.py` — TypedDict definitions for all responses
- [ ] `taxformatter/errors.py`:
  - `TaxFormatterError` (base — code, status_code, suggestion)
  - `AuthenticationError` (401)
  - `RateLimitError` (429)
  - `ParseError` (422)
- [ ] `tests/test_client.py` — ~15 tests with `unittest.mock.patch`
- [ ] `README.md`, `LICENSE`, `CHANGELOG.md`

**Verify:**
- [ ] `cd packages/sdk-python && python -m pytest` — all tests pass
- [ ] `pip install -e .` — installs cleanly

### Step 4.3 — Commit

- [ ] Commit: `feat: add Node and Python SDKs`

---

## Final Verification Checklist

After all 4 phases:

- [ ] `npm test` — all frontend tests pass
- [ ] `cd backend && python -m pytest` — all API tests pass
- [ ] `cd packages/mcp-server && npm run build && npm pack` — clean tarball
- [ ] `cd packages/sdk-node && npm test && npm pack` — clean tarball
- [ ] `cd packages/sdk-python && python -m pytest && pip install -e .` — clean install
- [ ] `stripe trigger invoice.payment_failed` → API key disabled
- [ ] Checkout flow → `?upgraded=true` → success banner shown
- [ ] All new files committed, nothing broken on main

---

## Quick Reference: Files Changed

### Modified (14 files)
| File | Phase |
|------|-------|
| `lib/stripe.ts` | 1 |
| `app/api/webhooks/stripe/route.ts` | 1 |
| `app/api/developer/subscribe/route.ts` | 1 |
| `app/api/customer-portal/route.ts` | 1 |
| `components/dashboard/ApiKeyManager.tsx` | 1 |
| `docs/STRIPE_SETUP.md` | 1 |
| `backend/handlers/api.py` | 2 |
| `backend/tests/test_api_handler.py` | 2 |
| `packages/mcp-server/src/client.ts` | 3 |
| `packages/mcp-server/src/tools.ts` | 3 |
| `packages/mcp-server/src/index.ts` | 3 |
| `packages/mcp-server/src/types.ts` | 3 |
| `packages/mcp-server/package.json` | 3 |
| `packages/mcp-server/README.md` | 3 |

### Created (new)
| File | Phase |
|------|-------|
| `scripts/stripe-setup.ts` | 1 |
| `db/migrations/007_add_stripe_customer_id.sql` | 1 |
| `db/migrations/008_add_request_id.sql` | 2 |
| `packages/mcp-server/LICENSE` | 3 |
| `packages/mcp-server/CHANGELOG.md` | 3 |
| `packages/mcp-server/__tests__/client.test.ts` | 3 |
| `packages/sdk-node/*` (full package) | 4 |
| `packages/sdk-python/*` (full package) | 4 |
