# TaxFormatter: Plan to 100% Release Ready

**Created:** January 29, 2026
**Current Status:** 95% Complete
**Goal:** 100% Production Ready

---

## Gap Analysis: 95% → 100%

| Gap | Priority | Effort | Blocker? |
|-----|----------|--------|----------|
| Production Lambda verification | P0 | 2-3 hrs | Yes |
| Production env vars configured | P0 | 1 hr | Yes |
| Presigned URL live test | P0 | 30 min | Yes |
| S3 upload end-to-end test | P0 | 30 min | Yes |
| Enable Stripe payment buttons | P1 | 30 min | No |
| Stripe webhook production test | P1 | 1 hr | No |
| Cross-browser testing | P1 | 4-6 hrs | No |
| Final UAT with beta user | P1 | 2-3 hrs | No |
| CI/CD pipeline setup | P2 | 2-3 hrs | No |
| Monitoring dashboard review | P2 | 1 hr | No |

**Total Remaining Effort: 14-20 hours**

---

## Phase 1: Critical Blockers (P0)

### 1.1 Configure Production Environment Variables

**Location:** Vercel Dashboard → Project Settings → Environment Variables

**Required Variables:**

```bash
# App
NEXT_PUBLIC_APP_URL=https://taxformatter.com
NEXTAUTH_URL=https://taxformatter.com
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

# Database
DATABASE_URL=<neon-production-connection-string>

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<production-iam-key>
AWS_SECRET_ACCESS_KEY=<production-iam-secret>
S3_UPLOAD_BUCKET=taxformatter-uploads-prod
S3_RESULTS_BUCKET=taxformatter-results-prod
API_GATEWAY_URL=https://api.taxformatter.com

# Auth
GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# AI
GOOGLE_AI_API_KEY=<gemini-api-key>
ANTHROPIC_API_KEY=<claude-api-key>

# Email
SMTP_HOST=<sendgrid-or-ses-host>
SMTP_USER=<smtp-user>
SMTP_PASSWORD=<smtp-password>
EMAIL_FROM=noreply@taxformatter.com

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=<sentry-dsn>
SENTRY_AUTH_TOKEN=<sentry-auth-token>
```

**Verification:**
- [ ] All variables set in Vercel
- [ ] No placeholder values
- [ ] Production values (not test/dev)

---

### 1.2 Verify Lambda Deployment

**Steps:**

```bash
# 1. SSH into deployment environment or use AWS Console
cd backend

# 2. Deploy all Lambda functions
./deploy.sh deploy

# 3. Verify deployment
aws lambda list-functions --query "Functions[?starts_with(FunctionName, 'taxformatter')]"

# 4. Check each function
aws lambda invoke --function-name taxformatter-webhook-prod /dev/stdout
aws lambda invoke --function-name taxformatter-scanner-prod /dev/stdout
aws lambda invoke --function-name taxformatter-processor-prod /dev/stdout
```

**Verification Checklist:**
- [ ] `taxformatter-webhook-prod` responds
- [ ] `taxformatter-scanner-prod` responds
- [ ] `taxformatter-processor-prod` responds
- [ ] CloudWatch logs show no errors
- [ ] IAM roles have correct permissions

---

### 1.3 Test Presigned URLs (Production)

**Test Script:**

```bash
# Get presigned URL from production API
curl -X POST https://api.taxformatter.com/presigned-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <test-jwt-token>" \
  -d '{"filename": "test.csv", "contentType": "text/csv"}'
```

**Expected Response:**
```json
{
  "uploadUrl": "https://taxformatter-uploads-prod.s3.amazonaws.com/...",
  "uploadId": "uuid-here",
  "fields": { ... }
}
```

**Verification:**
- [ ] Returns 200 status
- [ ] `uploadUrl` points to production S3 bucket
- [ ] URL is signed and valid

---

### 1.4 Test S3 Upload End-to-End

**Manual Test:**

