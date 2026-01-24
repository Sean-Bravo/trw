# Comprehensive Test Plan for TaxFormatter

> Full E2E + Unit Test Blueprint using TestSprite AI Testing

## Executive Summary

This document outlines a comprehensive testing strategy for TaxFormatter, covering:
- **415 existing tests** across 19 suites (Phase 2 complete)
- **~200 new tests** needed for complete coverage
- **E2E test suites** for critical user journeys
- **Integration tests** for system-level verification

### Current State
| Category | Tests | Status |
|----------|-------|--------|
| Security Utilities | 114 | ✅ Complete |
| UI Components | 98 | ✅ Complete |
| Dashboard Components | 62 | ⚠️ Partial |
| Hooks | 24 | ✅ Complete |
| API Routes (Auth) | 71 | ✅ Complete |
| Marketing Components | 54 | ✅ Complete |
| API Routes (Jobs/Uploads) | 0 | ❌ Missing |
| API Routes (Payments) | 0 | ❌ Missing |
| **API Routes (Bank Statement)** | 0 | ❌ Missing |
| **Bank Statement Backend** | 0 | ❌ Missing |
| E2E Tests | 0 | ❌ Missing |
| Integration Tests | 0 | ❌ Missing |

---

## Phase 3: Missing API Route Tests

### 3.1 Upload Routes

#### `/api/uploads/presigned-url` (POST)
**File:** `__tests__/api/uploads/presigned-url.test.ts`

**Test Cases:**
1. ✅ Returns presigned URL for valid request
2. ✅ Validates filename format (no path traversal)
3. ✅ Validates file size (max 10MB)
4. ✅ Requires authentication
5. ✅ Rate limits to 10/hour per user
6. ✅ Returns 429 when rate limit exceeded
7. ✅ Sets correct S3 metadata (user-id, original-filename)
8. ✅ Generates unique upload ID
9. ❌ Handles S3 errors gracefully
10. ❌ Logs upload request for analytics

**Mocks Required:**
- AWS S3 `createPresignedPost`
- NextAuth session
- Rate limiter

---

#### `/api/uploads/[uploadId]/confirm` (POST)
**File:** `__tests__/api/uploads/confirm.test.ts`

**Test Cases:**
1. ✅ Confirms upload and creates job
2. ✅ Validates uploadId format
3. ✅ Verifies file exists in S3
4. ✅ Creates upload record in Neon DB
5. ✅ Creates job record with 'queued' status
6. ✅ Returns jobId in response
7. ✅ Requires authentication
8. ❌ Handles S3 file not found
9. ❌ Handles database errors
10. ❌ Prevents double-confirmation

**Mocks Required:**
- AWS S3 `headObject`
- Neon database operations
- NextAuth session

---

### 3.2 Job Routes

#### `/api/jobs` (GET)
**File:** `__tests__/api/jobs/list.test.ts`

**Test Cases:**
1. ✅ Returns list of user's jobs
2. ✅ Orders by created_at DESC
3. ✅ Paginates results (max 50)
4. ✅ Includes job status, filename, error
5. ✅ Requires authentication
6. ✅ Returns empty array for new users
7. ❌ Handles database errors
8. ❌ Filters by status (optional)

---

#### `/api/jobs/[jobId]` (GET)
**File:** `__tests__/api/jobs/status.test.ts`

**Test Cases:**
1. ✅ Returns job status from DB (terminal states)
2. ✅ Checks Lambda for live status (queued/running)
3. ✅ Syncs terminal status from Lambda to DB
4. ✅ Returns 404 for non-existent job
5. ✅ Returns 403 for other user's job
6. ✅ Requires authentication
7. ✅ Includes transaction count in status
8. ✅ Maps Lambda status to DB status correctly
9. ❌ Handles Lambda timeout gracefully
10. ❌ Caches Lambda responses (optional)

**Mocks Required:**
- Neon database operations
- Lambda API call
- NextAuth session

---

#### `/api/jobs/[jobId]/download` (GET)
**File:** `__tests__/api/jobs/download.test.ts`

**Test Cases:**
1. ✅ Returns presigned download URL
2. ✅ Validates format parameter (koinly/turbotax/coinledger/zenledger)
3. ✅ Enforces free tier limit (3/month)
4. ✅ Increments download count
5. ✅ Prevents duplicate counting (same user+job)
6. ✅ Converts format on-demand
7. ✅ Caches converted files in S3
8. ✅ Returns cached file if available
9. ✅ Requires job to be 'succeeded'
10. ✅ Requires authentication
11. ❌ Returns 402 when free limit reached
12. ❌ Handles S3 errors

