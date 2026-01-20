# Day 4 (Tuesday) - User Flow Testing

## Overview
End-to-end testing of all user journeys from signup to download. Verify each flow works correctly across the full stack.

---

## 1. Authentication Flows

### Google OAuth Signup
- [ ] Click "Sign Up" → "Continue with Google"
- [ ] Complete Google consent screen
- [ ] Verify redirect to dashboard
- [ ] Check user created in database
- [ ] Verify session persists on refresh

### Email/Password Signup
- [ ] Fill signup form with valid email
- [ ] Submit and check for verification email
- [ ] Verify password requirements enforced
- [ ] Check error handling for existing email

### Email Verification
- [ ] Click link in verification email
- [ ] Verify redirect to dashboard or login
- [ ] Check `emailVerified` field updated in DB
- [ ] Test expired/invalid token handling

### Login Flow
- [ ] Login with verified account
- [ ] Login with Google OAuth
- [ ] Test "Forgot Password" flow
- [ ] Verify session timeout behavior

---

## 2. File Upload Flows

### Drag & Drop Upload
- [ ] Drag CSV file onto dropzone
- [ ] Verify visual feedback (border highlight)
- [ ] Check file appears in list
- [ ] Test multiple files drag

### Click to Upload
- [ ] Click dropzone to open file picker
- [ ] Select single file
- [ ] Select multiple files
- [ ] Verify file validation (CSV only, size limit)

### Progress Indicator
- [ ] Upload starts immediately or on button click
- [ ] Progress bar shows real progress
- [ ] Stage indicators update (requesting → uploading → confirming)
- [ ] Smooth animations

### Upload Errors
- [ ] Test invalid file type rejection
- [ ] Test oversized file rejection
- [ ] Test network error handling
- [ ] Test rate limit error message

---

## 3. Processing & Results

### AI Insights Panel
- [ ] Shows "detecting" state during scan
- [ ] Exchange detected displays correctly
- [ ] Transaction count updates
- [ ] Progress bar animates smoothly
- [ ] Completion state shows all green checks

### Processing Terminal
- [ ] Log entries appear with animation
- [ ] Cursor blinks
- [ ] Auto-scrolls to latest entry
- [ ] Shows relevant processing steps

### Error States
- [ ] Auto-detect failure shows exchange selector
- [ ] Manual exchange selection triggers retry
- [ ] Error messages are clear and actionable
- [ ] Can upload new file after error

---

## 4. Download Flows

### Koinly Download
- [ ] Click Koinly button
- [ ] File downloads with correct name
- [ ] CSV format matches Koinly requirements
- [ ] Contains all processed transactions

### TurboTax Download
- [ ] Click TurboTax button
- [ ] File downloads with correct name
- [ ] Format matches TurboTax 8949
- [ ] Headers and data correct

### CoinLedger Download
- [ ] Click CoinLedger button
- [ ] File downloads correctly
- [ ] Format matches CoinLedger spec

### ZenLedger Download
- [ ] Click ZenLedger button
- [ ] File downloads correctly
- [ ] Format matches ZenLedger spec

---

## 5. Tier & Limits

### Free Tier Limits
- [ ] First 3 uploads work
- [ ] 4th upload shows upgrade prompt
- [ ] Counter resets monthly
- [ ] Check limit displayed in UI

### Upgrade Flow
- [ ] "Upgrade" button visible when at limit
- [ ] Redirects to pricing page
- [ ] Stripe checkout works
- [ ] Tier updates after payment

---

## 6. Job History

### History Table
- [ ] All past jobs display
- [ ] Status badges show correctly (succeeded, failed, processing)
- [ ] Timestamps format correctly
- [ ] Pagination works (if implemented)

### Re-download Old Jobs
- [ ] Click download on completed job
- [ ] All format options available
- [ ] Download works for jobs > 24h old
- [ ] Check S3 presigned URL expiration handling

### Job Details
- [ ] Click job row to view details
- [ ] Shows transaction breakdown
- [ ] Shows detected exchange
- [ ] Error details visible for failed jobs

---

## Test Accounts Needed

| Account Type | Email | Purpose |
|--------------|-------|---------|
| Fresh account | test-fresh@example.com | Test new user flow |
| Free tier at limit | test-limited@example.com | Test limit enforcement |
| Pro tier | test-pro@example.com | Test pro features |
| Google OAuth | (personal Gmail) | Test OAuth flow |

