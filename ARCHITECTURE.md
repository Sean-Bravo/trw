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
├── backend/                # Python backend (pending merge)
│   ├── services/
│   │   └── engine.py       # CSV processing (2,973 lines)
│   ├── lambda/             # AWS Lambda handlers
│   ├── terraform/          # Infrastructure as Code
│   └── tests/              # pytest suite
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
| Neon | PostgreSQL database | `NEON_DATABASE_URL` |
| AWS S3 | File storage | `AWS_*` env vars |
| AWS SQS | Job queue | `AWS_SQS_QUEUE_URL` |
| Stripe | Payments | `STRIPE_*` env vars |
| Google OAuth | Social login | `GOOGLE_CLIENT_*` |
| Sentry | Error tracking | `SENTRY_*` env vars |
| SendGrid/SES | Email | `SMTP_*` env vars |

## Known Gotchas

1. **2FA login flow** passes base64 password in URL - needs refactor to session/POST
2. **Lambda concurrency** must stay ≤50 to match RDS Proxy connection limit
3. **Fingerprinting cache** currently uses Supabase - needs migration to Neon
4. **Rate limiting** library exists but not applied to all routes yet

## What's Not Built Yet

- [ ] Lambda deployment (Terraform exists, packaging incomplete)
- [ ] Real-time job status polling
- [ ] AI insights panel (UI exists, backend not connected)
- [ ] Comprehensive test coverage for frontend

## Related Docs

- `BACKEND_ARCHITECTURE.md` - Detailed AWS/Lambda specs
- `db/schema.sql` - Full database DDL
- `docs/` - Setup guides (Stripe, Sentry, etc.)