1. Log into https://taxformatter.com with test account
2. Navigate to dashboard
3. Upload a test Coinbase CSV
4. Verify:
   - [ ] File uploads without CORS errors
   - [ ] Progress bar shows upload %
   - [ ] Job status changes: queued → running → succeeded
   - [ ] AI Insights panel populates
   - [ ] Download button works

**Test File:** Use `backend/tests/fixtures/coinbase_valid.csv`

---

## Phase 2: High Priority (P1)

### 2.1 Enable Stripe Payment Buttons

**Current State:** Buttons show "Coming Soon"

**Files to Modify:**

```
components/marketing/Pricing.tsx
```

**Changes:**

1. Find the "Coming Soon" disabled buttons
2. Replace with working checkout links:

```tsx
// Change from:
<Button disabled>Coming Soon</Button>

// To:
<Button
  href={`/api/checkout?plan=${plan.id}&period=${billingPeriod}`}
  variant="primary"
>
  Get Started
</Button>
```

**Verification:**
- [ ] Pro button redirects to Stripe Checkout
- [ ] Premium button redirects to Stripe Checkout
- [ ] Correct price shows in Stripe ($89/yr or $9/mo for Pro)
- [ ] Correct price shows in Stripe ($189/yr or $19/mo for Premium)

---

### 2.2 Test Stripe Webhooks (Production)

**Steps:**

1. **Configure webhook endpoint in Stripe Dashboard:**
   - URL: `https://taxformatter.com/api/webhooks/stripe`
   - Events to send:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`

2. **Get webhook signing secret:**
   - Copy `whsec_...` from Stripe Dashboard
   - Add to Vercel env vars as `STRIPE_WEBHOOK_SECRET`

3. **Test with Stripe CLI:**

```bash
stripe listen --forward-to https://taxformatter.com/api/webhooks/stripe