**Mocks Required:**
- Neon database operations
- S3 presigned URL generation
- Format conversion logic
- NextAuth session

---

#### `/api/jobs/[jobId]/insights` (GET)
**File:** `__tests__/api/jobs/insights.test.ts`

**Test Cases:**
1. ✅ Returns AI insights for job
2. ✅ Uses tier-appropriate model
3. ✅ Fetches from S3 insights.json
4. ✅ Returns 404 if insights not generated
5. ✅ Requires job to be 'succeeded'
6. ✅ Requires authentication
7. ❌ Handles S3 errors
8. ❌ Falls back gracefully if AI failed

---

#### `/api/jobs/[jobId]/retry` (POST)
**File:** `__tests__/api/jobs/retry.test.ts`

**Test Cases:**
1. ✅ Retries failed job
2. ✅ Accepts exchange override parameter
3. ✅ Enforces max retry count (5)
4. ✅ Enforces cooldown period (30s)
5. ✅ Resets job status to 'queued'
6. ✅ Increments retry_count
7. ✅ Sets last_retry_at timestamp
8. ✅ Requires job to be 'failed'
9. ✅ Requires authentication
10. ❌ Returns 429 during cooldown

---

### 3.3 Payment Routes

#### `/api/checkout` (POST)
**File:** `__tests__/api/checkout.test.ts`

**Test Cases:**
1. ✅ Creates Stripe checkout session
2. ✅ Validates plan (pro/premium)
3. ✅ Validates billing period (monthly/annual)
4. ✅ Sets correct mode (subscription/payment)
5. ✅ Includes correct price ID
6. ✅ Requires authentication
7. ✅ Rate limits to 100/min
8. ✅ Returns session URL
9. ❌ Handles Stripe API errors
10. ❌ Logs checkout attempt

**Mocks Required:**
- Stripe `checkout.sessions.create`
- NextAuth session
- Rate limiter

---

#### `/api/customer-portal` (POST/GET)
**File:** `__tests__/api/customer-portal.test.ts`

**Test Cases:**
1. ✅ Creates Stripe portal session
2. ✅ Creates customer if doesn't exist
3. ✅ Returns portal URL
4. ✅ Requires authentication
5. ❌ Handles Stripe API errors

---

#### `/api/webhooks/stripe` (POST)
**File:** `__tests__/api/webhooks/stripe.test.ts`

**Test Cases:**
1. ✅ Verifies Stripe signature
2. ✅ Rejects invalid signature
3. ✅ Handles checkout.session.completed
4. ✅ Handles customer.subscription.updated
5. ✅ Handles customer.subscription.deleted
6. ✅ Handles payment_intent.succeeded
7. ✅ Handles payment_intent.payment_failed
8. ✅ Updates subscription in Neon DB
9. ✅ Handles unknown event types gracefully
10. ✅ Idempotent for duplicate events
11. ❌ Returns 500 for DB errors (not 200)
12. ❌ Logs all webhook events

**Mocks Required:**
- Stripe `webhooks.constructEvent`
- Neon database operations

---

### 3.4 Bank Statement Routes (Pro+ Feature)

#### `/api/bank/presigned-url` (POST)
**File:** `__tests__/api/bank/presigned-url.test.ts`

**Test Cases:**
1. ✅ Returns presigned URL for valid PDF request
2. ✅ Validates filename extension (.pdf only)
3. ✅ Validates content type (application/pdf)
4. ✅ Requires Pro+ subscription (403 for free tier)
5. ✅ Requires authentication (401)
6. ✅ Rate limits to 10/hour per user
7. ✅ Returns 429 when rate limit exceeded with headers
8. ✅ Generates unique jobId in response
9. ✅ Returns s3Key with correct path format
10. ✅ Sets expiration to 900 seconds (15 min)
11. ❌ Handles S3 errors gracefully
12. ❌ Rejects non-PDF file extensions

**Mocks Required:**
- AWS S3 `createPresignedPost`
- NextAuth session with `subscriptionTier`
- Rate limiter

---

#### `/api/bank/process` (POST)
**File:** `__tests__/api/bank/process.test.ts`

