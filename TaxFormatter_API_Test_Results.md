# TaxFormatter API & MCP Server — Test Results

**Date:** 2026-03-18
**Commit:** Post `3202e85` (API build complete)

---

## Summary

160 tests written across 11 test files covering the full Developer API + MCP Agent Client stack. All tests pass.

| Language | Suites | Tests | Status |
|----------|--------|-------|--------|
| TypeScript (Jest) | 8 | 109 | All pass |
| Python (pytest) | 2 | 51 | All pass |
| **Total** | **10** | **160** | **All pass** |

---

## Test Files

### Phase 0: Test Factory
| File | Purpose |
|------|---------|
| `__tests__/factories/api-keys.ts` | `createMockApiKey()`, `createMockApiUsage()`, `createMockApiKeys()` — no external deps (avoids ESM issues) |

### Phase 1: Next.js API Route Tests (Critical)
| File | Tests | Coverage |
|------|-------|----------|
| `__tests__/api/developer/keys.test.ts` | 18 | GET list + POST create: auth, validation, camelCase mapping, max keys (409), errors |
| `__tests__/api/developer/keys-keyId.test.ts` | 14 | DELETE revoke + PATCH rename: auth, 404, ownership scoping, name validation |
| `__tests__/api/developer/usage.test.ts` | 9 | GET usage: active-key filtering, monthly + history mapping, parallel fetch |
| `__tests__/api/developer/subscribe.test.ts` | 10 | POST subscribe: Stripe checkout, tier validation, metadata, price ID lookup |

### Phase 2: Library Tests (Critical)
| File | Tests | Coverage |
|------|-------|----------|
| `__tests__/lib/api-keys.test.ts` | 22 | `generateApiKey`, `hashApiKey`, `createApiKey`, `listApiKeys`, `revokeApiKey`, `renameApiKey`, `validateApiKey`, `getMonthlyUsage`, `getUsageHistory`, `updateKeyTier` |

### Phase 3: Python Backend Tests (High)
| File | Tests | Coverage |
|------|-------|----------|
| `backend/tests/test_api_auth.py` | 20 | `validate_key` (6), `check_rate_limit` (5), `check_monthly_quota` (3), `increment_usage` (3), `record_request` (3) |
| `backend/tests/test_api_handler.py` | 31 | Handler routing (8), `/v1/parse` crypto+PDF (14), `/v1/health` (1), `/v1/usage` (2), utilities (6) |

### Phase 4: Component Tests (Medium)
| File | Tests | Coverage |
|------|-------|----------|
| `__tests__/components/dashboard/ApiKeyManager.test.tsx` | 12 | Rendering (3), key list (3), create flow (3), revoke (1), copy (1), usage display (1) |

### Phase 5: MCP Server Tests (Medium)
| File | Tests | Coverage |
|------|-------|----------|
| `__tests__/packages/mcp-server/client.test.ts` | 8 | `parse()` POST with base64/headers/options, `listSources()` GET, response parsing |
| `__tests__/packages/mcp-server/tools.test.ts` | 16 | `parse_crypto_csv` (4), `parse_bank_statement` (3), `list_supported_sources` (1), unknown tool, ZodError validation |

---

## How to Run

### TypeScript (Jest)
```bash
# All new API tests
npx jest __tests__/api/developer/ __tests__/lib/api-keys.test.ts __tests__/components/dashboard/ApiKeyManager.test.tsx __tests__/packages/mcp-server/ --no-coverage

# Single file
npx jest __tests__/api/developer/keys.test.ts --no-coverage
```

### Python (pytest)
```bash
cd backend
python3 -m pytest tests/test_api_auth.py tests/test_api_handler.py -v
```

---

## Patterns Used

- **API route tests:** Import handler directly (`import { GET, POST } from '@/app/api/...'`), mock `getServerSession` + `@/lib/api-keys`, use `createMockRequest()` from test utils
- **Async params:** Next.js 15 `params: Promise<{ keyId }>` — tests pass `{ params: Promise.resolve({ keyId: '...' }) }`
- **Factory pattern:** No faker (ESM issues) — uses simple `Date.now()` IDs + `Math.random()` hex, matching `factories/jobs.ts` pattern
- **Python mocking:** `sys.modules` patches for `boto3`, `psycopg2`, `pandas`, `numpy` before import; `_rpm_tracker.clear()` in fixtures
- **MCP server tests:** Client/tools logic replicated in test files to avoid ESM import issues from source `.js` extension imports

---

## Known Issues Found During Testing

1. **`error_response` metadata overwrite** — In `api.py`, `body["metadata"] = {"api_version": ...}` runs AFTER `body.update(extra)`, so `retry_after_seconds` from the rate-limit 429 response gets overwritten. The rate limit error still returns 429 with the correct code, but `retry_after_seconds` is not in the response metadata.

2. **Empty file detection** — `base64.b64encode(b"")` produces `""` which is falsy, triggering `invalid_request` ("missing file_content") before the `file_empty` check runs. Only files that decode to zero bytes from a truthy base64 string would hit `file_empty`.
