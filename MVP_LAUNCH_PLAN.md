# TaxFormatter 7-Day MVP Launch Plan

**Start Date:** January 17, 2026 (Saturday)
**Launch Date:** January 23, 2026 (Friday)

---

## Day 1 (Saturday, Jan 17) - Backend Deployment & Smoke Test

### Morning
- [ ] Deploy Lambda functions: `./backend/deploy.sh deploy`
- [ ] Verify API Gateway endpoints respond (api.taxformatter.com)
- [ ] Test presigned URL generation
- [ ] Test S3 upload flow

### Afternoon
- [ ] Test end-to-end flow with Coinbase CSV
- [ ] Verify AI Insights generates (check Gemini API key)
- [ ] Test all 4 export formats download correctly
- [ ] Check CloudWatch logs for errors

### Deliverable
Backend fully deployed and processing files

---

## Day 2 (Sunday, Jan 18) - Exchange Parser Testing

### Test Each Parser with Real CSV Files

| Exchange | Test File | Expected |
|----------|-----------|----------|
| Coinbase | Export from Coinbase | Auto-detect, parse buys/sells |
| Kraken | ledgers.csv | Refid grouping works |
| Binance | Trade history CSV | Buy/sell parsing |
| KuCoin | Trade export | Unix timestamp handling |
| Bybit | Trade history | Concatenated pair parsing |
| Robinhood | Activity export | American date format |
| Crypto.com | Transaction export | 25+ transaction types |
| PayPal | Activity download | Crypto filtering |
| Cash App | BTC transactions | BTC-only filter |
| Gemini | CSV (converted from XLSX) | Column detection |
| FTX | Bankruptcy claims CSV | Historical data |

### Afternoon
- [ ] Document any parser failures
- [ ] Fix critical bugs found
- [ ] Re-deploy if needed

### Deliverable
All 12 parsers verified working with real data

---

## Day 3 (Monday, Jan 19) - Frontend Testing & Multi-File Upload

### Frontend Cross-Browser Testing

- [ ] Test on Chrome (desktop)
- [ ] Test on Safari (desktop)
- [ ] Test on Firefox (desktop)
- [ ] Test on Chrome (mobile)
- [ ] Test on Safari (iOS)
- [ ] Fix any responsive issues found

### Multi-File Upload Testing

- [ ] Upload 2-3 CSVs from same exchange
- [ ] Upload CSVs from different exchanges
- [ ] Verify each file processes correctly
- [ ] Check job history shows all uploads

### Afternoon
- [ ] Fix any bugs found
- [ ] Re-deploy if needed

### Deliverable
Frontend works across all browsers, multi-file upload verified

### Note: Bank Statement Feature
Bank statement PDF parsing is NOT implemented. This is a **post-MVP feature** (see roadmap). Ensure UI does not show bank statement options to users.

---

## Day 4 (Tuesday, Jan 20) - User Flow Testing

### Complete User Journey Tests

**Flow 1: New User Signup**
- [ ] Google OAuth signup
- [ ] Email/password signup
- [ ] Email verification flow
- [ ] Redirect to dashboard

**Flow 2: Upload & Process**
- [ ] Drag & drop upload
- [ ] Click to upload
- [ ] Progress indicator updates
- [ ] AI Insights panel populates
- [ ] Error state handling

**Flow 3: Download**
- [ ] Koinly format download
- [ ] TurboTax format download
- [ ] CoinLedger format download
- [ ] ZenLedger format download
- [ ] Free tier download limit (3/month)

**Flow 4: Return User**
- [ ] Job history shows previous uploads
- [ ] Can re-download previous jobs
- [ ] Settings page works

### Deliverable
All user flows working end-to-end

---

## Day 5 (Wednesday, Jan 21) - Edge Cases & Error Handling

### Test Error Scenarios

- [ ] Upload invalid file type (.pdf, .docx)
- [ ] Upload empty CSV
- [ ] Upload CSV with only headers
- [ ] Upload very large CSV (>50MB)
- [ ] Upload CSV with unknown exchange format
- [ ] Network disconnect during upload
- [ ] Network disconnect during processing

### Test Edge Cases

- [ ] CSV with special characters in amounts
- [ ] CSV with negative numbers
- [ ] CSV with missing columns
- [ ] CSV with extra columns
- [ ] Mixed exchange formats in one file

### Afternoon
- [ ] Fix critical bugs
- [ ] Improve error messages where needed
- [ ] Re-deploy

### Deliverable
Graceful error handling for all edge cases

---

## Day 6 (Thursday, Jan 22) - Performance & Security

### Performance Testing

- [ ] Test with 1,000 row CSV
- [ ] Test with 10,000 row CSV
- [ ] Measure Lambda cold start time
- [ ] Check memory usage in CloudWatch

### Security Review

- [ ] Verify presigned URLs expire correctly
- [ ] Check S3 bucket policies
- [ ] Test file type validation
- [ ] Verify authentication on all API routes
- [ ] Review WAF rules active

### Monitoring Setup

- [ ] CloudWatch alarms configured
- [ ] Sentry error tracking active
- [ ] Set up uptime monitoring (optional)

### Deliverable
Performance acceptable, security verified

---

## Day 7 (Friday, Jan 23) - Final Polish & Soft Launch

### Morning - Final Checks

- [ ] Full end-to-end test (signup → upload → download)
- [ ] Test on fresh browser (incognito)
- [ ] Review all copy/text for typos
- [ ] Verify docs are accurate

### Afternoon - Soft Launch

- [ ] Enable production environment
- [ ] Test with 1-2 real beta users
- [ ] Monitor CloudWatch for errors
- [ ] Be ready to hotfix

### Evening - Launch Prep

- [ ] Prepare launch announcement
- [ ] Document known limitations
- [ ] Create support FAQ

### Deliverable
MVP live and accepting users

---

## Launch Day (Friday, Jan 23) - Same as Day 7

Public launch happens in the afternoon of Day 7 after final checks:

- [ ] Announce on social media
- [ ] Monitor for issues
- [ ] Respond to user feedback
- [ ] Track usage metrics

---

## Critical Blockers (Must Fix Before Launch)

| Blocker | Status | Owner |
|---------|--------|-------|
| Lambda deployment working | Pending | Backend |
| Presigned URLs work | Pending | Backend |
| At least 5 parsers working | Pending | Backend |
| Download works | Pending | Backend |
| Auth flow complete | Pending | Frontend |
| AI Insights displays | Pending | Full stack |

---

## Known Limitations (Document for Users)

1. **Archive files** - Users must extract .zip/.tar.gz before uploading
2. **XLSX files** - Users must save as CSV (affects Gemini users)
3. **Bank statements** - NOT built yet (post-MVP roadmap)
4. **Free tier** - 3 downloads per month limit

---

## Post-Launch Roadmap

**Week 2:**
- Archive extraction support (.zip, .tar.gz)
- XLSX parsing for Gemini

**Week 3:**
- Bank statement PDF parsing
- Additional exchange parsers if requested

**Week 4:**
- Stripe payments integration
- Pro/Premium tiers active

---

## Daily Standup Questions

1. What did you complete yesterday?
2. What are you working on today?
3. Any blockers?

---

## Emergency Contacts

- AWS Console: [your-account]
- Neon Dashboard: [neon-project]
- Sentry: [sentry-project]
- Domain: taxformatter.com (Vercel)

---

**Remember:** Ship it, get feedback, iterate. Perfect is the enemy of done.
