# Bank Statement Pivot — /upload Landing Page (2026-02-15)

## Why

Google Ads Campaign 2 (Search) targeting crypto CSV keywords ("crypto CSV fix", "fix Binance CSV", etc.) generated **zero impressions** after multiple days. The keyword market is too small — people don't search for these terms in meaningful volume.

Bank statement conversion has **~19,450 monthly searches** across high-intent keywords like "bank statement to CSV", "convert PDF bank statement to Excel", "import bank statement into QuickBooks". The pivot reuses the existing bank statement backend that was already built.

## What Changed

### Commit `917c34d` — Landing page pivot (7 files)

| File | Change |
|---|---|
| `app/upload/page.tsx` | Full rewrite: crypto CSV copy → bank statement conversion copy |
| `app/upload/layout.tsx` | Updated title/description meta for bank statement SEO |
| `app/api/bank/presigned-url/route.ts` | Removed auth gate → anonymous `anon-{ip}` fallback |
| `app/api/bank/process/route.ts` | Removed auth gate + wrapped DB ops in `if (session?.user?.id)` |
| `lib/bank-upload-client.ts` | New file: 3-step bank upload client (presigned URL → S3 PUT → process) |
| `__tests__/components/UploadLandingPage.test.tsx` | Full rewrite: 50 tests updated for bank statement assertions |
| `ARCHITECTURE.md` | Updated to reflect bank statement pivot |

### Commit `b3da1a9` — Download fix (5 files)

First real upload (Chase statement) revealed the flow completed successfully but never gave the user a downloadable file.

**Root cause:** Lambda `/bank/process` processed the PDF and saved the CSV to S3 but did not return a `downloadUrl` in the response. The page discarded the result and showed a "Create Free Account" CTA instead of a download button.

| File | Change |
|---|---|
| `backend/handlers/webhook.py` | Lambda now generates a presigned S3 download URL and returns `downloadUrl` + `resultKey` in the `/bank/process` response |
| `app/api/bank/job/[jobId]/download/route.ts` | Removed auth gate — anonymous downloads allowed (gated by knowing the UUID) |
| `app/upload/page.tsx` | Captures result; shows transaction count, detected bank, and a **Download CSV** button |
| `lib/bank-upload-client.ts` | Added `jobId` and `outputFormat` to `BankProcessResponse` type |
| `__tests__/components/UploadLandingPage.test.tsx` | 52 tests (2 new: download button + fallback when no URL) |

### Landing Page Copy

- **Hero:** "Upload your bank statement. Get a clean CSV back."
- **Badge:** "PROBLEM: Can't import your bank statement?"
- **Upload zone:** "Drop your bank statement PDF here" (accepts `.pdf` only, 50MB limit)
- **Pain cards:** QuickBooks / Xero / Excel error messages about bank statement PDFs
- **Banks:** Chase, Bank of America, Wells Fargo, Citi, Capital One, US Bank, PNC, TD Bank, Mercury, Navy Federal, Regions, HSBC, BMO (13 total)
- **Output formats:** CSV, QuickBooks (QBO), Xero, Excel
- **Bottom CTA:** "Convert My Statement for Free"

### Upload Flow

```
User drops PDF → validateBankFile() → POST /api/bank/presigned-url
  → S3 presigned PUT (application/pdf) → POST /api/bank/process
  → Lambda (pdfplumber extracts transactions) → returns downloadUrl
  → Page shows "Download CSV" button with presigned S3 link
```

Progress labels: "Detecting bank format..." → "Uploading your statement..." → "Extracting transactions..."

### Success State

After processing completes, the page displays:
- **Transaction count:** "42 transactions extracted!" (or "Statement converted!" if count unavailable)
- **Detected bank:** "Detected: Chase" (if identified)
- **Format selector:** 4 buttons — CSV (default), QBO, Xero, Excel. Switching fetches a new presigned URL instantly (all formats pre-generated)
- **Download button:** Green "Download CSV" button (label updates to match selected format)
- **Fallback:** "Create Free Account" link if `downloadUrl` is not returned (e.g., Lambda version mismatch)

