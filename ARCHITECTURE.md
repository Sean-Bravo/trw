# TaxFormatter Architecture

> High-level system overview. For detailed backend specs, see `BACKEND_ARCHITECTURE.md`.

## What This Is

A crypto CSV repair and tax categorization tool. Users upload messy exchange exports, we fix formatting issues, categorize transactions with AI, and export clean files for tax software (Koinly, TurboTax, CoinLedger, ZenLedger).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind v4 |
| Auth | NextAuth (Google OAuth + email/password + 2FA) |
| Database | Neon (PostgreSQL) |
| File Storage | AWS S3 (presigned URLs) |
| Job Queue | AWS SQS |
| Processing | AWS Lambda (Python) |
| Payments | Stripe |
| Email | Nodemailer (SendGrid/SES) |
| Monitoring | Sentry |

## System Flow

```
User uploads CSV
       ↓
Frontend → S3 (presigned URL)
       ↓
Frontend calls /api/uploads/[uploadId]/confirm
       ↓
Confirm route:
  - Calls Lambda /confirm-upload
  - Persists upload + job to Neon DB (queued status)
  - Returns jobId to frontend
       ↓
S3 trigger → Scanner Lambda
  - Validates file (size, type, security)
  - Sends message to SQS queue
       ↓
SQS → Processor Lambda
  - Parse CSV (13 exchange formats)
  - AI categorization (tier-based)
  - Generate fixed CSV (Koinly format internally) or error.json
  - Generate AI insights
       ↓
Result → S3 (output.csv + insights.json OR error.json)
       ↓
Frontend polls /api/jobs/[jobId] every 2.5s
  - Checks Neon DB first (terminal states: succeeded/failed)
  - Falls back to Lambda for live status
  - Syncs terminal status back to DB
       ↓
User sees real-time updates:
  - "Scanning file for viruses..."
  - "Analyzing transactions (X found)..."
  - "Processing failed: [error]" or "Analysis complete"
       ↓
User selects tax software format (Koinly/TurboTax/CoinLedger/ZenLedger)
       ↓
Download converts to selected format on-the-fly
       ↓
User downloads formatted CSV (persists after sign out)
```

## Directory Structure

```
trw/
├── app/                    # Next.js App Router
│   ├── api/                # API routes
│   │   ├── auth/           # NextAuth + 2FA endpoints
│   │   ├── uploads/        # Presigned URL generation
│   │   ├── jobs/           # Job status + download
│   │   ├── checkout/       # Stripe checkout
│   │   └── webhooks/       # Stripe webhooks
│   ├── dashboard/          # Protected user area
│   ├── login/              # Auth pages
│   ├── signup/
│   ├── upload/              # Google Ads landing page (noindex, dark theme)
│   └── [marketing pages]
│
├── components/
│   ├── dashboard/          # FileUploader, JobHistoryTable, etc.
│   ├── marketing/          # Hero, Pricing, FAQ, etc.
│   └── ui/                 # Base components
│
├── lib/                    # Business logic
│   ├── auth-db.ts          # User/auth database ops
│   ├── upload-client.ts    # S3 upload flow
│   ├── jobs-db.ts          # Job database ops
│   ├── 2fa.ts              # TOTP/backup codes
│   ├── validation.ts       # Input validation (Zod)
│   ├── stripe.ts           # Stripe helpers
│   └── email.ts            # Email sending
│
├── backend/                # Python backend
│   ├── services/
│   │   ├── engine.py       # CSV processing (3,600+ lines, 13 parsers)
│   │   ├── format_converter.py # Lightweight tax format conversion (no deps)
│   │   ├── storage.py      # Neon PostgreSQL operations
│   │   ├── fingerprinting.py # Exchange format detection
│   │   └── ai_insights.py  # Tiered AI analysis (Gemini/Sonnet/Opus)
│   ├── handlers/           # AWS Lambda handlers
│   │   ├── webhook.py      # API Gateway (presigned URLs, job status, downloads, insights)
│   │   ├── scanner.py      # S3 trigger (file validation)
│   │   └── processor.py    # SQS trigger (CSV processing + AI insights)
│   ├── terraform/          # Infrastructure as Code
│   │   ├── main.tf         # Core config + outputs
│   │   ├── lambda.tf       # Lambda functions + IAM
│   │   ├── s3.tf           # Buckets (uploads, results, lambda)
│   │   ├── sqs.tf          # Processing queue + DLQ
│   │   ├── api_gateway.tf  # HTTP API routes + custom domain (api.taxformatter.com)
│   │   ├── monitoring.tf   # CloudWatch alarms + dashboard
│   │   ├── ses.tf          # Email configuration
│   │   └── waf.tf          # Web Application Firewall
│   ├── deploy.sh           # Lambda packaging + deploy script
│   ├── requirements-webhook.txt   # Minimal deps (psycopg2 only)
│   ├── requirements-scanner.txt   # No external deps
│   ├── requirements-processor.txt # Full deps (pandas, anthropic)
│   └── ENV.md              # Environment variable docs
│
├── db/
│   └── schema.sql          # PostgreSQL DDL
│
└── docs/                   # Documentation
```