**Test Cases:**
1. ✅ Starts processing and returns metadata
2. ✅ Validates jobId format (UUID)
3. ✅ Validates s3Key format
4. ✅ Validates outputFormat (qbo/xero/excel)
5. ✅ Requires Pro+ subscription (403)
6. ✅ Requires authentication (401)
7. ✅ Returns transactionCount in response
8. ✅ Returns detectedBank in response
9. ✅ Returns warnings array for issues
10. ✅ Returns metadata with extraction details
11. ❌ Handles Lambda processing errors
12. ❌ Returns 400 for missing required fields

**Expected Response:**
```json
{
  "success": true,
  "jobId": "uuid",
  "transactionCount": 42,
  "detectedBank": "Chase",
  "warnings": [],
  "metadata": {
    "detected_bank": "Chase",
    "config_version": "chase:1.0.0",
    "statement_period": { "start": "2024-01-01", "end": "2024-01-31" },
    "extraction_method": "pdfplumber"
  }
}
```

**Mocks Required:**
- Lambda invocation
- Neon database operations
- NextAuth session

---

#### `/api/bank/job/[jobId]` (GET)
**File:** `__tests__/api/bank/job-status.test.ts`

**Test Cases:**
1. ✅ Returns job status (queued/running/succeeded/failed/canceled)
2. ✅ Returns result object for succeeded jobs
3. ✅ Returns error field for failed jobs
4. ✅ Includes timestamps (createdAt, startedAt, finishedAt)
5. ✅ Requires authentication (401)
6. ✅ Returns 404 for non-existent jobId
7. ✅ Returns 400 for missing jobId
8. ❌ Only returns jobs owned by authenticated user

**Mocks Required:**
- Neon database operations
- NextAuth session

---

#### `/api/bank/job/[jobId]/download` (GET)
**File:** `__tests__/api/bank/download.test.ts`

**Test Cases:**
1. ✅ Returns presigned download URL
2. ✅ Defaults to QBO format if not specified
3. ✅ Validates format parameter (qbo/xero/excel)
4. ✅ Returns filename in response
5. ✅ Returns format in response
6. ✅ Sets 1-hour expiration
7. ✅ Requires authentication (401)
8. ✅ Returns 404 for non-existent job
9. ✅ Returns 404 if result not found in S3
10. ❌ Returns 400 for invalid format
11. ❌ Handles S3 errors

**Mocks Required:**
- S3 presigned URL generation
- Neon database operations
- NextAuth session

---

#### `/api/bank/banks` (GET)
**File:** `__tests__/api/bank/banks.test.ts`

**Test Cases:**
1. ✅ Returns list of supported banks
2. ✅ Returns list of export formats
3. ✅ Bank objects include id, name, version
4. ✅ Format objects include id, name, description
5. ✅ Falls back to Big 4 banks if Lambda fails
6. ✅ Requires authentication (401)

**Expected Response:**
```json
{
  "banks": [
    { "id": "chase", "name": "Chase", "version": "1.0.0" },
    { "id": "bank_of_america", "name": "Bank of America", "version": "1.0.0" }
  ],
  "formats": [
    { "id": "qbo", "name": "QuickBooks Online", "description": "..." }
  ]
}
```

---

### 3.5 2FA Routes

#### `/api/auth/2fa/setup` (POST)
**File:** `__tests__/api/auth/2fa/setup.test.ts`

**Test Cases:**
1. ✅ Generates TOTP secret
2. ✅ Returns QR code data URL
3. ✅ Returns secret for manual entry
4. ✅ Requires authentication
5. ✅ Rejects if 2FA already enabled
6. ❌ Stores temporary secret in session

---

#### `/api/auth/2fa/verify` (POST)
**File:** `__tests__/api/auth/2fa/verify.test.ts`

**Test Cases:**
1. ✅ Validates TOTP token
2. ✅ Enables 2FA on success
3. ✅ Generates 8 backup codes
4. ✅ Returns backup codes (once only)
5. ✅ Requires authentication
6. ✅ Rejects invalid token
7. ❌ Rejects if no setup in progress

---

#### `/api/auth/2fa/status` (GET)
**File:** `__tests__/api/auth/2fa/status.test.ts`

**Test Cases:**
1. ✅ Returns 2FA enabled status
2. ✅ Requires authentication
3. ✅ Returns false for new users

---

#### `/api/auth/2fa/check` (POST)
**File:** `__tests__/api/auth/2fa/check.test.ts`

