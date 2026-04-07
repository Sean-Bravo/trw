# TaxFormatter: Consumer CSV Tool → Developer API Platform

**Date:** March 18, 2026

---

## The Shift

TaxFormatter started as a consumer SaaS — users upload a broken exchange CSV, we fix it, they download a clean file for TurboTax or Koinly. The core engine (`engine.py`) supports 14 crypto exchanges and 7+ banks, handles compressed archives, XLSX conversion, date normalization, and AI-powered transaction categorization.

That engine is now exposed as a REST API and MCP server. The product moved from "upload your CSV" to "parse any CSV programmatically." The audience shifted from individual crypto traders to developers, fintech apps, accounting platforms, and AI agents.

---

## What Was (Consumer Model)

**How it worked:**
1. User signs up (Google OAuth or email/password)
2. Uploads a CSV via the dashboard
3. File goes to S3 → Scanner Lambda → SQS → Processor Lambda
4. User polls for status, sees AI insights, downloads the fixed file
5. Free tier: 3 downloads/month. Pro ($89/yr) and Premium ($189/yr) for unlimited + better AI

**Revenue model:** Annual subscriptions from individual crypto traders

**Tech stack serving this:**
- Next.js dashboard with FileUploader, DiffViewer, AIInsightsPanel
- S3 presigned URLs for upload/download
- SQS queue → Processor Lambda (async, polls for status)
- Neon DB tracking uploads, jobs, downloads

---

## What Is Now (API + Agent Model)

**How it works:**
1. Developer gets an API key from the dashboard
2. Sends `POST /v1/parse` with a base64-encoded file
3. API Lambda processes it synchronously (engine.py or BankStatementProcessor)
4. Returns structured JSON — transactions, metadata, warnings
5. AI agents use the MCP server (`@taxformatter/mcp-server`) to call the same API via natural language

**Revenue model:** Monthly API tiers based on volume

**New tech stack:**
- Separate API Lambda (120s timeout, 1024MB) — independent from consumer Lambdas
- API key auth with SHA-256 hashing, in-memory RPM rate limiting, monthly quotas
- 3 new database tables (`api_keys`, `api_usage`, `api_requests`)
- MCP server npm package with 3 tools
- Developer dashboard with key management, usage bars, curl snippets

---

## Side-by-Side

| | Consumer Model | API Model |
|---|---|---|
| **User** | Crypto trader uploading 1 file | Developer integrating parsing into their app |
| **Interaction** | Web dashboard, drag-and-drop | REST API call, JSON in/out |
| **Processing** | Async (SQS → Lambda, poll for status) | Synchronous (request → response) |
| **Auth** | NextAuth session (Google/email) | API key (`X-API-Key` header) |
| **Output** | Downloadable CSV file | Structured JSON with transactions array |
| **Pricing** | $0 / $89/yr / $189/yr | $0 / $29/mo / $99/mo / $249/mo |
| **AI** | Gemini/Sonnet/Opus insights in panel | Not included (raw parse only) |
| **Agent support** | None | MCP server for Claude, Cursor, etc. |
| **Rate limiting** | 3 downloads/month (free) | 10–2,000 files/month + RPM limits |

---

## What Got Built (March 18, 2026)

### Phase 0: Database
- `db/migrations/006_add_api_keys.sql` — 3 tables, indexes, enums

### Phase 1: API Key Management
- `lib/api-keys.ts` — key generation (`tf_live_` prefix), SHA-256 hashing, CRUD
- `app/api/developer/keys/` — create, list, revoke, rename endpoints

### Phase 2: API Lambda
- `backend/handlers/api.py` — 4 endpoints: `/v1/parse`, `/v1/sources`, `/v1/usage`, `/v1/health`
- `backend/services/api_auth.py` — key validation, rate limiting, usage tracking
- Terraform: new Lambda function, IAM role, API Gateway routes

### Phase 3: Bank PDF Support
- `/v1/parse` handles both `.csv` and `.pdf` files
- Routes PDFs to `BankStatementProcessor`, CSVs to `engine.py`

### Phase 4: Stripe Billing
- `app/api/developer/subscribe/route.ts` — checkout for API tiers
- Webhook handler updated for `api_tier` metadata

### Phase 5: Developer Dashboard
- `app/dashboard/developer/page.tsx` — key management UI
- `components/dashboard/ApiKeyManager.tsx` — create/revoke keys, usage bars, quick-start snippet

### Phase 6: MCP Server
- `packages/mcp-server/` — full npm package (`@taxformatter/mcp-server`)
- 3 tools: `parse_crypto_csv`, `parse_bank_statement`, `list_supported_sources`
- Works with Claude Code, Cursor, Windsurf, any MCP-compatible client

### Phase 7: Docs + Architecture
- `content/docs/api/index.md` — full API reference
- `ARCHITECTURE.md` updated with API flow, new tables, new files

### Phase 8: Landing Page Redesign
- 5 new marketing components: APIHero, APIDemo, AgentSection, APICapabilities, APIPricing
- Hero shows animated terminal with live `POST /v1/parse` request
- FAQ rewritten for developer audience
- Consumer sections preserved in codebase but removed from landing page
- New og-image with API-focused screenshot

---

## What Didn't Change

The consumer product is untouched. The dashboard still works. Upload, process, download — all the same. The consumer Lambdas (scanner, processor, webhook) are independent from the new API Lambda. Nothing was deleted, nothing was broken.

The consumer path is still accessible:
- `/dashboard` — upload and manage files
- `/upload` — anonymous bank statement converter
- Pricing section has a "Not a developer?" callout linking to the dashboard

---

## Files Created (28 files, +2,618 lines)

```
db/migrations/006_add_api_keys.sql
lib/api-keys.ts
app/api/developer/keys/route.ts
app/api/developer/keys/[keyId]/route.ts
app/api/developer/usage/route.ts
app/api/developer/subscribe/route.ts
app/dashboard/developer/page.tsx
components/dashboard/ApiKeyManager.tsx
backend/handlers/api.py
backend/services/api_auth.py
backend/requirements-api.txt
packages/mcp-server/package.json
packages/mcp-server/tsconfig.json
packages/mcp-server/src/index.ts
packages/mcp-server/src/tools.ts
packages/mcp-server/src/client.ts
packages/mcp-server/src/types.ts
packages/mcp-server/bin/mcp-server.js
packages/mcp-server/README.md
content/docs/api/index.md
components/marketing/APIHero.tsx
components/marketing/APIDemo.tsx
components/marketing/AgentSection.tsx
components/marketing/APICapabilities.tsx
components/marketing/APIPricing.tsx
TaxFormatter_API_Build_Complete.md
TaxFormatter_Landing_Page_Redesign.md
TaxFormatter_Pivot_Summary.md
```

## Files Modified (14 files)

```
ARCHITECTURE.md
app/page.tsx
app/api/webhooks/stripe/route.ts
backend/deploy.sh
backend/terraform/api_gateway.tf
backend/terraform/lambda.tf
backend/terraform/main.tf
lib/stripe.ts
components/marketing/Header.tsx
components/marketing/FAQ.tsx
components/marketing/Footer.tsx
packages/mcp-server/src/client.ts
tsconfig.json
public/og-image.png
```

---

## Deployment Checklist

1. Run `db/migrations/006_add_api_keys.sql` in Neon
2. `cd backend && terraform apply`
3. `./deploy.sh deploy` — packages all 4 Lambdas
4. Create Stripe API tier products, set price ID env vars
5. `cd packages/mcp-server && npm run build && npm publish --access public`
6. Verify: `curl -X POST https://api.taxformatter.com/v1/health`
