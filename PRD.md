# TaxFormatter - Product Requirements Document

> Product requirements for AI-powered testing with TestSprite

## Product Overview

TaxFormatter is a crypto tax CSV processing tool that transforms messy exchange exports into clean, tax-ready files. The application supports 12+ cryptocurrency exchanges and exports to 4 major tax software platforms.

### Value Proposition
- **Problem**: Cryptocurrency exchange CSV exports are inconsistent, malformatted, and incompatible with tax software
- **Solution**: AI-powered CSV repair, categorization, and format conversion
- **Target Users**: Cryptocurrency traders filing taxes, CPAs handling crypto clients

### Tech Stack
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind v4
- **Auth**: NextAuth (Google OAuth + email/password + 2FA)
- **Database**: Neon PostgreSQL
- **Storage**: AWS S3 (presigned URLs)
- **Processing**: AWS Lambda (Python) + SQS
- **Payments**: Stripe
- **AI**: Google Gemini (Free), Claude Sonnet (Pro), Claude Opus (Premium)

---

## User Flows

### 1. Registration & Authentication

#### 1.1 Email Registration
**Steps:**
1. User enters email and password
2. System validates input (email format, password strength)
3. System creates user record with `email_verified = false`
4. System sends verification email with 6-digit code
5. User enters code
6. System marks user as verified
7. User is logged in

**Validation Rules:**
- Email: Valid format, lowercase, unique
- Password: 8-128 chars, uppercase, lowercase, number, special char

**Rate Limiting:** 5 registration attempts per IP per 15 minutes

#### 1.2 Email Verification
**Steps:**
1. User receives email with 6-digit code
2. User enters code on verification page
3. System validates code (format, expiry, match)
4. User account is activated

**Code Expiry:** 15 minutes
**Resend Limit:** Rate limited

#### 1.3 Login
**Steps:**
1. User enters email and password
2. System validates credentials
3. If 2FA enabled: prompt for TOTP or backup code
4. System creates session (JWT, 30-day expiry)
5. User redirected to dashboard

#### 1.4 Google OAuth
**Steps:**
1. User clicks "Sign in with Google"
2. Redirect to Google OAuth consent
3. User grants permission
4. Callback receives auth code
5. System creates/updates user record
6. User logged in

#### 1.5 Two-Factor Authentication (2FA)
**Setup:**
1. User initiates 2FA setup from settings
2. System generates TOTP secret
3. System displays QR code
4. User scans with authenticator app
5. User enters 6-digit code to verify
6. System generates and displays 8 backup codes
7. 2FA is enabled

**Login with 2FA:**
1. User enters credentials
2. System prompts for TOTP code
3. User enters code from app OR backup code
4. System validates code
5. Access granted

**Disable 2FA:**
1. User requests disable from settings
2. User confirms with current password
3. 2FA is disabled, backup codes deleted

#### 1.6 Password Reset
**Steps:**
1. User clicks "Forgot Password"
2. User enters email
3. System sends reset email with token link (even if email not found, for security)
4. User clicks link
5. User enters new password
6. Password updated, user logged in

**Token Expiry:** 1 hour

---

### 2. CSV Processing Flow

#### 2.1 File Upload
**Steps:**
1. User selects CSV file (drag-drop or file picker)
2. Frontend validates file (size ≤10MB, type CSV)
3. Frontend requests presigned URL from `/api/uploads/presigned-url`
4. Frontend uploads file directly to S3
5. Frontend calls `/api/uploads/[uploadId]/confirm`
6. Backend creates upload and job records in Neon DB
7. S3 trigger invokes Scanner Lambda

**Validation:**
- Max file size: 10MB
- Accepted types: text/csv, application/csv, text/plain
- No path traversal in filename

**Rate Limiting:** 10 uploads per user per hour

#### 2.2 Processing Pipeline
**Steps:**
1. Scanner Lambda validates file (size, type, security)
2. Scanner sends message to SQS queue
3. Processor Lambda picks up message
4. Processor detects exchange format via header fingerprinting
5. Processor parses CSV using appropriate parser (13 parsers)
6. Processor runs AI categorization (tier-based model selection)
7. Processor writes result.json, output.csv, insights.json to S3
8. Processor updates job status in Neon DB

**Exchange Detection:**
- Primary: Header fingerprinting (column names)
- Fallback: Generic CSV parser if date+amount columns present
- Manual: ExchangeSelector UI if detection fails

**Status Updates (polled every 2.5s):**
- `queued` → "Scanning file for viruses..."
- `running` → "Analyzing transactions (X found)..."
- `succeeded` → "Analysis complete"
- `failed` → "Processing failed: [error message]"

#### 2.3 Download
**Steps:**
1. User views completed job
2. User selects tax software format from TaxSoftwareSelector
3. Frontend calls `/api/jobs/[jobId]/download?format={format}`
4. Backend checks download limits (free tier: 3/month)
5. Backend converts from Koinly format to selected format
6. Backend returns presigned download URL
7. User downloads file

**Formats:**
- Koinly Universal Template
- TurboTax Form 8949
- CoinLedger Universal Manual Import
- ZenLedger Custom CSV

---

### 3. Subscription Flow

#### 3.1 Checkout
**Steps:**
1. User clicks upgrade button on pricing page
2. Frontend calls `/api/checkout` with plan and billing period
3. Backend creates Stripe Checkout session
4. User redirected to Stripe
5. User completes payment
6. Stripe sends `checkout.session.completed` webhook
7. Backend updates subscription in Neon DB
8. User redirected to success page

**Plans:**
- Free: $0, 3 downloads/month, Gemini AI
- Pro: $89/year or $9/month, unlimited downloads, Sonnet AI
- Premium: $189/year or $19/month, all Pro + Opus AI

#### 3.2 Webhooks
**Events Handled:**
- `checkout.session.completed` → Create/update subscription
- `customer.subscription.updated` → Sync status, period_end
- `customer.subscription.deleted` → Downgrade to free tier
- `payment_intent.succeeded` → Log for analytics
- `payment_intent.payment_failed` → Log, potential notification

**Security:** Signature verification required

#### 3.3 Customer Portal
**Steps:**
1. User clicks "Manage Subscription" in settings
2. Frontend calls `/api/customer-portal`
3. Backend creates Stripe portal session
4. User redirected to Stripe portal
5. User can update payment method, cancel, reactivate

---

### 4. AI Insights

**Generation:**
1. During processing, AI analyzes transactions
2. AI identifies patterns, categories, tax implications
3. Insights saved to S3 as insights.json

**Display:**
- AIInsightsPanel shows insights after processing completes
- Quick stats: total transactions, categories, time range
- Transaction breakdown by type
- Actionable tax suggestions

**Tiered Models:**
- Free: Google Gemini 1.5 Flash (basic insights)
- Pro: Claude Sonnet 4 (balanced quality/cost)
- Premium: Claude Opus 4 (best analysis)

---

## Security Requirements

### Input Validation
- All user input validated with Zod schemas
- Email: format, lowercase, trim
- Password: strength requirements
- Files: size, type, filename sanitization

### Injection Prevention
- SQL: Parameterized queries only
- XSS: Input sanitization, output encoding
- Path traversal: Filename validation

### Rate Limiting
| Endpoint | Limit | Window |
|----------|-------|--------|
| Auth (register, login, reset) | 5 | 15 min |
| API (general) | 100 | 1 min |
| File Upload | 10 | 1 hour |

### Session Security
- JWT tokens with 30-day expiry
- HttpOnly, Secure cookies (production)
- CSRF token validation

### Data Protection
- Passwords: bcrypt hashed
- 2FA secrets: Encrypted at rest
- S3 files: Server-side encryption
- Database: TLS connections

---

## Performance Requirements

| Metric | Target |
|--------|--------|
| Page load (LCP) | < 2.5s |
| Time to Interactive | < 3.8s |
| API response | < 500ms |
| File processing | < 60s (typical) |
| Lambda timeout | 900s (max) |

---

## Reliability Requirements

