# Plan: API Docs — Real-World Testing

## Context

The API docs at `content/docs/api/index.md` were just updated. The 5th Lambda (`taxformatter-prod-api`) needs to be deployed before live testing can happen. This plan covers deploying the Lambda, then systematically testing every documented endpoint and code example against the real API to verify accuracy.

## Phase 1: Deploy the API Lambda

1. **`cd backend && terraform apply`** — creates `taxformatter-prod-api` Lambda + API Gateway routes
2. **`./deploy.sh deploy`** — packages and uploads handler code
3. **Smoke check**: `curl https://api.taxformatter.com/v1/health` — confirm 200 response

## Phase 2: Test Each Endpoint (Live)

Requires a real API key from `/dashboard/developer`. Tests run against **production** (`api.taxformatter.com`). Use your real local export files (Coinbase CSV, Chase PDF, etc.) for parse testing.

### 2a. Health Check (no auth)
```bash
curl -s https://api.taxformatter.com/v1/health | jq .
```
- Expect: `{"status": "ok"}` with 200

### 2b. List Sources (no auth)
```bash
curl -s https://api.taxformatter.com/v1/sources | jq .
```
- Verify response includes all 14 exchanges and 50+ banks documented
- Verify response shape matches what docs imply (exchange names, bank names)

### 2c. Parse — Crypto CSV (auth required)
```bash
curl -X POST https://api.taxformatter.com/v1/parse \
  -H "X-API-Key: $TF_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"file_content": "'$(base64 -i test_fixtures/coinbase.csv)'", "filename": "coinbase_2024.csv"}'
```
- Verify response matches documented success shape: `status`, `summary`, `detected_source`, `source_type`, `output_format`, `transactions`, `warnings`, `metadata`
- Verify `metadata` contains `transaction_count`, `processing_time_ms`, `api_version`
- Test with `output_format: "koinly"`, `"turbotax"`, `"coinledger"`, `"zenledger"`

### 2d. Parse — Bank PDF (auth required)
```bash
curl -X POST https://api.taxformatter.com/v1/parse \
  -H "X-API-Key: $TF_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"file_content": "'$(base64 -i test_fixtures/chase.pdf)'", "filename": "chase_jan.pdf"}'
```
- Verify bank detection and `source_type: "bank_statement"`

### 2e. Usage (auth required)
```bash
curl -s https://api.taxformatter.com/v1/usage \
  -H "X-API-Key: $TF_API_KEY" | jq .
```
- Verify response includes usage counts that reflect the parse calls just made

### 2f. Error Cases
Test every documented error code against the live API:

| Test | Expected Code | Expected HTTP |
|------|--------------|---------------|
| No API key on `/v1/parse` | `invalid_api_key` | 401 |
| Revoked/bogus key | `invalid_api_key` | 401 |
| Empty `file_content` | `file_empty` | 400 |
| Send a .exe filename | `invalid_file_type` | 400 |
| >10MB file | `file_too_large` | 400 |
| Random CSV (not a known exchange) | `unsupported_exchange` | 422 |
| Random PDF (not a known bank) | `unsupported_bank` | 422 |

### 2g. Rate Limiting
- Hit the API rapidly (>10 RPM on free tier) and confirm `rate_limited` / 429 response
- Verify `X-Api-Overage` header behavior at monthly quota boundary

## Phase 3: Verify Code Examples from Docs

Run the exact Python and Node.js snippets from the docs (with a real key + test file) and confirm they work without modification.

### 3a. Python example
Copy the Python snippet from the docs into a script, replace key, run it. Verify:
- No import errors
- `data['metadata']['transaction_count']` accessible
- `response.headers['X-TF-Processing-Time']` header exists

### 3b. Node.js example
Copy the Node.js snippet, run with `node --experimental-modules`. Verify:
- Fetch succeeds
- `data.metadata.transaction_count` prints correctly

### 3c. cURL example
Run the cURL from the Authentication section verbatim (with real key). Verify it works.

## Phase 4: Add Automated Tests

### 4a. Backend integration test — `backend/tests/test_api_integration.py`
New file with live-endpoint tests that can run against staging or prod:
- Health check returns 200
- Sources returns valid JSON with expected structure
- Parse with fixture CSV returns expected fields
- Auth failures return proper error codes
- Rate limit headers present in responses

### 4b. Playwright E2E — `e2e/api-docs.spec.ts`
Test the docs page itself renders correctly:
- `/docs/api` loads without errors
- Code examples are visible and properly formatted
- All endpoint tables render
- Links (to `/dashboard/developer`) work
- Mobile responsive layout works

## Phase 5: Verify Docs Accuracy Checklist

After live testing, audit the docs for accuracy:
- [ ] Base URL correct (`https://api.taxformatter.com/v1`)
- [ ] All 4 endpoints listed match actual API Gateway routes
- [ ] Auth header format (`X-API-Key`) matches `api_auth.py` validation
- [ ] Request body fields match `api.py` handler parsing
- [ ] Response shape matches actual responses from Phase 2
- [ ] Error codes table matches `api.py` error handling
- [ ] Rate limit tiers match `api_auth.py` tier definitions
- [ ] MCP server install command works (`npm install -g @taxformatter/mcp-server`)
- [ ] MCP config JSON is valid and works with Claude Code

## Files to Create/Modify

| File | Action |
|------|--------|
| `backend/tests/test_api_integration.py` | Create — live endpoint integration tests |
| `e2e/api-docs.spec.ts` | Create — docs page E2E tests |
| `content/docs/api/index.md` | Fix — any inaccuracies found during testing |

## Verification

1. `cd backend && python -m pytest tests/test_api_integration.py -v` — all integration tests pass
2. `npx playwright test e2e/api-docs.spec.ts` — docs page renders correctly
3. Manual curl tests from Phase 2 all return expected responses
4. Python and Node.js code examples from docs run without errors
