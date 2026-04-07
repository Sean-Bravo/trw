# TaxFormatter Developer API — Implementation Plan

## Context

TaxFormatter has a working consumer upload tool (taxformatter.com/upload) with `engine.py` supporting 14 crypto exchange parsers and 13 bank statement parsers. The goal is to wrap this same engine in a developer-facing REST API so fintechs, accounting SaaS, and crypto tax apps can send files and get structured data back — creating recurring B2B revenue alongside the consumer product.

---

## Architecture Decision

**The `/v1/parse` endpoint lives on Lambda/API Gateway** (`api.taxformatter.com`), not in Next.js. The processing engine already runs in Lambda, so routing through Next.js would add latency and hit Vercel's 60s function timeout. The webhook Lambda's `handler()` already routes by `routeKey` — we add `POST /v1/parse` to that router.

**Key management and dashboard live in Next.js** (`app/api/developer/`, `app/dashboard/developer/`) since they need the authenticated user session.

---

## Step 1: Database Tables

**File:** `db/schema.sql`

Add 3 new tables:

### `api_keys`
- `id` (uuid PK), `user_id` (FK → users), `name` (text, user label)
- `key_prefix` (text, first 8 chars for display), `key_hash` (text unique, SHA-256)
- `tier` (text: free/starter/growth/business/enterprise), `status` (text: active/revoked)
- `stripe_subscription_id` (text), `monthly_limit` (int, default 10), `rate_limit_rpm` (int, default 20)
- `last_used_at`, `created_at`, `revoked_at`
- Indexes on `user_id`, `key_hash`

### `api_usage`
- `id` (uuid PK), `api_key_id` (FK), `user_id` (FK)
- `period_start` (date, first of month), `file_count` (int), `overage_count` (int)
- UNIQUE on `(api_key_id, period_start)`

### `api_requests`
- `id` (uuid PK), `api_key_id` (FK)
- `source_type`, `detected_source`, `output_format`, `file_size`, `transaction_count`
- `processing_ms`, `status` (success/error), `error_message`, `ip_address`, `created_at`

---

## Step 2: API Key Library

**New file:** `lib/api-keys.ts`

- `generateApiKey()` → `{ fullKey: "tf_live_<32hex>", prefix: "tf_live_a1", hash: "<sha256>" }`
- `hashApiKey(key)` → SHA-256 hash
- `API_TIERS` constant:

| Tier | monthly_limit | rate_limit_rpm | Price |
|------|--------------|----------------|-------|
| free | 10 | 20 | $0 |
| starter | 100 | 60 | $29/mo |
| growth | 500 | 120 | $99/mo |
| business | 2000 | 300 | $249/mo |

---

## Step 3: Next.js Key Management Routes

**New directory:** `app/api/developer/`

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/developer/keys` | POST | Generate new API key (max 5/user). Returns full key once. |
| `/api/developer/keys` | GET | List keys (prefix, name, tier, status, last_used) |
| `/api/developer/keys/[keyId]` | DELETE | Revoke key (soft delete) |
| `/api/developer/keys/[keyId]` | PATCH | Rename key |
| `/api/developer/usage` | GET | Current month usage + 6-month history |
| `/api/developer/subscribe` | POST | Stripe checkout for API tier |

All routes require authenticated session via `getServerSession()`.

---

## Step 4: Lambda `/v1/parse` Endpoint (Core)

**Modified file:** `backend/handlers/webhook.py`
**New file:** `backend/services/api_auth.py`

### `api_auth.py`
Uses `psycopg2` (already in processor Lambda) to connect to Neon via `DATABASE_URL` from Secrets Manager:
- `validate_api_key(key_hash)` → key record or None
- `check_and_increment_usage(api_key_id, user_id)` → `{allowed, is_overage, usage, limit}`
- `log_api_request(api_key_id, ...)` → insert into `api_requests`

### `webhook.py` changes
Add `handle_v1_parse(event)` function + route in `handler()`:

```python
elif route_key == "POST /v1/parse":
    return handle_v1_parse(event)
