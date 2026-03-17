# TaxFormatter Developer API + Agent Client — Implementation Plan

## Context

TaxFormatter has a working consumer upload tool with `engine.py` (14 crypto exchange parsers, 13 bank statement parsers), Lambda processing pipeline, and API Gateway at `api.taxformatter.com`. The goal is to expose this engine as a developer API **and** ship an MCP server so AI agents (Claude Code, Cursor, Windsurf) can parse financial documents natively — making TaxFormatter the first parser in this space with agent-native tooling.

**Why the agent client matters:** An MCP server is both an SDK and a marketing channel. It shows up in MCP registries (mcp.so, Smithery). DocuClipper, Veryfi, Mindee have REST APIs — none have MCP servers. This is a differentiator.

---

## Architecture

```
Developers                    AI Agents (Claude Code, Cursor, etc.)
    │                                    │
    │  REST API                          │  MCP Protocol (stdio)
    ▼                                    ▼
api.taxformatter.com/v1/*     @taxformatter/mcp-server (npm package)
    │                                    │
    │                                    │ calls REST API
    │                                    ▼
    └──────────► webhook Lambda (POST /v1/parse)
                      │
                      ├─ PDF → BankStatementProcessor
                      └─ CSV → engine.py process_file()
```

- `/v1/parse` lives on Lambda/API Gateway (reuses existing webhook Lambda)
- Key management + dashboard live in Next.js (needs auth session)
- MCP server is a standalone npm package that wraps the REST API

---

## Phase 1: REST API (MVP)

### Step 1 — Database Migration
**File:** `db/schema.sql`

3 new tables: `api_keys`, `api_usage`, `api_requests` (schema from implementation plan doc — unchanged).

### Step 2 — API Key Library
**New file:** `lib/api-keys.ts`

- `generateApiKey()` → `tf_live_<32hex>`, store SHA-256 hash only
- `hashApiKey(key)` → SHA-256
- `API_TIERS` constant (free/starter/growth/business with limits + RPM)

