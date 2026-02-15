# Bank Statement Pivot — /upload Landing Page (2026-02-15)

## Why

Google Ads Campaign 2 (Search) targeting crypto CSV keywords ("crypto CSV fix", "fix Binance CSV", etc.) generated **zero impressions** after multiple days. The keyword market is too small — people don't search for these terms in meaningful volume.

Bank statement conversion has **~19,450 monthly searches** across high-intent keywords like "bank statement to CSV", "convert PDF bank statement to Excel", "import bank statement into QuickBooks". The pivot reuses the existing bank statement backend that was already built.

## What Changed

### Commit `917c34d` — 7 files, 6 logical changes

| File | Change |
|---|---|
| `app/upload/page.tsx` | Full rewrite: crypto CSV copy → bank statement conversion copy |
| `app/upload/layout.tsx` | Updated title/description meta for bank statement SEO |
| `app/api/bank/presigned-url/route.ts` | Removed auth gate → anonymous `anon-{ip}` fallback |
| `app/api/bank/process/route.ts` | Removed auth gate + wrapped DB ops in `if (session?.user?.id)` |
| `lib/bank-upload-client.ts` | New file: 3-step bank upload client (presigned URL → S3 PUT → process) |
| `__tests__/components/UploadLandingPage.test.tsx` | Full rewrite: 50 tests updated for bank statement assertions |
| `ARCHITECTURE.md` | Updated to reflect bank statement pivot |

### Landing Page Copy

- **Hero:** "Upload your bank statement. Get a clean CSV back."
- **Badge:** "PROBLEM: Can't import your bank statement?"
- **Upload zone:** "Drop your bank statement PDF here" (accepts `.pdf` only, 50MB limit)
- **Pain cards:** QuickBooks / Xero / Excel error messages about bank statement PDFs
- **Banks:** Chase, Bank of America, Wells Fargo, Citi, Capital One, US Bank, PNC, TD Bank, Regions, HSBC, BMO
- **Output formats:** CSV, QuickBooks (QBO), Xero, Excel
- **Bottom CTA:** "Convert My Statement for Free"

### Upload Flow

```
User drops PDF → validateBankFile() → POST /api/bank/presigned-url
  → S3 presigned PUT (application/pdf) → POST /api/bank/process
  → Lambda (pdfplumber extracts transactions) → returns CSV/QBO/Excel
```

Progress labels: "Detecting bank format..." → "Uploading your statement..." → "Extracting transactions..."

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

The only changes needed were removing the auth gates and creating the client-side upload flow.

## Testing

50 tests passing — covers rendering, drag-and-drop, file validation, upload progress states, success/error flows, conversion tracking events, and reset cycles.

```bash
npx jest --testPathPatterns=UploadLandingPage  # 50 passed, 1.3s
```

## Next Steps

1. **Update Google Ads Campaign 2** — swap crypto CSV keywords for bank statement keywords, update ad copy
2. **Monitor S3** — verify PDFs land in the bank statement bucket from ad traffic
3. **Stripe integration** — gate output downloads behind payment once free beta validates demand
4. **Account linking** — let anonymous uploaders claim their processed files after signup