**Test Cases:**
1. ✅ Checks if email has 2FA enabled
2. ✅ Returns boolean for valid email
3. ✅ Returns false for non-existent email (no enumeration)
4. ❌ Validates email format

---

#### `/api/auth/2fa/login-verify` (POST)
**File:** `__tests__/api/auth/2fa/login-verify.test.ts`

**Test Cases:**
1. ✅ Verifies TOTP during login
2. ✅ Accepts backup code as alternative
3. ✅ Marks backup code as used
4. ✅ Grants session on success
5. ✅ Rate limits attempts
6. ❌ Rejects expired tokens

---

#### `/api/auth/2fa/disable` (POST)
**File:** `__tests__/api/auth/2fa/disable.test.ts`

**Test Cases:**
1. ✅ Disables 2FA for user
2. ✅ Requires password verification
3. ✅ Deletes backup codes
4. ✅ Requires authentication
5. ❌ Logs 2FA disable event

---

## Phase 4: Missing Component Tests

### 4.1 Dashboard Components

#### TaxSoftwareSelector
**File:** `__tests__/components/dashboard/TaxSoftwareSelector.test.tsx`

**Test Cases:**
1. Renders all 4 format options
2. Shows format descriptions
3. Handles format selection
4. Triggers download on select
5. Shows loading state during download
6. Handles download error

---

#### ExchangeSelector
**File:** `__tests__/components/dashboard/ExchangeSelector.test.tsx`

**Test Cases:**
1. Renders column analysis
2. Shows detected/missing columns
3. Renders exchange dropdown
4. Handles exchange selection
5. Triggers retry on submit
6. Shows loading state
7. Handles retry error

---

#### AIInsightsPanel
**File:** `__tests__/components/dashboard/AIInsightsPanel.test.tsx`

**Test Cases:**
1. Renders insights data
2. Shows quick stats
3. Displays transaction breakdown
4. Shows tax suggestions
5. Handles loading state
6. Handles error state
7. Shows tier-appropriate model info

---

#### AnalysisAnimation
**File:** `__tests__/components/dashboard/AnalysisAnimation.test.tsx`

**Test Cases:**
1. Renders animation
2. Shows progress indication
3. Updates with status messages
4. Handles completion state

---

#### ProcessingTerminal
**File:** `__tests__/components/dashboard/ProcessingTerminal.test.tsx`

**Test Cases:**
1. Displays status messages
2. Updates in real-time
3. Shows processing stages
4. Handles error messages

---

### 4.2 Bank Statement Components

#### BankPDFUploader
**File:** `__tests__/components/dashboard/BankPDFUploader.test.tsx`

**Test Cases:**
1. Renders format selector (QBO/Xero/Excel)
2. Shows drop zone for PDF files
3. Accepts only PDF files (rejects others)
4. Shows file size validation error (>10MB)
5. Handles format selection change
6. Shows progress bar during upload (10%→30%→50%→100%)
7. Displays processing status messages
8. Shows success state with download button
9. Shows error state with error message
10. Displays warnings from processing
11. "Process Another" button resets state
12. Shows tier gate for free users (upgrade prompt)
13. Shows loading state during API calls

**State Transitions:**
- `idle` → `uploading` → `processing` → `complete`
- `idle` → `uploading` → `error`
- `processing` → `error`

---

#### ModeSelector
**File:** `__tests__/components/dashboard/ModeSelector.test.tsx`

**Test Cases:**
1. Renders Crypto CSV and Bank PDF options
2. Shows correct icons (FileSpreadsheet/Building2)
3. Highlights selected mode
4. Calls onModeChange when clicked
5. Renders correctly on mobile (responsive)
6. Shows correct colors (blue for crypto, cyan for bank)

---

### 4.3 Premium Components

#### PremiumFeatureGuard
**File:** `__tests__/components/premium/PremiumFeatureGuard.test.tsx`

**Test Cases:**
1. Renders children for allowed tier
2. Shows upgrade prompt for restricted tier
3. Handles tier prop correctly
4. Renders fallback component

---

#### UpgradePrompt
**File:** `__tests__/components/premium/UpgradePrompt.test.tsx`

**Test Cases:**
1. Shows plan comparison
2. CTA links to checkout
3. Dismissible on click
4. Renders plan features

---

## Phase 5: E2E Tests (Playwright)

### 5.1 Authentication E2E
**File:** `e2e/auth.spec.ts`

**Test Scenarios:**