## Database Schema

8 tables in Neon PostgreSQL:

| Table | Purpose |
|-------|---------|
| `users` | User accounts (email, password_hash) |
| `accounts` | OAuth provider links (Google) |
| `subscriptions` | Stripe subscription + tier (free/pro/premium) |
| `uploads` | CSV file metadata + S3 keys |
| `jobs` | Processing jobs + status + results |
| `transactions` | Parsed transactions (for AI features) |
| `ai_cache` | Cached AI categorizations |
| `downloads` | Free tier download tracking (3/month limit) |

## Subscription Tiers

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 3 downloads/month, full export, Google Gemini AI |
| Pro | $89/year | Unlimited downloads, Claude Sonnet AI |
| Premium | $189/year | All Pro + Claude Opus AI, priority support |

## AI Tiers

| Tier | Provider | Model | Notes |
|------|----------|-------|-------|
| Free | Google | gemini-1.5-flash | Free API, basic insights |
| Pro | Anthropic | claude-sonnet-4 | Balanced quality/cost |
| Premium | Anthropic | claude-opus-4 | Best quality analysis |

## Supported Exchanges

The Python engine (`backend/services/engine.py`) parses 14 exchanges:

| # | Exchange | Date Format | TZ | Notes |
|---|----------|-------------|-----|-------|
| 1 | Coinbase | ISO 8601 UTC (YYYY-MM-DDTHH:mm:ss.SSSZ) | UTC | 10 columns, includes Coinbase Pro |
| 2 | Kraken | YYYY-MM-DD HH:MM:SS | UTC | ZIP delivery (ledgers.csv) |
| 3 | Gemini | YYYY-MM-DD HH:MM:SS | UTC | XLSX format - requires conversion |
| 4 | Binance | YYYY-MM-DD HH:MM:SS | UTC+0 | .tar.gz compressed, max 10K rows |
| 5 | Robinhood | M/D/YYYY | Local | US date format, 1 year history |
| 6 | Crypto.com | YYYY-MM-DD HH:MM:SS | UTC | Multi-file export |
| 7 | PayPal | MM/DD/YYYY | Variable | 4 cryptos only, skip metadata lines |
| 8 | Cash App | YYYY-MM-DDTHH:MM:SSZ (ISO 8601 UTC) | UTC | BTC only |
| 9 | Venmo | YYYY-MM-DDTHH:MM:SS (ISO 8601) | Local | Skip metadata rows (first + last line) |
| 10 | KuCoin | Unix timestamp (ms) or YYYY-MM-DD HH:MM:SS | UTC | 5/day limit, max 1 year |
| 11 | Bybit | Unix timestamp (ms) or YYYY-MM-DD HH:mm:ss | UTC | ZIP archives, format changes frequently |
| 12 | FTX | ISO 8601 + microseconds | UTC | Bankrupt - historical via claims.ftx.com |
| 13 | Bitfinex | Various | UTC | Standard CSV export |
| 14 | OKX | Various (time/trade_time columns) | UTC | Formerly OKEx, spot & derivatives |