### Anonymous Access Pattern

Same pattern used for the crypto CSV `/upload` page (commit `98866ec`):

```typescript
const session = await getServerSession(authOptions);
const userId = session?.user?.id || `anon-${identifier}`;
```

**DB constraint workaround:** `bank_jobs.user_id` has a foreign key to `users(id)`. Anonymous users (`anon-{ip}`) would violate this constraint. Solution: all DB operations are wrapped in `if (session?.user?.id)` — anonymous users get Lambda processing but no database records.

### Conversion Tracking

Events fire to Google Analytics + Google Ads:
- `bank_upload_started` — when a valid PDF begins uploading
- `bank_upload_completed` — after successful processing

## What Already Existed

The bank statement backend was already built and deployed:

- **Lambda function** with pdfplumber for PDF text extraction
- **API Gateway** routes at `api.taxformatter.com/bank/*`
- **Next.js API routes** at `/api/bank/presigned-url` and `/api/bank/process`
- **S3 bucket** for bank statement PDF storage
- **Feature flag** `canAccessBankStatements()` — returns true when `MVP_MODE=true`

The only changes needed were removing the auth gates, creating the client-side upload flow, and adding download URL generation to the Lambda response.

### Commit `e54f822` — Mercury bank support (4 files)

Mercury statement failed with "No transactions found in PDF".

**Root causes:**
1. No Mercury bank config existed — fell back to generic which failed
2. Mercury uses Unicode minus sign (U+2212) in amounts like "−$60.47" — `_clean_amount()` didn't normalize it
3. Mercury uses "Mon DD" date format (e.g., "May 03") — no date pattern supported this

| File | Change |
|---|---|
| `backend/configs/banks/mercury.yaml` | **New.** Mercury bank config with fingerprint, logo patterns, "Mon DD" date format |
| `backend/services/bank_statement/extractor.py` | Added "Mon DD" date pattern; normalized Unicode minus signs (U+2212, U+2013, U+2014) in `_clean_amount()` |
| `app/upload/page.tsx` | Added Mercury to BANKS array (12 banks) |
| `__tests__/components/UploadLandingPage.test.tsx` | Updated bank count assertion to 12 |

**Result:** 4 transactions extracted from Mercury test statement. CSV has quality issues (junk header rows, balance vs amount, description contamination) — not yet fixed.

### Commit `3d684c2` — Navy Federal bank support (6 files)

Navy Federal statement failed with "No transactions found in PDF".

**Root causes:**
1. No Navy Federal config — generic fallback failed
2. Uses MM-DD dates with hyphens ("01-08") instead of slashes
3. Uses trailing minus for debits ("55,000.00-", "20.00 -")
4. No structured tables — pdfplumber finds 0 tables on transaction pages, requires text extraction fallback
5. Broken text from PDF rendering ("Wire Fe e" instead of "Wire Fee")

| File | Change |
|---|---|
| `backend/configs/banks/navy_federal.yaml` | **New.** Navy Federal config with fingerprint (NCUA marker), MM-DD format, multiline descriptions |
| `backend/services/bank_statement/extractor.py` | Added "MM-DD" date pattern to `_build_date_pattern()`; improved trailing minus regex in `_parse_text_line()` |
| `backend/services/bank_statement/normalizer.py` | Added `%m-%d` format to `formats_to_try` for hyphen-separated dates |
| `app/upload/page.tsx` | Added Navy Federal to BANKS array + upload zone subtitle (13 banks) |
| `__tests__/components/UploadLandingPage.test.tsx` | Updated bank count assertion to 13 |
| Lambda | Redeployed via `./deploy.sh deploy` |

**Result:** 20 transactions extracted from Navy Federal test statement. CSV has quality issues (broken text, multiline descriptions, balance rows) — not yet fixed.

### Commit `fe285be` — Output format selector (5 files)

Users could only download CSV. Now the success state shows a format selector (CSV, QBO, Xero, Excel) with CSV as the default.