```typescript
// Registration Flow
test('user can register with email', async ({ page }) => {
  // Navigate to signup
  // Fill form with valid data
  // Submit form
  // Verify redirect to verification page
  // Enter verification code
  // Verify redirect to dashboard
});

test('registration fails with duplicate email', async ({ page }) => {
  // Navigate to signup
  // Fill form with existing email
  // Submit form
  // Verify error message
});

// Login Flow
test('user can login with credentials', async ({ page }) => {
  // Navigate to login
  // Enter valid credentials
  // Submit form
  // Verify redirect to dashboard
});

test('user sees error for wrong password', async ({ page }) => {
  // Navigate to login
  // Enter wrong password
  // Submit form
  // Verify error message
});

// 2FA Flow
test('user can enable 2FA', async ({ page }) => {
  // Login
  // Navigate to settings
  // Click enable 2FA
  // Scan QR (mock)
  // Enter TOTP code
  // Verify backup codes displayed
});

test('user must enter 2FA code to login', async ({ page }) => {
  // Login with 2FA-enabled account
  // Verify 2FA prompt
  // Enter TOTP code
  // Verify access granted
});

// Password Reset
test('user can reset password', async ({ page }) => {
  // Navigate to forgot password
  // Enter email
  // Check email (mock)
  // Click reset link
  // Enter new password
  // Verify login works
});
```

---

### 5.2 CSV Processing E2E
**File:** `e2e/processing.spec.ts`

**Test Scenarios:**

```typescript
test('user can upload and process CSV', async ({ page }) => {
  // Login
  // Navigate to dashboard
  // Upload CSV file
  // Wait for processing
  // Verify job appears in history
  // Verify status updates
  // Verify download button enabled
});

test('user can select tax format and download', async ({ page }) => {
  // Login
  // Navigate to completed job
  // Select TurboTax format
  // Click download
  // Verify file downloaded
});

test('user can retry failed job with exchange override', async ({ page }) => {
  // Login
  // Navigate to failed job
  // Open ExchangeSelector
  // Select different exchange
  // Click retry
  // Verify job reprocessed
});

test('user sees AI insights after processing', async ({ page }) => {
  // Login
  // Navigate to completed job
  // Verify insights panel visible
  // Verify stats displayed
  // Verify suggestions shown
});
```

---

### 5.3 Bank Statement E2E
**File:** `e2e/bank-statement.spec.ts`

**Test Scenarios:**

```typescript
test('Pro user can upload and process bank PDF', async ({ page }) => {
  // Login as Pro user
  // Navigate to dashboard
  // Toggle to Bank PDF mode
  // Select output format (QBO)
  // Upload bank statement PDF
  // Wait for processing
  // Verify job appears with status updates
  // Verify download button enabled
  // Download and verify file format
});

test('free user sees upgrade prompt for bank feature', async ({ page }) => {
  // Login as free user
  // Navigate to dashboard
  // Toggle to Bank PDF mode
  // Verify upgrade prompt displayed
  // Verify upload disabled
  // Click upgrade → redirects to pricing
});

test('user can select different export formats', async ({ page }) => {
  // Login as Pro user
  // Upload bank PDF
  // Wait for processing
  // Download as QBO → verify format
  // Download as Xero → verify format
  // Download as Excel → verify format
});

test('bank detection shows correct bank name', async ({ page }) => {
  // Login as Pro user
  // Upload Chase statement
  // Verify "Chase" detected in results
  // Verify transaction count displayed
});

test('generic parser fallback with warning', async ({ page }) => {
  // Login as Pro user
  // Upload unknown bank PDF
  // Verify warning: "Bank not recognized"
  // Verify processing still completes
});

test('processing errors show actionable message', async ({ page }) => {
  // Login as Pro user
  // Upload encrypted/invalid PDF
  // Verify error message displayed
  // Verify retry option available
});
```

---

### 5.4 Subscription E2E
**File:** `e2e/subscription.spec.ts`

**Test Scenarios:**

```typescript
test('user can upgrade to Pro', async ({ page }) => {
  // Login as free user
  // Navigate to pricing
  // Click Pro upgrade button
  // Complete Stripe checkout (test mode)
  // Verify redirect to success page
  // Verify tier updated
});

test('user can access customer portal', async ({ page }) => {
  // Login as Pro user
  // Navigate to settings
  // Click manage subscription
  // Verify Stripe portal opens
});

test('free user hits download limit', async ({ page }) => {
  // Login as free user (3 downloads used)
  // Attempt download
  // Verify upgrade prompt
});
```

