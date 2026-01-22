# Manual Testing Checklist - Pre-Launch

## Critical Blockers

### 1. Lambda Deployment Working
- [ ] Upload a test CSV file
- [ ] Check CloudWatch logs for processing
- [ ] Verify no errors in Lambda execution
- [ ] Confirm job status changes: queued → processing → completed

### 2. Presigned URLs Work
- [ ] Upload initiates without CORS errors
- [ ] Progress bar shows upload percentage
- [ ] File lands in S3 uploads bucket
- [ ] No "Failed to get presigned URL" errors

### 3. 5+ Parsers Working
Test with real CSV exports from each exchange:

| Exchange | Uploaded | Detected | Parsed OK | Notes |
|----------|----------|----------|-----------|-------|
| Coinbase | [ ] | [ ] | [ ] | |
| Binance | [ ] | [ ] | [ ] | |
| Kraken | [ ] | [ ] | [ ] | |
| Gemini | [ ] | [ ] | [ ] | |
| Crypto.com | [ ] | [ ] | [ ] | |
| KuCoin | [ ] | [ ] | [ ] | |
| Bitfinex | [ ] | [ ] | [ ] | |
| Gate.io | [ ] | [ ] | [ ] | |
| OKX | [ ] | [ ] | [ ] | |
| Bybit | [ ] | [ ] | [ ] | |
| Bitstamp | [ ] | [ ] | [ ] | |
| Uphold | [ ] | [ ] | [ ] | |
| Robinhood | [ ] | [ ] | [ ] | |

### 4. Download Works
- [ ] "Download" button appears after job completes
- [ ] Clicking download triggers file save
- [ ] Downloaded CSV opens correctly
- [ ] Data matches expected Koinly format
- [ ] Test other formats (if enabled):
  - [ ] TurboTax
  - [ ] CoinLedger
  - [ ] ZenLedger

### 5. Auth Flow Complete
- [ ] **Sign Up**: Create new account with email
- [ ] **Email Verification**: Receive and click verification link
- [ ] **Login**: Sign in with credentials
- [ ] **Session Persistence**: Refresh page, still logged in
- [ ] **Logout**: Click logout, redirected to home
- [ ] **Password Reset**: Request reset, receive email, set new password
- [ ] **Protected Routes**: Cannot access /dashboard without login

### 6. AI Insights Displays
- [ ] Insights panel appears after job completes
- [ ] Shows transaction count
- [ ] Shows date range
- [ ] Shows transaction type breakdown
- [ ] Shows top assets
- [ ] "What to do next" section displays
- [ ] No "AI unavailable" errors

---

## AWS Infrastructure Checks

### WAF Rules
- [ ] Open AWS Console → WAF & Shield
- [ ] Verify WebACL is attached to API Gateway/CloudFront
- [ ] Check rule groups are enabled:
  - [ ] AWS Managed Rules - Common Rule Set
  - [ ] Rate limiting rule (if configured)
- [ ] Test: Rapid requests should be blocked

### CloudWatch Alarms
- [ ] Open AWS Console → CloudWatch → Alarms
- [ ] Verify alarms exist for:
  - [ ] Lambda errors > threshold
  - [ ] API 5xx errors > threshold
  - [ ] DynamoDB throttling
- [ ] Check alarm actions (SNS notifications configured)

### Sentry Tracking
- [ ] Login to Sentry dashboard
- [ ] Verify TRW project exists
- [ ] Check recent errors (should be minimal)
- [ ] Trigger test error and confirm it appears
- [ ] Verify source maps are uploaded (readable stack traces)

---

## Edge Case Spot Checks

### File Handling
- [ ] Upload empty CSV → Shows appropriate error
- [ ] Upload non-CSV file → Rejected with message
- [ ] Upload very large file (>50MB) → Size limit error
- [ ] Upload CSV with special characters → Processes correctly

### Network Resilience
- [ ] Disconnect during upload → Error message, can retry
- [ ] Slow connection → Progress bar works, completes eventually

### Rate Limiting
- [ ] Free tier: 3rd download works
- [ ] Free tier: 4th download blocked with upgrade prompt

---

## Browser Testing

| Browser | Landing | Upload | Process | Download | Auth |
|---------|---------|--------|---------|----------|------|
| Chrome (Mac) | [ ] | [ ] | [ ] | [ ] | [ ] |
| Safari (Mac) | [ ] | [ ] | [ ] | [ ] | [ ] |
| Firefox (Mac) | [ ] | [ ] | [ ] | [ ] | [ ] |
| Chrome (Windows) | [ ] | [ ] | [ ] | [ ] | [ ] |
| Edge (Windows) | [ ] | [ ] | [ ] | [ ] | [ ] |
| Chrome (Mobile) | [ ] | [ ] | [ ] | [ ] | [ ] |
| Safari (iOS) | [ ] | [ ] | [ ] | [ ] | [ ] |

---

## Known Limitations (Communicate to Users)

1. **ZIP files**: Must extract before uploading
2. **XLSX files**: Save as CSV first (especially Gemini)
3. **Bank statements**: Post-MVP feature
4. **Free tier**: 3 downloads per month

---

## Sign-Off

| Area | Tester | Date | Pass/Fail |
|------|--------|------|-----------|
| Critical Blockers | | | |
| AWS Infrastructure | | | |
| Edge Cases | | | |
| Browser Testing | | | |

**Launch Decision**: [ ] GO / [ ] NO-GO

**Notes**:
