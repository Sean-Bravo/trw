# TaxReadyWallet Architecture

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
S3 trigger → Virus Scanner Lambda
       ↓
If clean → SQS Queue
       ↓
Processor Lambda
  - Parse CSV (13 exchange formats)
  - AI categorization (tier-based)
  - Generate fixed CSV
       ↓
Result → S3
       ↓
User downloads from dashboard
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
│   │   ├── engine.py       # CSV processing (2,973 lines, 13 parsers)
│   │   ├── storage.py      # Neon PostgreSQL operations
│   │   └── fingerprinting.py # Exchange format detection
│   ├── handlers/           # AWS Lambda handlers
│   │   ├── webhook.py      # API Gateway (presigned URLs, job status)
│   │   ├── scanner.py      # S3 trigger (file validation)
│   │   └── processor.py    # SQS trigger (CSV processing)
│   ├── terraform/          # Infrastructure as Code
│   │   ├── main.tf         # Core config + outputs
│   │   ├── lambda.tf       # Lambda functions + IAM
│   │   ├── s3.tf           # Buckets (uploads, results, lambda)
│   │   ├── sqs.tf          # Processing queue + DLQ
│   │   ├── api_gateway.tf  # HTTP API routes
│   │   ├── monitoring.tf   # CloudWatch alarms + dashboard
│   │   ├── ses.tf          # Email configuration
│   │   └── waf.tf          # Web Application Firewall
│   ├── deploy.sh           # Lambda packaging + deploy script
│   └── ENV.md              # Environment variable docs
│
├── db/
│   └── schema.sql          # PostgreSQL DDL
│
└── docs/                   # Documentation
```

## Database Schema

7 tables in Neon PostgreSQL:

| Table | Purpose |
|-------|---------|
| `users` | User accounts (email, password_hash) |
| `accounts` | OAuth provider links (Google) |
| `subscriptions` | Stripe subscription + tier (free/pro/premium) |
| `uploads` | CSV file metadata + S3 keys |
| `jobs` | Processing jobs + status + results |
| `transactions` | Parsed transactions (for AI features) |
| `ai_cache` | Cached AI categorizations |

## Subscription Tiers

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 1 file/month, 5-row preview, ClamAV scan |
| Pro | $89/year | Unlimited files, full export, Claude Haiku AI |
| Premium | $189/year | All Pro + Claude Opus AI, priority support |

## Supported Exchanges

The Python engine (`backend/services/engine.py`) parses:

1. Binance
2. Coinbase
3. Kraken
4. KuCoin
5. Bybit
6. Gemini
7. Crypto.com
8. FTX
9. Bitfinex
10. OKX
11. Robinhood
12. PayPal/Venmo
13. Cash App

## Export Formats

- Koinly
- TurboTax
- CoinLedger
- ZenLedger
- OFX

## Key Files

| File | What It Does |
|------|--------------|
| `app/api/uploads/presigned-url/route.ts` | Generates S3 upload URLs |
| `app/api/uploads/[uploadId]/confirm/route.ts` | Confirms upload, creates job |
| `app/api/jobs/[jobId]/download/route.ts` | Generates S3 download URLs |
| `lib/upload-client.ts` | Frontend upload flow (3-stage progress) |
| `lib/auth-db.ts` | User registration, login, 2FA, password reset |
| `backend/services/engine.py` | Core CSV processing engine |
| `backend/services/fingerprinting.py` | Exchange format detection |

## External Dependencies

| Service | Purpose | Config |
|---------|---------|--------|
| Neon | PostgreSQL database | `DATABASE_URL` |
| AWS S3 | File storage (uploads, results) | Managed by Terraform |
| AWS SQS | Job queue | Managed by Terraform |
| AWS Lambda | Python processing (3 functions) | Managed by Terraform |
| AWS API Gateway | Lambda HTTP API | `API_GATEWAY_URL` |
| AWS Secrets Manager | Sensitive config | Managed by Terraform |
| Stripe | Payments | `STRIPE_*` env vars |
| Google OAuth | Social login | `GOOGLE_CLIENT_*` |
| Sentry | Error tracking | `SENTRY_*` env vars |
| AWS SES | Email | Managed by Terraform |

## Known Gotchas

1. **Lambda concurrency** - SQS trigger limited to 10 concurrent executions
2. **No VPC** - Lambdas connect directly to Neon (public internet) for faster cold starts
3. **Presigned URLs** - Upload URLs expire in 15 min, download URLs in 1 hour

## What's Complete

- [x] **Lambda deployment** - Terraform + deploy.sh fully configured
- [x] **S3 + SQS setup** - 3 buckets (uploads, results, lambda) + processing queue with DLQ
- [x] **Scanner Lambda** - File validation (size, type, security checks)
- [x] **Processor Lambda** - Integrates with engine.py for CSV processing
- [x] **Webhook Lambda** - API Gateway routes for presigned URLs, job status, downloads
- [x] **WAF protection** - Rate limiting, SQL injection, XSS prevention
- [x] **CloudWatch monitoring** - Alarms, dashboard, log insights
- [x] Real-time job status polling (useJobPolling hook + JobContext)
- [x] AI insights panel connected to backend results
- [x] Frontend test coverage (62 tests across 5 suites)
- [x] Stripe webhooks (checkout, subscription updates, cancellation)
- [x] Email templates (verification, password reset, welcome, subscription)
- [x] Fingerprinting cache migrated to Neon PostgreSQL

## What's Not Built Yet

- [ ] AI analysis integration in processor Lambda (tier-based)
- [ ] Bank statement PDF parsing (future feature)

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