---

### 5.4 Accessibility E2E
**File:** `e2e/accessibility.spec.ts`

**Test Scenarios:**

```typescript
test('homepage meets WCAG 2.1 AA', async ({ page }) => {
  // Navigate to homepage
  // Run axe-core scan
  // Verify no violations
});

test('dashboard is keyboard navigable', async ({ page }) => {
  // Login
  // Tab through dashboard
  // Verify focus indicators
  // Verify all actions accessible
});

test('forms have proper labels', async ({ page }) => {
  // Navigate to signup
  // Verify label associations
  // Verify error announcements
});
```

---

### 5.5 Performance E2E
**File:** `e2e/performance.spec.ts`

**Test Scenarios:**

```typescript
test('homepage loads under 3 seconds', async ({ page }) => {
  // Navigate to homepage
  // Measure LCP
  // Assert < 3000ms
});

test('dashboard loads under 2 seconds', async ({ page }) => {
  // Login
  // Measure dashboard load
  // Assert < 2000ms
});

test('file upload completes under 10 seconds', async ({ page }) => {
  // Login
  // Upload 5MB CSV
  // Measure upload time
  // Assert < 10000ms
});
```

---

## Phase 6: Integration Tests

### 6.1 Security Integration
**File:** `__tests__/integration/security.test.ts`

**Test Cases:**
1. Rate limiting blocks excessive requests
2. SQL injection attempts are blocked
3. XSS attempts are sanitized
4. CSRF validation works
5. Unauthenticated users redirected from protected routes
6. Session expires after 30 days

---

### 6.2 Database Integration
**File:** `__tests__/integration/database.test.ts`

**Test Cases:**
1. User creation cascades correctly
2. User deletion cascades all related data
3. Transaction dedup constraint works
4. Subscription tier updates propagate
5. Job status transitions are valid

---

### 6.3 Bank Statement Integration
**File:** `__tests__/integration/bank-statement.test.ts`

**Test Cases:**
1. Full pipeline: Upload PDF → Process → Download CSV
2. Bank fingerprinting accuracy (Big 4 banks)
3. Transaction extraction from tables
4. Transaction extraction from text (fallback)
5. Duplicate detection and removal
6. Date normalization across formats
7. Amount parsing (debits, credits, parentheses)
8. QBO export format validation
9. Xero export format validation
10. Excel export format validation
11. Statement period detection
12. Multiline description handling
13. Generic fallback for unknown banks
14. Large PDF handling (>5 pages → Textract path)

---

### 6.4 Payment Integration
**File:** `__tests__/integration/payments.test.ts`

**Test Cases:**
1. Checkout → Webhook → Subscription flow
2. Subscription cancellation → Downgrade flow
3. Free tier download limit enforcement
4. Pro tier unlimited downloads

---

## Test Execution Commands

```bash
# Run all unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- uploads/presigned-url.test.ts

# Run E2E tests
npm run test:e2e

# Run E2E with headed browser
npm run test:e2e:headed

# Run E2E with UI mode
npm run test:e2e:ui

# Run all tests (unit + e2e)
npm run test:all

# Run tests in CI mode
npm run test:ci
```

---

## TestSprite Integration

Once TestSprite MCP is configured, you can use these prompts:

### Generate Missing Tests
```
"Generate tests for /api/uploads/presigned-url using the patterns from existing auth route tests"
```

### Run & Analyze
```
"Run all tests and identify areas with low coverage"
```

### Debug Failures
```
"Debug the failing tests in the checkout route and suggest fixes"
```

### Create E2E Tests
```
"Create E2E tests for the complete CSV upload and download flow"
```

---

## Coverage Targets

| Category | Current | Target |
|----------|---------|--------|
| Overall | ~50% | 90% |
| Security (lib/validation, rate-limit) | 90% | 100% |
| Auth Routes | 90% | 100% |
| Upload/Job Routes | 0% | 90% |
| Payment Routes | 0% | 90% |
| Dashboard Components | 60% | 85% |
| E2E Critical Paths | 0% | 100% |

---

## Priority Matrix

### P0 - Critical (Do First)
- [ ] `/api/uploads/presigned-url` tests
- [ ] `/api/uploads/[uploadId]/confirm` tests
- [ ] `/api/jobs/[jobId]` tests
- [ ] `/api/jobs/[jobId]/download` tests
- [ ] `/api/webhooks/stripe` tests
- [ ] E2E: Complete upload/download flow

### P1 - High Priority
- [ ] All 2FA route tests
- [ ] `/api/checkout` tests
- [ ] **`/api/bank/presigned-url` tests**
- [ ] **`/api/bank/process` tests**
- [ ] **`/api/bank/job/[jobId]` tests**
- [ ] **`/api/bank/job/[jobId]/download` tests**
- [ ] TaxSoftwareSelector component tests
- [ ] AIInsightsPanel component tests
- [ ] **BankPDFUploader component tests**
- [ ] E2E: Authentication flows
- [ ] **E2E: Bank statement upload/download flow**

### P2 - Medium Priority
- [ ] `/api/jobs/[jobId]/insights` tests
- [ ] `/api/jobs/[jobId]/retry` tests
- [ ] `/api/bank/banks` tests
- [ ] ExchangeSelector component tests
- [ ] ModeSelector component tests
- [ ] E2E: Subscription flows
- [ ] **Bank statement backend unit tests (Python)**

### P3 - Lower Priority
- [ ] `/api/customer-portal` tests
- [ ] Remaining dashboard components
- [ ] E2E: Accessibility tests
- [ ] E2E: Performance tests
- [ ] Bank statement integration tests (full pipeline)

---

## Estimated Effort

| Phase | Tests | Hours |
|-------|-------|-------|
| Phase 3: API Routes (CSV) | ~80 | 16-20 |
| Phase 3: API Routes (Bank) | ~45 | 10-12 |
| Phase 4: Components | ~55 | 10-14 |
| Phase 5: E2E Tests | ~40 | 14-18 |
| Phase 6: Integration | ~25 | 8-12 |
| Phase 7: Bank Backend (Python) | ~50 | 12-16 |
| **Total** | **~295** | **70-92** |

---

## Phase 7: Bank Statement Backend Tests (Python)

### 7.1 BankFingerprinter Tests
**File:** `backend/tests/test_fingerprinter.py`

**Test Cases:**
1. ✅ Detects Chase from logo patterns
2. ✅ Detects Bank of America from unique markers
3. ✅ Detects Wells Fargo from header patterns
4. ✅ Detects Citi from logo + header combo
5. ✅ Falls back to generic for unknown banks
6. ✅ Returns confidence score
7. ✅ Handles empty text input
8. ✅ Case-insensitive matching
9. ❌ Loads all bank configs from YAML
10. ❌ Returns config_version in result

---

### 7.2 TransactionExtractor Tests
**File:** `backend/tests/test_extractor.py`

**Test Cases:**
1. ✅ Extracts transactions from table-based PDFs
2. ✅ Falls back to text extraction when no tables
3. ✅ Finds header row with keyword matching
4. ✅ Maps columns to config fields
5. ✅ Parses amount with $ and commas
6. ✅ Parses negative amounts (parentheses)
7. ✅ Parses trailing minus: `100-` → `-100`
8. ✅ Handles debit/credit column mode
9. ✅ Parses MM/DD/YYYY dates
10. ✅ Parses MM/DD dates (infers year)
11. ✅ Parses YYYY-MM-DD dates
12. ✅ Handles multiline descriptions
13. ✅ Skips lines matching skip patterns
14. ✅ Returns extraction metadata
15. ❌ Handles encrypted/password-protected PDFs
16. ❌ Handles scanned/image-based PDFs

---

### 7.3 TransactionNormalizer Tests
**File:** `backend/tests/test_normalizer.py`

**Test Cases:**
1. ✅ Normalizes dates to YYYY-MM-DD
2. ✅ Handles 10+ input date formats
3. ✅ Infers year from statement period
4. ✅ Handles year rollover (Dec→Jan)
5. ✅ Rounds amounts to 2 decimals
6. ✅ Cleans excess whitespace from descriptions
7. ✅ Truncates long descriptions (max 255 chars)
8. ✅ Strips reference/trace numbers
9. ✅ Detects statement period from text
10. ❌ Handles fuzzy date parsing ("Jan 15")

---

### 7.4 DuplicateDetector Tests
**File:** `backend/tests/test_duplicate_detector.py`

