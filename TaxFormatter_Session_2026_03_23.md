# TaxFormatter — Session Notes 2026-03-23

## Summary

First live API test session. Deployed the API Lambda, ran real curl tests, fixed two bugs, and improved developer UX.

---

## Fixes & Changes

### 1. API Lambda — Empty CSV Crash (`internal_error`)
**File:** `backend/services/engine.py`

**Bug:** Sending a Coinbase statement with no transactions (header-only CSV, 4 lines) returned `internal_error: 'NoneType' object has no attribute 'lower'` instead of a clean error.

**Root cause:** `get_parser()` called `.lower()` on `exchange` without a None guard. Also the empty-file check message was unclear.

**Fix:**
- Added `if not exchange: return None` guard to `ParserRegistry.get_parser()`
- Improved error message for header-only files: `"CSV file has no transaction rows (header only or empty)"`

**Result:** Same curl now returns:
```json
{
  "status": "error",
  "code": "parse_error",
  "message": "CSV file has no transaction rows (header only or empty)"
}
```

---

### 2. Dashboard Nav — Missing Developer Link
**File:** `components/dashboard/DashboardHeader.tsx`

**Bug:** After signup, users had no obvious path to `/dashboard/developer` to generate their `tf_live_` API key. Nav only showed: Dashboard, Settings, Docs.

**Fix:** Added "Developer" nav link to both desktop and mobile menus.

---

### 3. Quick Start — No Docs Link or Key Hint
**File:** `components/dashboard/ApiKeyManager.tsx`

**Bug:** The Quick Start code block showed `YOUR_API_KEY` with no guidance on where to get it, and no link to the full API docs.

**Fix:**
- Added "Full API docs →" link (`/docs/api`) in the Quick Start header
- Added helper text: "Replace `YOUR_API_KEY` with the key you created above."

---

### 4. Tailwind Canonical Warnings (DashboardHeader)
**File:** `components/dashboard/DashboardHeader.tsx`

**3 warnings fixed:**
| Old | New |
|-----|-----|
| `bg-gradient-to-r` (×2) | `bg-linear-to-r` |
| `max-w-[180px]` | `max-w-45` |

---

### 5. Live API Test Script
**File:** `backend/tests/test_live_api.sh`

New comprehensive bash test script covering:
- Health check, sources endpoint
- Auth validation (missing key, bad key, valid key)
- Usage endpoint
- Input validation (missing fields, bad base64, wrong extension, invalid format)
- All 14 exchange fixtures
- All 4 output formats (Koinly, TurboTax, CoinLedger, ZenLedger)
- Explicit exchange override
- Edge cases (UTF-8 BOM, Windows line endings, unicode, 1k/10k rows)
- Ambiguous file rejection
- Response headers (`X-TF-Processing-Time`, `X-Api-Version`, CORS)
- Error response shape

---

## Live API Test Results

Tested against `https://api.taxformatter.com/v1/parse` using fixture files:

| Exchange | Status | Transactions |
|----------|--------|-------------|
| Binance | ✅ success | 3 |
| Coinbase | ✅ success | 4 |
| Kraken | ✅ success | 2 |
| Bybit | ✅ success | 3 |
| Gemini | ✅ success | 1 |
| Crypto.com | ✅ success | 1 |
| Robinhood | ✅ success | 3 |
| Cash App | ✅ success | 2 |
| KuCoin | ✅ success | 3 |

**9/9 exchanges parsing correctly on live API.**

---

## Notes

- User's desktop test CSVs (`crypto_test_csvs/`) have simplified/non-standard headers and cannot be used for parser testing — use `backend/tests/fixtures/valid/` instead
- Real Coinbase CSV export tested (January 2026 statement) — correctly identified as header-only/no transactions after fix
- Anthropic API keys (`sk-ant-...`) are unrelated to TaxFormatter API keys (`tf_live_...`) — different systems
- Gmail plus addressing works for test accounts: `email+test1@gmail.com`

---

## Commits

```
c5eb6a1 fix: replace Tailwind canonical warnings in DashboardHeader
0203868 feat: add Developer nav link and API key UX improvements
```