### Implementation Notes

- **Internal storage**: Koinly format (most flexible) - convert on download
- **Compressed archives**: Binance (.tar.gz), Kraken/Bybit (.zip)
- **XLSX conversion**: Gemini exports require pre-processing
- **Unix timestamps**: KuCoin/Bybit - check if ms or seconds
- **Metadata rows**: Venmo (first few + last line), PayPal (top lines)
- **Date normalization**: All dates converted to UTC ISO 8601 for internal storage

## Export Formats

User selects output format at download time via `TaxSoftwareSelector` component.

| Format | Description | Columns |
|--------|-------------|---------|
| Koinly | Universal Template (YYYY-MM-DD HH:mm:ss) | Date, Sent Amount, Sent Currency, Received Amount, Received Currency, Fee Amount, Fee Currency, Label, TxHash, Description |
| TurboTax | Form 8949 Gain/Loss Report (MM/DD/YYYY) | Currency Name, Purchase Date, Cost Basis, Date Sold, Proceeds |
| CoinLedger | Universal Manual Import (MM/DD/YYYY HH:mm:ss) | Timestamp, Type, Asset Received, Amount Received, Asset Sent, Amount Sent, Fee Asset, Fee Amount |
| ZenLedger | Custom CSV (UTC 24hr) | Timestamp, Type, IN Amount, IN Currency, OUT Amount, OUT Currency, Fee Amount, Fee Currency, Exchange, US-Based |

Format conversion happens on-demand at download time (`webhook.py:handle_download`) using `format_converter.py`. Converted files are cached in S3 (`output_{format}.csv`) for subsequent downloads. The converter module has zero external dependencies for minimal Lambda package size.

## Key Files

| File | What It Does |
|------|--------------|
| `app/api/uploads/presigned-url/route.ts` | Generates S3 upload URLs |
| `app/api/uploads/[uploadId]/confirm/route.ts` | Confirms upload, persists to Neon DB, creates job |
| `app/api/jobs/route.ts` | Lists all jobs for user (from Neon DB) |
| `app/api/jobs/[jobId]/route.ts` | Job status - DB first, Lambda fallback, syncs terminal states |
| `app/api/jobs/[jobId]/download/route.ts` | Generates S3 download URLs with format conversion |
| `app/api/jobs/[jobId]/insights/route.ts` | Fetches AI insights for job |
| `lib/upload-client.ts` | Frontend upload flow (3-stage progress) + `getJobInsights()` |
| `lib/uploads-db.ts` | Upload database operations (createUpload, getUploadById) |
| `lib/jobs-db.ts` | Job database operations (createJob, updateJobStatus, getJobById) |
| `hooks/useJobPolling.ts` | Polls job status every 2.5s until terminal state |
| `contexts/JobContext.tsx` | Global job state (activeJob, jobHistory, refreshJobHistory) |
| `components/dashboard/AIInsightsPanel.tsx` | AI insights display with real-time status updates + download section |
| `components/dashboard/TaxSoftwareSelector.tsx` | Tax software format selection for downloads |
| `components/dashboard/DiffViewer.tsx` | Changes preview with processing/error states |
| `components/dashboard/JobHistoryTable.tsx` | Job history with filename, status, error display |
| `lib/auth-db.ts` | User registration, login, 2FA, password reset |
| `backend/services/engine.py` | Core CSV processing engine |
| `backend/services/format_converter.py` | Lightweight tax format conversion (Koinly→TurboTax/CoinLedger/ZenLedger) |
| `backend/services/fingerprinting.py` | Exchange format detection |
| `backend/services/ai_insights.py` | Tiered AI insights (Gemini/Sonnet/Opus) |