**Test Cases:**
1. ✅ Detects exact duplicates by fingerprint
2. ✅ Fingerprint: MD5(date|amount|desc[:50])
3. ✅ Deduplicates with keep_first strategy
4. ✅ Deduplicates with keep_last strategy
5. ✅ mark_only strategy flags without removing
6. ✅ Handles $0.01 floating point tolerance
7. ✅ Normalizes descriptions for matching
8. ✅ Returns duplicate statistics
9. ✅ Finds similar transactions (fuzzy, 0.8 threshold)
10. ❌ Handles empty transaction list

---

### 7.5 AccountingExporter Tests
**File:** `backend/tests/test_exporter.py`

**Test Cases:**

**QBO Format:**
1. ✅ Exports Date, Description, Amount columns
2. ✅ Uses MM/DD/YYYY date format
3. ✅ Negative amounts for expenses
4. ✅ Positive amounts for income
5. ✅ Includes header row

**Xero Format:**
6. ✅ Exports *Date, *Amount, Payee, Description, Reference, Cheque Number
7. ✅ Uses YYYY-MM-DD date format
8. ✅ Extracts payee from description patterns
9. ✅ Handles " TO " pattern
10. ✅ Handles " FROM " pattern
11. ✅ Falls back to first 3 words for payee

**Excel Format:**
12. ✅ Exports Date, Description, Amount, Debit, Credit, Balance, Category
13. ✅ Splits amount into Debit/Credit columns
14. ✅ Uses YYYY-MM-DD date format
15. ❌ Handles empty transaction list

---

### 7.6 BankStatementProcessor Tests
**File:** `backend/tests/test_processor.py`

**Test Cases:**
1. ✅ Full pipeline: PDF → detect → extract → normalize → export
2. ✅ Returns success=true for valid PDF
3. ✅ Returns csv_content string
4. ✅ Returns transactions list
5. ✅ Returns metadata with all fields
6. ✅ Returns warnings array
7. ✅ Deduplicates by default
8. ✅ Can disable deduplication
9. ✅ Accepts statement_year override
10. ✅ Validates PDF before processing
11. ❌ Returns success=false for invalid PDF
12. ❌ Includes error message on failure

---

### 7.7 Bank Config Tests
**File:** `backend/tests/test_bank_configs.py`

**Test Cases:**
1. ✅ All Big 4 configs load successfully
2. ✅ Generic fallback config exists
3. ✅ Each config has required fields (name, version, fingerprint)
4. ✅ Each config has column mappings
5. ✅ Logo patterns are non-empty
6. ✅ Header patterns are non-empty
7. ❌ Config versions follow semver

---

### Test Fixtures for Bank Statement Tests

```
backend/tests/fixtures/
├── pdfs/
│   ├── chase_checking_3pages.pdf
│   ├── chase_savings_1page.pdf
│   ├── bofa_checking_2pages.pdf
│   ├── wells_fargo_credit_5pages.pdf
│   ├── citi_checking_10pages.pdf
│   ├── unknown_bank.pdf
│   ├── scanned_statement.pdf
│   ├── encrypted_statement.pdf
│   └── empty_statement.pdf
├── expected/
│   ├── chase_qbo.csv
│   ├── chase_xero.csv
│   ├── chase_excel.csv
│   ├── bofa_qbo.csv
│   └── wells_fargo_qbo.csv
└── text/
    ├── chase_header.txt
    ├── bofa_header.txt
    ├── wells_fargo_header.txt
    └── citi_header.txt
```

---

### Python Test Commands

```bash
# Run all Python tests
cd backend && pytest

# Run with coverage
pytest --cov=services/bank_statement --cov-report=html

# Run specific test file
pytest tests/test_fingerprinter.py

# Run specific test
pytest tests/test_extractor.py::test_parses_amount_with_parentheses

# Run tests matching pattern
pytest -k "duplicate"

# Run with verbose output
pytest -v

# Run and stop on first failure
pytest -x
```

---

## Coverage Targets (Updated)

| Category | Current | Target |
|----------|---------|--------|
| Overall | ~40% | 90% |
| Security (lib/validation, rate-limit) | 90% | 100% |
| Auth Routes | 90% | 100% |
| Upload/Job Routes (CSV) | 0% | 90% |
| **Upload/Job Routes (Bank)** | 0% | 90% |
| Payment Routes | 0% | 90% |
| Dashboard Components | 60% | 85% |
| **Bank Statement Backend (Python)** | 0% | 90% |
| E2E Critical Paths | 0% | 100% |

---

*Last Updated: January 2026*
*Document Version: 1.1 (Added Bank Statement Testing)*