**Key design decision:** Lambda now generates all 4 format outputs during processing. PDF extraction is the expensive step; re-exporting normalized transactions to different CSV column layouts is trivial. This means format switching on the frontend is instant — just fetches a new presigned URL from S3.

| File | Change |
|---|---|
| `app/upload/page.tsx` | Added `FORMAT_OPTIONS` array, `selectedFormat`/`isChangingFormat` state, format selector buttons in success state, `handleFormatChange()` fetches new download URL via `/api/bank/job/{jobId}/download?format=xxx` |
| `lib/bank-upload-client.ts` | Added `csv` to `BankOutputFormat` type, default changed from `excel` to `csv` |
| `app/api/bank/job/[jobId]/download/route.ts` | Default format changed from `qbo` to `csv` |
| `backend/handlers/webhook.py` | Added `csv` to valid formats, default changed from `qbo` to `csv`, Lambda now generates all 4 format files (`output_csv.csv`, `output_qbo.csv`, `output_xero.csv`, `output_excel.csv`) after extraction |
| `__tests__/components/UploadLandingPage.test.tsx` | 54 tests (2 new: format selector buttons render, "Download CSV" default label) |

---

## Bank Processing Pipeline

```
PDF Upload → S3
       ↓
Lambda /bank/process
       ↓
pdfplumber extracts text + tables
       ↓
BankFingerprinter scores against YAML configs
  (unique_markers: 20pts, logo_patterns: 10pts, header_patterns: 5pts)
       ↓
TransactionExtractor:
  1. Try table extraction first (pdfplumber.extract_tables)
  2. If no tables → text fallback (regex line parsing)
       ↓
TransactionNormalizer:
  - Date normalization (multiple format support)
  - Amount cleaning (Unicode minus, trailing minus, currency symbols)
  - Deduplication
       ↓
Export all 4 formats (CSV, QBO, Xero, Excel) → S3
       ↓
Generate presigned download URL for requested format → return to frontend
```

## Supported Bank Configs

| Bank | Config File | Date Format | Special Handling |
|------|------------|-------------|------------------|
| Chase | `chase.yaml` | MM/DD | Table extraction works well |
| Bank of America | `bofa.yaml` | MM/DD/YYYY | Pre-existing config |
| Wells Fargo | `wells_fargo.yaml` | MM/DD | Pre-existing config |
| Citi | `citi.yaml` | MM/DD | Pre-existing config |
| Capital One | `capital_one.yaml` | MM/DD/YYYY | Pre-existing config |
| Mercury | `mercury.yaml` | Mon DD | Unicode minus signs, no tables |
| Navy Federal | `navy_federal.yaml` | MM-DD | Trailing minus debits, broken PDF text, no tables |

Banks without configs (Citi, US Bank, PNC, TD Bank, Regions, HSBC, BMO) rely on generic extraction — not yet tested.

## Testing

54 tests passing — covers rendering, drag-and-drop, file validation, upload progress states, success/error flows, format selector, download button, conversion tracking events, and reset cycles.

```bash
npx jest --testPathPatterns=UploadLandingPage  # 54 passed, 1.1s
```

## Known CSV Quality Issues

### Mercury
- Junk rows from header text parsed as transactions
- Amount column showing balance instead of transaction amount
- Description containing card icon data leaked from other columns

### Navy Federal
- Broken text from PDF rendering ("Wire Fe e" instead of "Wire Fee")
- Multiline POS Debit descriptions have amounts leaking into description
- "Beginning Balance" and "Ending Balance" parsed as transactions

## Next Steps

1. **Test Bank of America** — has pre-existing `bofa.yaml` config, user testing soon
2. **Fix Mercury CSV quality** — filter junk rows, correct amount column, clean descriptions
3. **Fix Navy Federal CSV quality** — fix broken text, filter balance rows, handle multiline descriptions
4. **Update Google Ads Campaign 2** — swap crypto CSV keywords for bank statement keywords, update ad copy
5. **Monitor S3** — verify PDFs land in the bank statement bucket from ad traffic
6. **Stripe integration** — gate output downloads behind payment once free beta validates demand
7. **Account linking** — let anonymous uploaders claim their processed files after signup