- **Uptime Target:** 99.9%
- **Error Handling:** Graceful degradation with user-friendly messages
- **Retry Logic:** Jobs can be retried up to 5 times with 30s cooldown
- **Data Persistence:** Jobs and results persist after logout

---

## Supported Exchanges

| Exchange | Date Format | Notes |
|----------|-------------|-------|
| Coinbase | ISO 8601 UTC | Includes Pro, handles metadata rows |
| Kraken | YYYY-MM-DD HH:MM:SS | ZIP delivery (ledgers.csv) |
| Gemini | YYYY-MM-DD HH:MM:SS | XLSX format |
| Binance | YYYY-MM-DD HH:MM:SS | .tar.gz compressed |
| Robinhood | M/D/YYYY | US date format |
| Crypto.com | YYYY-MM-DD HH:MM:SS | Multi-file export |
| PayPal | MM/DD/YYYY | 4 cryptos only |
| Cash App | ISO 8601 UTC | BTC only |
| Venmo | ISO 8601 | Skip metadata rows |
| KuCoin | Unix timestamp | ms or seconds |
| Bybit | Unix timestamp | ZIP archives |
| FTX | ISO 8601 + microseconds | Bankrupt - historical |

---

## Export Format Specifications

### Koinly Universal Template
```csv
Date,Sent Amount,Sent Currency,Received Amount,Received Currency,Fee Amount,Fee Currency,Label,TxHash,Description
```
Date format: YYYY-MM-DD HH:mm:ss

### TurboTax Form 8949
```csv
Currency Name,Purchase Date,Cost Basis,Date Sold,Proceeds
```
Date format: MM/DD/YYYY

### CoinLedger Universal
```csv
Timestamp,Type,Asset Received,Amount Received,Asset Sent,Amount Sent,Fee Asset,Fee Amount
```
Date format: MM/DD/YYYY HH:mm:ss

### ZenLedger Custom
```csv
Timestamp,Type,IN Amount,IN Currency,OUT Amount,OUT Currency,Fee Amount,Fee Currency,Exchange,US-Based
```
Date format: UTC 24hr

---

## Database Schema

### Tables
1. **users** - User accounts (email, password_hash, 2FA)
2. **accounts** - OAuth provider links (Google)
3. **subscriptions** - Stripe subscription data
4. **uploads** - CSV file metadata
5. **jobs** - Processing job status and results
6. **transactions** - Parsed transactions for AI
7. **ai_cache** - Cached AI categorizations
8. **downloads** - Free tier download tracking

### Key Constraints
- Email: CITEXT (case-insensitive), UNIQUE
- Cascade deletes: User deletion removes all related data
- Transaction dedup: UNIQUE(user_id, upload_id, description, posted_at, amount_cents)

---

## API Endpoints Summary

### Authentication (13 endpoints)
- POST `/api/auth/register`
- POST `/api/auth/verify`
- POST `/api/auth/resend-code`
- POST `/api/auth/forgot-password`
- POST `/api/auth/reset-password`
- GET/POST `/api/auth/[...nextauth]`
- POST `/api/auth/refresh-session`
- POST `/api/auth/2fa/setup`
- POST `/api/auth/2fa/verify`
- GET `/api/auth/2fa/status`
- POST `/api/auth/2fa/check`
- POST `/api/auth/2fa/login-verify`
- POST `/api/auth/2fa/disable`

### Uploads (2 endpoints)
- POST `/api/uploads/presigned-url`
- POST `/api/uploads/[uploadId]/confirm`

### Jobs (5 endpoints)
- GET `/api/jobs`
- GET `/api/jobs/[jobId]`
- GET `/api/jobs/[jobId]/download`
- GET `/api/jobs/[jobId]/insights`
- POST `/api/jobs/[jobId]/retry`

### Payments (3 endpoints)
- POST `/api/checkout`
- POST/GET `/api/customer-portal`
- POST `/api/webhooks/stripe`

### Miscellaneous (3 endpoints)
- POST `/api/waitlist`
- POST `/api/subscribe`
- POST `/monitoring` (Sentry tunnel)

---

*Document Version: 1.0*
*Last Updated: January 2026*