### Step 3 — Key Management Routes
**New directory:** `app/api/developer/`

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/developer/keys` | POST | Generate key (max 5/user), returns full key once |
| `/api/developer/keys` | GET | List keys (prefix, name, tier, status) |
| `/api/developer/keys/[keyId]` | DELETE | Revoke (soft delete) |
| `/api/developer/keys/[keyId]` | PATCH | Rename |
| `/api/developer/usage` | GET | Current month + 6-month history |

All require `getServerSession()`.

### Step 4 — Lambda Auth Module
**New file:** `backend/services/api_auth.py`

- `validate_api_key(key_hash)` → key record or None
- `check_and_increment_usage(api_key_id, user_id)` → `{allowed, is_overage, usage, limit}`
- `log_api_request(...)` → insert into `api_requests`

Uses `psycopg2` (already in Lambda deps) + `DATABASE_URL` from Secrets Manager.

### Step 5 — Lambda `/v1/parse` Endpoint
**Modified file:** `backend/handlers/webhook.py`

Add `handle_v1_parse(event)` to the existing `handler()` router.

**Flow:**
1. Extract `Authorization: Bearer tf_live_...`
2. Hash → lookup in `api_keys` (status=active)
3. Rate limit check (in-memory dict, MVP)
4. Monthly usage check — allow overage, flag with `X-Api-Overage` header
5. Accept both `multipart/form-data` AND `application/json` with `file_base64` field
6. Detect file type: PDF → bank path, CSV → crypto path
7. Process synchronously via existing `engine.py` / `BankStatementProcessor`
8. Return unified JSON response
9. Log to `api_requests`, increment `api_usage`

**Response format:**
```json
{
  "status": "success",
  "summary": "Parsed 47 transactions from Chase (Jan 1–31, 2025). Deposits: $5,230, Withdrawals: $3,891.",
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

The `summary` field is free to generate and makes agent integrations dramatically better — agents show it directly to users.

**Additional endpoints:**
- `GET /v1/supported-sources` — list supported banks + exchanges (no auth)
- `GET /v1/usage` — current usage for this API key
- `GET /v1/health` — health check (no auth)

### Step 6 — Terraform
**File:** `backend/terraform/api_gateway.tf`

- Add routes: `POST /v1/parse`, `GET /v1/supported-sources`, `GET /v1/usage`, `GET /v1/health`
- CORS: `/v1/*` routes need `allow_origins = ["*"]` (API consumers call from anywhere)

**File:** `backend/terraform/lambda.tf`
- Webhook Lambda timeout → 120s
- Webhook Lambda memory → 1024MB

### Step 7 — End-to-End Test
```bash
# Generate key
curl -X POST https://taxformatter.com/api/developer/keys \
  -H "Cookie: <session>" -H "Content-Type: application/json" \
  -d '{"name": "test-key"}'

# Parse a CSV
curl -X POST https://api.taxformatter.com/v1/parse \
  -H "Authorization: Bearer tf_live_..." \
  -F "file=@coinbase_export.csv"

# Parse a bank PDF
curl -X POST https://api.taxformatter.com/v1/parse \
  -H "Authorization: Bearer tf_live_..." \
  -F "file=@chase_statement.pdf"
```

---

## Phase 2: Agent Client (MCP Server)

### Step 8 — MCP Server Package
**New directory:** `packages/mcp-server/`

```
packages/mcp-server/
  package.json          — @taxformatter/mcp-server
  tsconfig.json
  src/
    index.ts            — McpServer + StdioServerTransport
    tools/
      parse.ts          — parse_bank_statement + parse_crypto_csv tools
      sources.ts        — list_supported_sources tool
    client.ts           — HTTP client for api.taxformatter.com/v1/*
    types.ts            — Shared types
  bin/
    taxformatter-mcp    — CLI entry point
  README.md
```

**Dependencies:** `@modelcontextprotocol/sdk`, `zod` only. Uses native `fetch` + `FormData` (Node 18+).

**Three tools exposed:**

**`parse_bank_statement`**
- Input: `{ file_path: string, output_format?: "json"|"csv"|"qbo"|"xero" }`
- Reads file from disk, POSTs to `/v1/parse`, returns parsed transactions

**`parse_crypto_csv`**
- Input: `{ file_path: string, exchange?: string, output_format?: "json"|"csv"|"koinly"|"turbotax"|"coinledger"|"zenledger" }`
- Same pattern — read file, POST, return result

**`list_supported_sources`**
- Input: `{}`
- GETs `/v1/supported-sources`

**Why two parse tools instead of one:** Tool descriptions help the LLM know when to use each. The REST API uses a single endpoint, but the MCP layer splits for better agent UX.

**Developer usage:**
```json
// ~/.claude/mcp.json
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

Then: "Parse the bank statement at ~/Downloads/chase_jan.pdf" just works.

### Step 9 — Publish + Registry Listings
- Publish `@taxformatter/mcp-server` to npm
- Submit to mcp.so and Smithery registries
- Free developer discovery channel

### Step 10 — Agent Tool Definitions Page
**New page:** `app/docs/api/agent-tools/page.tsx`

Copy-pasteable JSON tool definitions for OpenAI and Anthropic tool-use formats. Developers building custom agents can drop these into their tool arrays. Zero code to build — pure documentation.

---

## Phase 3: Post-MVP

| # | What | Key Files |
|---|------|-----------|
| 11 | Stripe API tier billing | `lib/stripe.ts`, `app/api/webhooks/stripe/route.ts` |
| 12 | Developer dashboard UI | `app/dashboard/developer/page.tsx`, `components/developer/*` |
| 13 | OpenAPI spec | `public/openapi.yaml` |
| 14 | API docs page | `app/docs/api/page.tsx` |
| 15 | Python SDK (`taxformatter` on PyPI) | `packages/python-sdk/` |
| 16 | Node SDK (`taxformatter` on npm) | `packages/node-sdk/` |

---

## Key Design Decisions

1. **MCP server wraps the REST API** — does NOT call Lambda directly. All auth, rate limiting, and usage tracking flow through the same path.
2. **Dual content-type support** — `/v1/parse` accepts both multipart and JSON+base64. Multipart is conventional for REST; base64 is simpler for programmatic callers and agents.
3. **No hard cutoff on overage** — flag with `X-Api-Overage` response header, never block mid-workflow.
4. **Synchronous processing for MVP** — bank PDFs <2MB (5-30s), crypto CSVs (1-10s). Lambda 120s timeout is sufficient. Async webhook callback in v2 if needed.
5. **In-memory rate limiting for MVP** — resets on Lambda cold start (acceptable). Upgrade to API Gateway usage plans later.
6. **`summary` field in response** — human-readable one-liner computed from already-available data. Makes agent UX dramatically better.

---

## Critical Files

| File | Change |
|------|--------|
| `db/schema.sql` | Add 3 tables |
| `lib/api-keys.ts` | New — key generation + hashing |
| `app/api/developer/keys/route.ts` | New — key CRUD |
| `app/api/developer/keys/[keyId]/route.ts` | New — revoke/rename |
| `app/api/developer/usage/route.ts` | New — usage stats |
| `backend/services/api_auth.py` | New — key validation + usage tracking |
| `backend/handlers/webhook.py` | Add `/v1/parse`, `/v1/supported-sources`, `/v1/usage`, `/v1/health` |
| `backend/terraform/api_gateway.tf` | Add 4 routes |
| `backend/terraform/lambda.tf` | Increase timeout + memory |
| `packages/mcp-server/` | New — entire MCP server package |

## Verification

1. Generate API key via `POST /api/developer/keys` (authenticated)
2. `curl POST /v1/parse` with test CSV → verify exchange detection + JSON response
3. `curl POST /v1/parse` with test PDF → verify bank detection + transactions
4. Verify `api_usage` increments in DB
5. Exceed RPM → verify 429 response
6. Exceed monthly limit → verify `X-Api-Overage` header (not blocked)
7. Install MCP server locally → test `parse_bank_statement` tool in Claude Code
8. Verify `list_supported_sources` returns correct banks + exchanges