# In another terminal, trigger test event
stripe trigger checkout.session.completed
```

**Verification:**
- [ ] Webhook receives events
- [ ] Signature validation passes
- [ ] Database updates subscription tier
- [ ] No 500 errors in logs

---

### 2.3 Cross-Browser Testing

**Browsers to Test:**

| Browser | Platform | Priority |
|---------|----------|----------|
| Chrome | macOS | P1 |
| Safari | macOS | P1 |
| Firefox | macOS | P1 |
| Chrome | Windows | P1 |
| Edge | Windows | P2 |
| Chrome | Android | P1 |
| Safari | iOS | P1 |

**Test Checklist (each browser):**

- [ ] Landing page loads correctly
- [ ] Signup flow works
- [ ] Login flow works
- [ ] File drag & drop works
- [ ] File click-to-upload works
- [ ] Progress bar animates
- [ ] Processing terminal shows logs
- [ ] Download button works
- [ ] All 4 export formats download
- [ ] Dark mode toggle (if implemented)
- [ ] Responsive on mobile

**Known Issues to Watch:**
- Safari: XHR upload progress events may differ
- Firefox: Backdrop blur compatibility
- iOS Safari: Touch events for drag-drop

---

### 2.4 Final UAT with Beta Users

**Recruit 2-3 Beta Users:**
- Ideally real crypto traders
- Mix of exchange usage (Coinbase, Binance, Kraken)

**Test Script:**

1. Create fresh account (email signup)
2. Upload their real exchange CSV
3. Wait for processing
4. Download in their preferred format
5. Verify data looks correct
6. Report any issues

**Feedback Form:**
- Did signup work smoothly?
- Did your file upload without issues?
- Was the exchange detected correctly?
- Did the download work?
- Is the output format correct for your tax software?
- Any bugs or confusing UI?

---

## Phase 3: Nice to Have (P2)

### 3.1 CI/CD Pipeline Setup

**GitHub Actions Workflow:**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

---

### 3.2 Monitoring Dashboard Review

**CloudWatch Checks:**

- [ ] Alarms configured for Lambda errors
- [ ] Alarms configured for API 5xx errors
- [ ] Dashboard shows key metrics:
  - Lambda invocations
  - Lambda errors
  - Lambda duration
  - S3 request count
  - SQS message age
- [ ] SNS notifications configured for alarms

**Sentry Checks:**

- [ ] Project receiving errors
- [ ] Source maps uploaded (readable stack traces)
- [ ] Alert rules configured
- [ ] Team notifications set up

---

## Execution Schedule

### Day 1 (4-5 hours)

| Time | Task | Duration |
|------|------|----------|
| 9:00 AM | Configure production env vars | 1 hr |
| 10:00 AM | Verify Lambda deployment | 1 hr |
| 11:00 AM | Test presigned URLs | 30 min |
| 11:30 AM | Test S3 upload E2E | 30 min |
| 12:00 PM | Lunch | - |
| 1:00 PM | Enable Stripe buttons | 30 min |
| 1:30 PM | Configure Stripe webhooks | 30 min |
| 2:00 PM | Test Stripe webhooks | 1 hr |

**Day 1 Deliverable:** All P0 blockers resolved, Stripe enabled

---

### Day 2 (6-8 hours)

| Time | Task | Duration |
|------|------|----------|
| 9:00 AM | Cross-browser: Chrome/Safari/Firefox macOS | 2 hrs |
| 11:00 AM | Cross-browser: Windows + mobile | 2 hrs |
| 1:00 PM | Lunch | - |
| 2:00 PM | Beta user 1 UAT | 1 hr |
| 3:00 PM | Beta user 2 UAT | 1 hr |
| 4:00 PM | Fix any bugs found | 1-2 hrs |

**Day 2 Deliverable:** Cross-browser verified, beta feedback collected

---

### Day 3 (3-4 hours) - Optional

| Time | Task | Duration |
|------|------|----------|
| 9:00 AM | CI/CD pipeline setup | 2 hrs |
| 11:00 AM | Monitoring dashboard review | 1 hr |
| 12:00 PM | Final smoke test | 1 hr |

**Day 3 Deliverable:** CI/CD running, monitoring verified

---

## Sign-Off Checklist

### Critical (Must Pass)

- [ ] All Lambda functions responding in production
- [ ] Presigned URLs working
- [ ] S3 upload completes successfully
- [ ] Job processing works end-to-end
- [ ] Download works for all 4 formats
- [ ] Auth flows work (signup, login, logout)
- [ ] No 500 errors in production logs

### High Priority (Should Pass)

- [ ] Stripe checkout works
- [ ] Stripe webhooks update subscription
- [ ] Works in Chrome, Safari, Firefox
- [ ] Works on mobile (iOS Safari, Android Chrome)
- [ ] Beta users completed UAT without blockers

### Nice to Have

- [ ] CI/CD pipeline running
- [ ] CloudWatch alarms configured
- [ ] Sentry receiving errors with source maps

---

## Go/No-Go Decision

**GO Criteria:**
- All "Critical" items pass
- No P0 bugs outstanding
- At least 1 beta user completed full flow

**NO-GO Criteria:**
- Any Lambda not responding
- S3 uploads failing
- Downloads broken
- Auth completely broken

---

## Post-Launch Monitoring (First 48 Hours)

1. **Watch CloudWatch:**
   - Lambda error rate
   - API 5xx rate
   - SQS dead letter queue

2. **Watch Sentry:**
   - New errors
   - Error frequency

3. **Watch Stripe:**
   - Failed payments
   - Webhook failures

4. **Support Channels:**
   - Monitor for user complaints
   - Have hotfix process ready

---

## Summary

| Phase | Tasks | Hours | Status |
|-------|-------|-------|--------|
| Phase 1 (P0) | Env vars, Lambda, S3, Presigned URLs | 4-5 | ⬜ |
| Phase 2 (P1) | Stripe, Cross-browser, UAT | 8-10 | ⬜ |
| Phase 3 (P2) | CI/CD, Monitoring | 3-4 | ⬜ |
| **Total** | | **15-19 hrs** | |

**After completing this plan, TaxFormatter will be 100% release ready.**