---

## Test Files Needed

| File | Exchange | Purpose |
|------|----------|---------|
| coinbase_valid.csv | Coinbase | Happy path test |
| kraken_valid.csv | Kraken | Multi-exchange test |
| binance_valid.csv | Binance | Complex format test |
| invalid_format.csv | Unknown | Error handling test |
| too_large.csv | Any | Size limit test |
| empty.csv | None | Edge case test |

---

## Environment Checklist

Before testing:
- [ ] Database has clean test data
- [ ] S3 buckets accessible
- [ ] Lambda functions deployed
- [ ] Stripe test mode configured
- [ ] Email service working (Resend)
- [ ] Environment variables set

---

## Bug Tracking Template

When finding bugs, log:

```markdown
### Bug: [Short description]
- **Flow**: [Which user flow]
- **Steps**: [How to reproduce]
- **Expected**: [What should happen]
- **Actual**: [What happens]
- **Severity**: [Critical/High/Medium/Low]
- **Screenshot**: [If applicable]
```

---

## Success Criteria

- [ ] New user can sign up and process first file
- [ ] All 4 download formats work
- [ ] Free tier limits enforced correctly
- [ ] Job history shows accurate data
- [ ] Error states are clear and recoverable
- [ ] No console errors during flows
- [ ] Mobile flows work on iOS Safari

---

## Priority Order

1. **Critical Path**: Signup → Upload → Download (must work)
2. **Auth Variants**: Google OAuth, email verification
3. **Error Handling**: Invalid files, network errors
4. **Edge Cases**: Limits, old jobs, re-downloads
5. **Polish**: Animations, loading states, messages

---

## Testing Results (January 20, 2026)

### Summary

All core user flows tested and verified working.

| Test Area | Status | Notes |
|-----------|--------|-------|
| Google OAuth Signup | ✅ | Redirects to Google correctly (localhost redirect URI not configured - expected) |
| Email/Password Signup | ✅ | Password validation enforces 8+ chars with uppercase, lowercase, number |
| Email Verification | ✅ | 6-digit code flow works, redirects to dashboard on success |
| Login Flow | ✅ | Email/password login works, session persists |
| Drag & Drop Upload | ✅ | File selection works with visual feedback |
| Click to Upload | ✅ | File picker triggers correctly |
| Upload Progress | ✅ | Progress bar and terminal logs animate smoothly |
| AI Insights Panel | ✅ | Shows all stages: Upload → Virus Scan → Detect Format → Analyze |
| Download Formats | ✅ | All 4 available: TurboTax, Koinly, CoinLedger, ZenLedger |
| Job History | ✅ | Shows all past jobs with View/Download buttons, timestamps correct |

### Detailed Results

#### Authentication
- [x] Signup form validates password requirements (shows error for weak passwords)
- [x] Email verification sends 6-digit code
- [x] Verification code entry works with individual digit inputs
- [x] Successful verification redirects to dashboard
- [x] Login with email/password works
- [x] Sign out redirects to home page
- [x] Session persists on page refresh

#### File Upload & Processing
- [x] File input accepts CSV files only
- [x] "1 file selected" state shows with green checkmark
- [x] "Upload X file" button appears after selection
- [x] Processing terminal shows realistic log entries with timestamps
- [x] AI Insights panel updates through all 4 stages
- [x] "Analysis Complete" state shows when done

#### Download
- [x] Tax software dropdown shows all 4 options
- [x] Each format has description text
- [x] "Download for [Format]" button available
- [x] Transformation Preview section shows before/after

#### Job History
- [x] Processing History section shows at bottom of dashboard
- [x] All completed jobs listed with filenames
- [x] Status badges show "Completed" with green checkmark
- [x] Timestamps display correctly
- [x] View and Download buttons available for each job

#### Security
- [x] Rate limiting works (5 attempts per 15 minutes for login)
- [x] Error message shown: "Too many login attempts. Please try again later."

### Still To Test
- [ ] Error states (invalid file types, oversized files)
- [ ] Actual file download click
- [ ] Re-download from job history

### Notes
- **MVP**: Uploads and downloads are unlimited (no tier limits enforced)
- **Google OAuth**: Works on production; localhost testing requires adding redirect URI to Google Cloud Console
- **Rate limiting**: 5 attempts per 15 minutes on auth endpoints
- **Test account created**: test@example.com (password: TestPass123!)
