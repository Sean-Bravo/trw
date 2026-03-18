# TaxFormatter Developer API — Build Complete

**Date:** March 18, 2026

---

## Architecture Decision

**Separate API Lambda** — A new `api` Lambda handles all `/v1/*` routes independently from the existing webhook Lambda. This keeps consumer routes untouched, allows independent timeout (120s), memory (1024MB), and deploy cycle. API key auth happens inside the Lambda handler (API Gateway HTTP APIs don't have native key auth).

```
Developers / AI Agents
       │
       │  REST API (X-API-Key header)
       ▼
api.taxformatter.com/v1/*
       │
       ▼
API Gateway → API Lambda (120s, 1024MB)
       │
       ├─ api_auth.py validates key (SHA-256 hash → Neon lookup)
       ├─ Rate limit check (in-memory RPM)
       ├─ Monthly quota check (allow overage, flag with header)
       │
       ├─ .csv/.xlsx → engine.py process_file()
       └─ .pdf → BankStatementProcessor
       │
       ▼
JSON response + usage tracking
```

---

## Files Created

### Phase 0: Database Migration

| File | Purpose |
|------|---------|
| `db/migrations/006_add_api_keys.sql` | 3 new tables: `api_keys`, `api_usage`, `api_requests` with indexes |

### Phase 1: API Key Management (Next.js)

| File | Purpose |
|------|---------|
| `lib/api-keys.ts` | Key generation (`tf_live_` + 32 hex), SHA-256 hashing, CRUD operations, validation, tier management, usage queries |
| `app/api/developer/keys/route.ts` | GET (list keys) + POST (create key) — requires authenticated session |
| `app/api/developer/keys/[keyId]/route.ts` | DELETE (revoke) + PATCH (rename) — requires authenticated session |
| `app/api/developer/usage/route.ts` | GET — usage stats for all active keys with 6-month history |

### Phase 2: API Lambda + `/v1/parse` Endpoint

| File | Purpose |
|------|---------|
| `backend/handlers/api.py` | Main Lambda handler: `/v1/parse` (crypto + bank), `/v1/sources`, `/v1/usage`, `/v1/health` |
| `backend/services/api_auth.py` | Key validation, in-memory RPM rate limiting, monthly quota checks, request logging, usage tracking |
| `backend/requirements-api.txt` | Lambda dependencies: numpy, pandas, chardet, psycopg2-binary, pdfplumber, PyYAML |

### Phase 4: Stripe Billing

| File | Purpose |
|------|---------|
| `app/api/developer/subscribe/route.ts` | POST — creates Stripe Checkout session for API tier upgrade |

### Phase 5: Developer Dashboard UI

| File | Purpose |
|------|---------|
| `app/dashboard/developer/page.tsx` | Developer dashboard page (protected, dark theme) |
| `components/dashboard/ApiKeyManager.tsx` | Client component: key CRUD, usage progress bars, curl quick-start snippet |

### Phase 6: MCP Server Package

| File | Purpose |
|------|---------|
| `packages/mcp-server/package.json` | npm package config: `@taxformatter/mcp-server` |
| `packages/mcp-server/tsconfig.json` | TypeScript config (ES2022, Node16 modules) |
| `packages/mcp-server/src/index.ts` | MCP server entry point (McpServer + StdioServerTransport) |
| `packages/mcp-server/src/tools.ts` | 3 tool definitions + handlers: `parse_crypto_csv`, `parse_bank_statement`, `list_supported_sources` |
| `packages/mcp-server/src/client.ts` | HTTP client wrapper for `api.taxformatter.com/v1/*` |
| `packages/mcp-server/src/types.ts` | Shared TypeScript types for API responses |
| `packages/mcp-server/bin/mcp-server.js` | CLI entry point for `npx @taxformatter/mcp-server` |
| `packages/mcp-server/README.md` | Setup instructions for Claude Code, Cursor, etc. |

### Phase 7: API Documentation

| File | Purpose |
|------|---------|
| `content/docs/api/index.md` | Full API docs: authentication, endpoints, request/response format, error codes, rate limits, MCP setup |

---

## Files Modified

### Phase 2: Terraform + Deploy

| File | Change |
|------|--------|
| `backend/terraform/api_gateway.tf` | Added API Lambda integration (120s timeout) + 4 routes: `POST /v1/parse`, `GET /v1/sources`, `GET /v1/usage`, `GET /v1/health` + Lambda permission |
| `backend/terraform/lambda.tf` | Added API Lambda function (120s, 1024MB), IAM role + policy (S3 results + Secrets Manager), CloudWatch log group |
| `backend/terraform/main.tf` | Added `api_lambda` local name + `api_lambda_function_name` output |
| `backend/deploy.sh` | Added API Lambda packaging (copies handlers/api.py, services/, configs/, installs deps) + deployment block |

### Phase 4: Stripe Integration

| File | Change |
|------|--------|
| `lib/stripe.ts` | Added `STRIPE_API_PRICES` (Starter/Growth/Business monthly price IDs), `API_PRICING` constant, `StripeApiPlan` type |
| `app/api/webhooks/stripe/route.ts` | Handles `api_tier` metadata in `checkout.session.completed` (updates api_keys tier/quota/RPM), handles API key downgrade on `subscription.deleted` |

### Phase 7: Architecture Docs

| File | Change |
|------|--------|
| `ARCHITECTURE.md` | Added Developer API flow diagram, `api_keys`/`api_usage`/`api_requests` to schema table (8→11 tables), API-related key files, `packages/` to directory structure |

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/v1/parse` | API key | Parse crypto CSV or bank PDF → structured JSON |
| GET | `/v1/sources` | None | List supported exchanges + banks |
| GET | `/v1/usage` | API key | Current key's usage stats |
| GET | `/v1/health` | None | Health check |

### Request Format (POST `/v1/parse`)

```json
{
  "file_content": "<base64-encoded file>",
  "filename": "coinbase_2024.csv",
  "exchange": "coinbase",
  "output_format": "koinly"
}
```

### Success Response

```json
{
  "status": "success",
  "summary": "Parsed 147 Coinbase transactions (Jan–Dec 2024).",
  "detected_source": "coinbase",
  "source_type": "crypto_exchange",
  "output_format": "koinly",
  "transactions": [...],
  "warnings": [],
  "metadata": {
    "transaction_count": 147,
    "processing_time_ms": 1234,
    "api_version": "2026-03-01"
  }
}
```

### Error Codes

| Code | HTTP | Retryable |
|------|------|-----------|
| `invalid_api_key` | 401 | No |
| `rate_limited` | 429 | Yes (wait 60s) |
| `invalid_file_type` | 400 | No |
| `file_too_large` | 400 | No |
| `file_empty` | 400 | No |
| `unsupported_exchange` | 422 | No |
| `unsupported_bank` | 422 | No |
| `parse_error` | 422 | Maybe |
| `internal_error` | 500 | Yes |

---

## Database Tables Added

### `api_keys`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK → users | |
| name | text | User label |
| key_prefix | text | First 8 hex chars for display |
| key_hash | text UNIQUE | SHA-256 of full key |
| tier | api_tier enum | free/starter/growth/business |
| is_active | boolean | Soft delete via false |
| rate_limit_rpm | integer | Requests per minute |
| monthly_quota | integer | Files per month |
| stripe_subscription_id | text | For paid tiers |
| last_used_at | timestamptz | Updated on each API call |
| expires_at | timestamptz | Optional expiration |
| created_at | timestamptz | |

### `api_usage`
Daily rollup per key: `request_count`, `file_count`, `bytes_processed`. UNIQUE on `(api_key_id, usage_date)`.

### `api_requests`
Per-request log: `endpoint`, `method`, `status_code`, `response_time_ms`, `error_code`, `file_size`, `source_type`, `detected_source`, `transaction_count`, `ip_address`.

---

## Pricing Tiers

| Tier | Files/mo | RPM | Price |
|------|----------|-----|-------|
| Free | 10 | 10 | $0 |
| Starter | 100 | 30 | $29/mo |
| Growth | 500 | 60 | $99/mo |
| Business | 2,000 | 120 | $249/mo |

Overage is flagged via `X-Api-Overage: true` response header — never hard-blocked.

---

## MCP Server

```json
{
  "mcpServers": {
    "taxformatter": {
      "command": "npx",
      "args": ["@taxformatter/mcp-server"],
      "env": { "TAXFORMATTER_API_KEY": "tf_live_..." }
    }
  }
}
```

**Tools:** `parse_crypto_csv`, `parse_bank_statement`, `list_supported_sources`

---

## Deployment Steps

1. Run `db/migrations/006_add_api_keys.sql` in Neon SQL Editor
2. `cd backend && terraform apply` — creates API Lambda + API Gateway routes
3. `./deploy.sh deploy` — packages and deploys all 4 Lambdas
4. Create Stripe products for API tiers in Stripe Dashboard, set env vars for price IDs
5. Test: `curl -X POST https://api.taxformatter.com/v1/parse -H "X-API-Key: tf_live_..." -H "Content-Type: application/json" -d '{"file_content":"<base64>","filename":"test.csv"}'`
6. Build MCP server: `cd packages/mcp-server && npm install && npm run build`
7. Publish: `npm publish --access public`