## External Dependencies

| Service | Purpose | Config |
|---------|---------|--------|
| Neon | PostgreSQL database | `DATABASE_URL` |
| AWS S3 | File storage (uploads, results) | Managed by Terraform |
| AWS SQS | Job queue | Managed by Terraform |
| AWS Lambda | Python processing (3 functions) | Managed by Terraform |
| AWS API Gateway | Lambda HTTP API | `api.taxformatter.com` |
| AWS Secrets Manager | Sensitive config | Managed by Terraform |
| Stripe | Payments | `STRIPE_*` env vars |
| Google OAuth | Social login | `GOOGLE_CLIENT_*` |
| Sentry | Error tracking | `SENTRY_*` env vars, tunnel via `/monitoring` |
| AWS SES | Email | Managed by Terraform |

## Known Gotchas

1. **Sentry tunnel** - Client errors route through `/monitoring` to bypass ad blockers. The `tunnelRoute` in `next.config.ts` creates rewrites, and `tunnel: "/monitoring"` in `instrumentation-client.ts` tells the SDK to use it. The `diagnoseSdkConnectivity()` check doesn't respect the tunnel and may show false warnings.
2. **Lambda concurrency** - SQS trigger limited to 10 concurrent executions
3. **No VPC** - Lambdas connect directly to Neon (public internet) for faster cold starts
4. **Presigned URLs** - Upload URLs expire in 15 min, download URLs in 1 hour
5. **Job status polling** - Frontend polls every 2.5s; for non-terminal DB status (queued/running), API checks Lambda for latest status and syncs back
6. **Coinbase CSV format** - Has metadata rows before headers (line 1: "Transactions", line 2: user info) - engine.py skips these automatically via keyword-based header detection
7. **Exchange detection fallback** - When classification fails, engine.py auto-tries GenericCSVParser if file has date+amount columns. Only shows manual selector if generic also fails.

## Exchange Detection Flow

```
CSV Upload
    ↓
fingerprinting.py: detect_exchange_from_headers()
    ↓
┌─────────────────────────────────────────────────┐
│ Match found? → Use specific exchange parser     │
│                                                 │
│ No match + has date/amount columns?             │
│   → Try GenericCSVParser automatically          │
│   → Success: Return data with warning           │
│   → Failure: Show ExchangeSelector UI           │
│                                                 │
│ No match + missing basic columns?               │
│   → Show ExchangeSelector UI with analysis      │
│   → User selects exchange → Retry with parser   │
└─────────────────────────────────────────────────┘
```

**ExchangeSelector UI** (`components/dashboard/ExchangeSelector.tsx`):
- Shows column analysis (✓/✗ for date, amount, type columns)
- Displays detected column names from the file
- Dropdown of all supported exchanges + "Generic CSV" option
- Retry button triggers `/api/jobs/[jobId]/retry` with `exchangeName` override

## What's Complete