```

**Flow:**
1. Extract `Authorization: Bearer tf_live_...` header
2. Hash key → look up in `api_keys` (status=active)
3. Check rate limit (in-memory dict, resets on cold start — good enough for MVP)
4. Check monthly usage, allow overage but flag with `X-Api-Overage` header
5. Parse multipart body (base64-decoded from API Gateway v2) using `python-multipart`
6. Detect file type: PDF → bank statement path, CSV → crypto exchange path
7. Process synchronously using existing `engine.py` / `BankStatementProcessor`
8. Return structured JSON response
9. Log to `api_requests`, increment `api_usage`, update `last_used_at`

**Response format:**
```json
{
  "status": "success",
  "detected_source": "chase",
  "source_type": "bank_statement",
  "transactions": [...],
  "metadata": {
    "account_number_last4": "4829",
    "statement_period": "2025-01-01 to 2025-01-31",
    "transaction_count": 47,
    "processing_time_ms": 1234
  }
}
```

**New dependency:** `python-multipart` added to `requirements-webhook.txt`

---

## Step 5: Terraform Changes

**File:** `backend/terraform/api_gateway.tf`

Add route:
```hcl
resource "aws_apigatewayv2_route" "v1_parse" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /v1/parse"
  target    = "integrations/${aws_apigatewayv2_integration.webhook.id}"
}
```

**File:** `backend/terraform/lambda.tf`
- Increase webhook Lambda timeout to 120s (bank PDF parsing can take 30-60s)
- Increase webhook Lambda memory to 1024MB (PDF processing needs it)

---

## Step 6: Stripe Integration

**File:** `lib/stripe.ts` — Add `STRIPE_API_PRICES` for starter/growth/business tiers

**File:** `app/api/webhooks/stripe/route.ts` — Handle API subscription events:
- `checkout.session.completed` with `metadata.type === 'api_tier'` → update `api_keys.tier` + `monthly_limit`
- `customer.subscription.deleted` → downgrade to free tier

Overage billing tracked in `api_usage.overage_count` — invoice manually for MVP.

---

## Step 7: Developer Dashboard UI

**New pages:** `app/dashboard/developer/page.tsx`

- API key list with generate/revoke actions
- Current month usage progress bar
- Tier upgrade buttons
- Quick-start code snippets (curl, Python, Node.js)

**New components:** `components/developer/ApiKeyCard.tsx`, `UsageChart.tsx`, `CodeSnippet.tsx`

---

## Step 8: API Docs Page

**New page:** `app/docs/api/page.tsx`

Static docs covering: authentication, endpoint spec, request/response examples, error codes, rate limits, code examples in curl/Python/Node.js.

---

## Implementation Order

| # | What | Key Files | Notes |
|---|------|-----------|-------|
| 1 | DB migration | `db/schema.sql` | Run in Neon SQL Editor |
| 2 | API key lib | `lib/api-keys.ts` | Foundation for everything |
| 3 | Key management routes | `app/api/developer/keys/route.ts` | Test with curl |
| 4 | Lambda parse handler | `backend/services/api_auth.py`, `backend/handlers/webhook.py` | Core revenue endpoint |
| 5 | Terraform routes | `backend/terraform/api_gateway.tf`, `lambda.tf` | Deploy with `deploy.sh` |
| 6 | End-to-end test | — | curl a real file through the API |
| 7 | Stripe API tiers | `lib/stripe.ts`, webhook handler | Billing |
| 8 | Dashboard UI | `app/dashboard/developer/page.tsx` | Key mgmt + usage |
| 9 | API docs page | `app/docs/api/page.tsx` | Developer onboarding |

**Start with steps 1–6** to get a working API testable via curl. Then add billing and UI.

---

## Key Design Decisions

- **No hard cutoff on overage** — per strategy doc, never block a customer mid-workflow. Flag with response headers.
- **Synchronous processing for MVP** — bank PDFs are <2MB (5-30s), crypto CSVs are <50MB (1-10s). Lambda 120s timeout is sufficient. Add async webhook callback in v2 if needed.
- **API key format**: `tf_live_` + 32 hex chars. Prefix makes keys identifiable in logs. Only SHA-256 hash stored in DB.
- **Rate limiting**: In-memory dict in Lambda for MVP. Resets on cold start (acceptable). Upgrade to DynamoDB TTL or API Gateway throttling later.
- **No new Lambda function** — reuse existing webhook Lambda, just add a new route.

---

## Verification

1. Generate an API key via `POST /api/developer/keys` (authenticated)
2. Call `POST https://api.taxformatter.com/v1/parse` with `Authorization: Bearer tf_live_...` and a test CSV
3. Verify correct exchange detection, transaction parsing, and JSON response
4. Verify usage increments in `api_usage` table
5. Test rate limiting by exceeding RPM
6. Test tier limit by exceeding monthly file count — verify overage header
7. Test with bank statement PDF — verify bank detection and transaction extraction