- [x] **Lambda deployment** - Terraform + deploy.sh fully configured
- [x] **S3 + SQS setup** - 3 buckets (uploads, results, lambda) + processing queue with DLQ
- [x] **Scanner Lambda** - File validation (size, type, security checks)
- [x] **Processor Lambda** - Integrates with engine.py for CSV processing + AI insights
- [x] **Webhook Lambda** - API Gateway routes for presigned URLs, job status, downloads, insights
- [x] **Custom domain** - api.taxformatter.com with ACM SSL certificate
- [x] **AI Insights** - Tiered analysis (Free=Gemini, Pro=Sonnet, Premium=Opus)
- [x] **WAF protection** - Rate limiting, SQL injection, XSS prevention
- [x] **CloudWatch monitoring** - Alarms, dashboard, log insights
- [x] Real-time job status polling (useJobPolling hook + JobContext)
- [x] AI insights panel connected to backend results (AIInsightsPanel.tsx)
- [x] API routes updated to use custom domain (api.taxformatter.com)
- [x] Frontend test coverage (62 tests across 5 suites)
- [x] Stripe webhooks (checkout, subscription updates, cancellation)
- [x] Email templates (verification, password reset, welcome, subscription)
- [x] Fingerprinting cache migrated to Neon PostgreSQL
- [x] 2FA (email-based default + authenticator app + backup codes)
- [x] **Job persistence** - Uploads and jobs saved to Neon DB, persist after sign out
- [x] **Real-time UI updates** - Status messages update every 2.5s during processing
- [x] **DB-Lambda sync** - Terminal job states synced from Lambda to DB on poll
- [x] **Coinbase CSV parsing** - Handles metadata rows, new 2025 format, negative amounts
- [x] **Free tier download limit** - 3 downloads/month tracked in `downloads` table
- [x] **Consolidated exchange detection** - Single source of truth in fingerprinting.py
- [x] **Generic CSV fallback** - Auto-tries generic parser when exchange detection fails (if file has date+amount columns)
- [x] **Manual exchange selection** - ExchangeSelector dropdown for retry with specific exchange when auto-detect fails
- [x] **Enhanced error messages** - Column analysis shows which required columns are present/missing
- [x] **Output format selection** - User picks tax software (Koinly/TurboTax/CoinLedger/ZenLedger) at download time
- [x] **Format converters** - `format_converter.py` converts Koinly format to TurboTax/CoinLedger/ZenLedger on-demand
- [x] **Format caching** - Converted files cached in S3 for subsequent downloads
- [x] **Lightweight webhook Lambda** - Uses `format_converter.py` (no heavy deps) instead of full `engine.py`
- [x] **Download trigger fix** - Changed from `link.click()` to `window.location.href` for S3 presigned URLs (browsers block programmatic clicks on cross-origin links)
- [x] **AI Insights Panel** - Real-time insights display with tiered analysis (Gemini/Sonnet/Opus), quick stats, transaction breakdown, and actionable tax suggestions
- [x] **Transformation Preview (Diff View)** - Side-by-side comparison of original exchange data → converted Koinly format. Shows first 3 rows with "Show more" option. Data saved to S3 as `result.json` containing `original`, `processed`, and `columns` arrays.

## What's Not Built Yet

- [x] **Google Ads landing page** - `/upload` route with conversion tracking (csv_upload_started, csv_upload_completed), noindex, dark theme, real upload flow
- [ ] Bank statement PDF parsing (future feature)
- [ ] Stripe payment integration (Pro/Premium buttons show "Coming Soon")

## Future Features

### Bank Statement Formatter

A PDF-to-CSV converter feature for importing bank statements into QBO/Xero.

**Workflow:** PDF Upload → Extraction → Normalization → Format for QBO/Xero → CSV Download

**Tech Stack:**
- `pdfplumber` / `Tabula-py` for digital PDFs
- AWS Textract for scanned PDFs (OCR) - integrates with existing AWS infra
- Pandas for data cleaning and export

**Key Logic:**
- Transaction detection via regex (date patterns like `^\d{2}/\d{2}/\d{4}`)
- Multiline description handling (append non-date lines to previous row)
- Date normalization with `dateparser` library
- Credit/Debit logic: separate columns → single signed Amount

**Output Formats:**
- Xero CSV: `*Date`, `*Amount`, `Payee`, `Description`, `Reference`, `Check Number`
- QBO CSV: `Date`, `Description`, `Amount` (negative=expense, positive=income)

**MVP Scope:** Digital PDFs only (no OCR), `pdfplumber` extraction, simple upload→download flow

**Access:** Pro/Premium tiers only (not available to free users)

## Related Docs

- `BACKEND_ARCHITECTURE.md` - Detailed AWS/Lambda specs
- `db/schema.sql` - Full database DDL
- `docs/` - Setup guides (Stripe, Sentry, etc.)
