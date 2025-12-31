# TaxReadyWallet Backend Overhaul Plan
## From Crypto-Only MVP → Production-Ready Universal Tax Platform

**Repository:** https://github.com/Sean-Bravo/TaxReadyWallet
**Current State:** Crypto transaction processing MVP
**Target State:** Production-ready universal CSV tax categorization backend
**Timeline:** 8-10 weeks
**Infrastructure:** AWS Serverless (Lambda, RDS, SQS, S3)

---

## 🎯 Strategic Transformation

### What's Changing:

| Aspect | Before (Crypto MVP) | After (Universal Production) |
|--------|---------------------|------------------------------|
| **Market** | Crypto traders (5-10M) | All small businesses (60M+) |
| **CSV Sources** | Coinbase, Binance only | Banks, cards, PayPal, crypto, etc. |
| **Architecture** | Monolithic/simple | Serverless, scalable, fault-tolerant |
| **AI** | Single model | Tier-based (Gemini/Haiku/Opus) |
| **Security** | Basic | Enterprise-grade (GuardDuty, ClamAV) |
| **Cost Model** | Unsustainable | Tier-based, self-funding |
| **Scale** | Prototype | Production (300 jobs/hour) |

---

## 📦 Current Repository Analysis

### Assumed Current Structure:
```
TaxReadyWallet/
├── backend/
│   ├── api/                    # Express/Next.js API routes?
│   ├── services/               # CSV processing logic
│   ├── models/                 # Database models
│   └── utils/                  # Helper functions
├── frontend/                   # Next.js app (already exists in /trw)
├── package.json
└── README.md
```

### What We'll Keep:
- ✅ Frontend (already production-ready at `/Users/sean/Desktop/trw`)
- ✅ Core business logic concepts
- ✅ Tax category knowledge

### What We'll Replace:
- ❌ Monolithic backend → Serverless Lambdas
- ❌ Single database → RDS Proxy + PostgreSQL + Redis
- ❌ Synchronous processing → Async SQS queue
- ❌ Basic CSV parsing → Multi-format validator
- ❌ Single AI model → Tier-based AI (Gemini/Claude)
- ❌ No virus scanning → ClamAV + GuardDuty

---

## 🏗️ New Backend Architecture

### Directory Structure (New):
```
TaxReadyWallet/
├── backend/
│   ├── terraform/                          # Infrastructure as Code
│   │   ├── main.tf
│   │   ├── vpc.tf                          # VPC + subnets + endpoints
│   │   ├── rds.tf                          # PostgreSQL + RDS Proxy
│   │   ├── lambda.tf                       # Webhook, Virus Scanner, Processor
│   │   ├── sqs.tf                          # Job queue + DLQ
│   │   ├── s3.tf                           # CSV uploads bucket
│   │   ├── secrets.tf                      # Secrets Manager
│   │   ├── monitoring.tf                   # CloudWatch alarms
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   ├── lambdas/
│   │   ├── webhook/                        # Stripe webhook handler
│   │   │   ├── src/
│   │   │   │   ├── index.ts                # Main handler
│   │   │   │   ├── rate-limiter.ts         # Tier-based rate limiting
│   │   │   │   ├── database.ts             # RDS Proxy connection
│   │   │   │   └── types.ts
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   │
│   │   ├── virus-scanner/                  # S3-triggered malware detection
│   │   │   ├── src/
│   │   │   │   ├── index.ts                # Main handler
│   │   │   │   ├── clamav-scanner.ts       # ClamAV integration (free tier)
│   │   │   │   ├── guardduty-scanner.ts    # GuardDuty integration (pro/premium)
│   │   │   │   ├── tier-selector.ts        # Choose scanner by tier
│   │   │   │   └── database.ts
│   │   │   ├── package.json
│   │   │   └── layers/
│   │   │       └── clamav/                 # ClamAV Lambda Layer
│   │   │
│   │   └── processor/                      # Main CSV processing worker
│   │       ├── src/
│   │       │   ├── index.ts                # SQS trigger handler
│   │       │   ├── csv-parser.ts           # Multi-format CSV parsing
│   │       │   ├── ai-categorizer.ts       # Tier-based AI categorization
│   │       │   ├── ai-models/
│   │       │   │   ├── gemini-flash.ts     # Free tier (Google)
│   │       │   │   ├── claude-haiku.ts     # Pro tier (Anthropic)
│   │       │   │   └── claude-opus.ts      # Premium tier (Anthropic)
│   │       │   ├── database.ts             # RDS Proxy connection
│   │       │   ├── email-sender.ts         # SendGrid integration
│   │       │   ├── transaction-types.ts    # Universal transaction detection
│   │       │   └── tax-categories.ts       # IRS-compliant categories
│   │       ├── package.json
│   │       └── tsconfig.json
│   │
│   ├── database/
│   │   ├── migrations/
│   │   │   ├── 001_initial_schema.sql
│   │   │   ├── 002_quarterly_partitions.sql
│   │   │   ├── 003_ai_cache_table.sql
│   │   │   ├── 004_rate_limits_table.sql
│   │   │   └── 005_universal_csv_fields.sql
│   │   ├── seeds/
│   │   │   └── tax_categories.sql
│   │   └── README.md
│   │
│   ├── shared/                             # Shared libraries
│   │   ├── types/
│   │   │   ├── job.ts
│   │   │   ├── transaction.ts
│   │   │   └── tier.ts
│   │   ├── constants/
│   │   │   ├── tax-categories.ts
│   │   │   └── csv-formats.ts
│   │   └── utils/
│   │       ├── decimal.ts                  # Tax-grade precision math
│   │       └── validation.ts
│   │
│   ├── scripts/
│   │   ├── deploy.sh                       # Deployment automation
│   │   ├── migrate-db.sh                   # Run database migrations
│   │   ├── seed-db.sh                      # Seed tax categories
│   │   └── test-load.sh                    # Load testing script
│   │
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── csv-parser.test.ts
│   │   │   ├── ai-categorizer.test.ts
│   │   │   └── rate-limiter.test.ts
│   │   ├── integration/
│   │   │   ├── job-flow.test.ts
│   │   │   └── tier-based-ai.test.ts
│   │   └── e2e/
│   │       ├── stripe-webhook-to-email.test.ts
│   │       └── csv-formats/
│   │           ├── chase-bank.csv
│   │           ├── amex.csv
│   │           ├── paypal.csv
│   │           └── coinbase.csv
│   │
│   ├── docs/
│   │   ├── BACKEND_ARCHITECTURE.md         # Complete spec (already created)
│   │   ├── RDS_PROXY_FIX_SUMMARY.md        # Connection pool guide
│   │   ├── TIER_BASED_IMPLEMENTATION_SUMMARY.md
│   │   ├── UNIVERSAL_CSV_MIGRATION_CHECKLIST.md
│   │   ├── DEPLOYMENT_GUIDE.md
│   │   └── RUNBOOK.md
│   │
│   ├── package.json                        # Root package.json
│   ├── tsconfig.json                       # Shared TypeScript config
│   └── README.md
│
└── frontend/                               # (Your existing Next.js app at /trw)
    └── (Already production-ready)
```

---

## 🔧 Implementation Phases

### Phase 1: Infrastructure Setup (Week 1-2)

**Goal:** Terraform infrastructure deployed, databases ready

**Tasks:**
1. **Terraform Base Configuration**
   - [ ] VPC with public + private subnets
   - [ ] VPC endpoints (S3, SQS, Secrets Manager, RDS)
   - [ ] Security groups
   - [ ] IAM roles for Lambdas

2. **Database Setup**
   - [ ] RDS PostgreSQL t4g.small (2GB RAM, 100 max connections)
   - [ ] RDS Proxy (connection pooling, 50 max)
   - [ ] Parameter group (max_connections=100)
   - [ ] Security group (allow from Lambda subnet only)

3. **Storage & Queues**
   - [ ] S3 bucket (CSV uploads, lifecycle: 90 days)
   - [ ] SQS queue (10min visibility timeout)
   - [ ] DLQ (with CloudWatch alarm at threshold 1)
   - [ ] ElastiCache Redis (AI response caching)

4. **Secrets Management**
   - [ ] Database password
   - [ ] Stripe webhook secret
   - [ ] Google API key (Gemini Flash)
   - [ ] Anthropic API key (Claude Haiku/Opus)
   - [ ] SendGrid API key

**Deliverable:** `terraform apply` succeeds, all infrastructure running

---

### Phase 2: Database Schema & Migrations (Week 2)

**Goal:** PostgreSQL schema deployed with all tables

**Tasks:**
1. **Core Tables**
   - [ ] `jobs` table (with `scan_status`, `transaction_source` fields)
   - [ ] `transactions` table (with `tier`, `cache_hit` fields)
   - [ ] `ai_cache` table (prompt_hash → response mapping)
   - [ ] `rate_limits` table (tier-based throttling)
   - [ ] `audit_logs` table (security events)

2. **Partitioning**
   - [ ] Create quarterly partitions for 2025 (Q1-Q4)
   - [ ] Set up EventBridge rule for auto-partition creation

3. **Indexes**
   - [ ] `idx_jobs_status_created_at`
   - [ ] `idx_transactions_job_id`
   - [ ] `idx_ai_cache_prompt_hash`
   - [ ] `idx_rate_limits_email_window`

4. **Triggers**
   - [ ] `update_updated_at_column()` function + trigger

**Deliverable:** Database schema matches BACKEND_ARCHITECTURE.md spec

---

### Phase 3: Lambda Development (Week 3-5)

#### 3A: Webhook Lambda (Week 3)

**Tasks:**
- [ ] Stripe signature validation
- [ ] Rate limiting (5/hour free, 50/hour pro)
- [ ] Job creation (status: 'pending_scan')
- [ ] Audit logging
- [ ] Error handling
- [ ] Unit tests (90% coverage)

**Key Files:**
- `lambdas/webhook/src/index.ts`
- `lambdas/webhook/src/rate-limiter.ts`
- `lambdas/webhook/src/database.ts`

---

#### 3B: Virus Scanner Lambda (Week 3-4)

**Tasks:**
- [ ] S3 ObjectCreated trigger configuration
- [ ] Tier detection (query database for job tier)
- [ ] Free tier: ClamAV scanner
- [ ] Pro/Premium tier: GuardDuty scanner
- [ ] Job status update (scan_status: 'clean' | 'infected')
- [ ] SQS message send (if clean)
- [ ] Malware alert email (if infected)
- [ ] Unit tests

**Key Files:**
- `lambdas/virus-scanner/src/index.ts`
- `lambdas/virus-scanner/src/clamav-scanner.ts`
- `lambdas/virus-scanner/src/guardduty-scanner.ts`
- `lambdas/virus-scanner/src/tier-selector.ts`

**Lambda Layer:**
- [ ] Download ClamAV Lambda Layer from AWS Serverless Application Repository
- [ ] Or build custom layer with latest virus definitions

---

#### 3C: Processor Lambda (Week 4-5)

**Tasks:**
- [ ] SQS trigger handler
- [ ] Atomic job claiming (UPDATE...WHERE status='pending' RETURNING *)
- [ ] **Universal CSV parsing:**
  - [ ] Column name normalization (date/transaction_date/posted_date → date)
  - [ ] Amount normalization (handle debits/credits, negatives, currency symbols)
  - [ ] Format detection (Chase, BofA, AmEx, PayPal, Coinbase, etc.)
- [ ] **Tier-based AI categorization:**
  - [ ] Free tier → Gemini Flash
  - [ ] Pro tier → Claude Haiku
  - [ ] Premium tier → Claude Opus
  - [ ] Fallback chain (Opus → Haiku → Gemini)
  - [ ] Cache check before API call (60% hit rate)
  - [ ] Enhanced prompt for universal transactions
- [ ] Transaction storage with Decimal precision
- [ ] Email generation (SendGrid)
- [ ] Job status update (completed/failed)
- [ ] Integration tests

**Key Files:**
- `lambdas/processor/src/index.ts`
- `lambdas/processor/src/csv-parser.ts` ← **CRITICAL: Universal support**
- `lambdas/processor/src/ai-categorizer.ts` ← **CRITICAL: Tier-based AI**
- `lambdas/processor/src/ai-models/gemini-flash.ts`
- `lambdas/processor/src/ai-models/claude-haiku.ts`
- `lambdas/processor/src/ai-models/claude-opus.ts`
- `lambdas/processor/src/transaction-types.ts` ← **NEW: Detect bank/card/paypal**
- `lambdas/processor/src/tax-categories.ts`

---

### Phase 4: Integration & Testing (Week 6-7)

#### 4A: End-to-End Testing

**Test Scenarios:**
1. **Free Tier User:**
   - [ ] Upload Chase bank CSV (100 transactions)
   - [ ] Verify ClamAV virus scan
   - [ ] Verify Gemini Flash categorization
   - [ ] Verify email delivery
   - [ ] Check rate limiting (6th upload fails)

2. **Pro Tier User:**
   - [ ] Upload AmEx CSV (500 transactions)
   - [ ] Verify GuardDuty virus scan (async)
   - [ ] Verify Claude Haiku categorization
   - [ ] Check cache hit rate (2nd upload ~60% cached)

3. **Premium Tier User:**
   - [ ] Upload PayPal CSV (1000 transactions)
   - [ ] Verify Claude Opus categorization
   - [ ] Verify superior accuracy vs Haiku/Gemini

4. **Mixed CSV Sources:**
   - [ ] Bank statement (Chase)
   - [ ] Credit card (AmEx)
   - [ ] PayPal history
   - [ ] Crypto exchange (Coinbase) ← Still supported!
   - [ ] Verify all parse correctly

5. **Error Scenarios:**
   - [ ] Malware-infected CSV (virus scanner catches)
   - [ ] Malformed CSV (processor fails gracefully)
   - [ ] AI API outage (fallback chain activates)
   - [ ] Database connection exhaustion (RDS Proxy prevents)

#### 4B: Load Testing

**Artillery.js Test Plan:**
```yaml
config:
  target: "https://your-webhook-url.amazonaws.com"
  phases:
    - duration: 300  # 5 minutes
      arrivalRate: 10  # 10 jobs/second = 600 jobs total

scenarios:
  - name: "Concurrent job processing"
    flow:
      - post:
          url: "/api/stripe-webhook"
          json:
            # Stripe webhook payload
```

**Targets:**
- [ ] 50 concurrent jobs (Lambda concurrency limit)
- [ ] Zero connection errors (RDS Proxy works)
- [ ] <10 minute processing time per job (p95)
- [ ] <0.5% job failure rate
- [ ] 60% AI cache hit rate (after warmup)

#### 4C: Cost Validation

**Run 1000 jobs across all tiers:**
- [ ] Free tier: Verify cost = $12.96/1000 jobs
- [ ] Pro tier: Verify GuardDuty charges user ($300/1000)
- [ ] Premium tier: Verify Claude Opus charges minimal (<$10/1000 with cache)
- [ ] Infrastructure baseline: Verify $60/month

---

### Phase 5: Security & Compliance (Week 7)

**Tasks:**
1. **Security Audit**
   - [ ] Penetration testing (Stripe webhook validation)
   - [ ] SQL injection testing (all database queries)
   - [ ] XSS testing (email content)
   - [ ] Rate limiting bypass attempts

2. **Compliance**
   - [ ] Tax category descriptions IRS-compliant
   - [ ] Privacy policy updated (universal CSV processing)
   - [ ] Terms of Service updated
   - [ ] GDPR compliance (data retention: 90 days)
   - [ ] SOC 2 preparation (audit logging)

3. **Monitoring**
   - [ ] CloudWatch dashboards (jobs/hour, errors, latency)
   - [ ] DLQ alerts (threshold 1)
   - [ ] RDS connection monitoring
   - [ ] AI API error rate monitoring
   - [ ] Cost anomaly detection

---

### Phase 6: Documentation & Handoff (Week 8)

**Tasks:**
1. **Developer Documentation**
   - [ ] README.md (architecture overview, setup guide)
   - [ ] DEPLOYMENT_GUIDE.md (step-by-step Terraform deployment)
   - [ ] RUNBOOK.md (troubleshooting common issues)
   - [ ] API_REFERENCE.md (webhook payload format)

2. **Operational Documentation**
   - [ ] Incident response playbook
   - [ ] Database backup/restore procedures
   - [ ] Lambda deployment rollback plan
   - [ ] Cost monitoring guide

3. **User Documentation**
   - [ ] CSV upload guide (how to export from banks)
   - [ ] Supported formats (Chase, BofA, AmEx, PayPal, etc.)
   - [ ] Tax category reference (IRS Schedule C guide)
   - [ ] FAQ

---

### Phase 7: Staging Deployment (Week 9)

**Tasks:**
1. **Staging Environment**
   - [ ] Deploy Terraform to staging AWS account
   - [ ] Deploy all Lambdas
   - [ ] Seed database with test data
   - [ ] Configure Stripe test mode webhooks

2. **Beta Testing**
   - [ ] Recruit 10-20 beta users (mix of freelancers, crypto traders, small businesses)
   - [ ] Provide staging access
   - [ ] Collect feedback on:
     - [ ] Categorization accuracy
     - [ ] CSV format support
     - [ ] Email clarity
     - [ ] Missing features

3. **Bug Fixes**
   - [ ] Address beta feedback
   - [ ] Fix edge cases
   - [ ] Improve AI prompts based on real data

---

### Phase 8: Production Deployment (Week 10)

**Tasks:**
1. **Production Deployment**
   - [ ] Deploy Terraform to production AWS account
   - [ ] Deploy Lambdas with versioning
   - [ ] Run database migrations
   - [ ] Configure Stripe production webhooks
   - [ ] Enable CloudWatch alarms

2. **Launch Checklist**
   - [ ] Smoke test: Process 1 job end-to-end
   - [ ] Load test: 50 concurrent jobs
   - [ ] Monitor: 24 hours of stable operation
   - [ ] Marketing: Update website with universal messaging
   - [ ] Support: Prepare support team with FAQs

3. **Post-Launch Monitoring**
   - [ ] Daily cost review (first week)
   - [ ] Error rate monitoring
   - [ ] User feedback collection
   - [ ] Performance optimization based on real usage

---

## 🔄 Migration Strategy (Existing Users)

### If you have existing crypto users:

**Option 1: Hard Cutover**
- Announce 2-week deprecation window
- Migrate all users to new backend
- Old backend read-only for 30 days (access old reports)

**Option 2: Gradual Migration**
- Run old + new backends in parallel
- New users → new backend (universal)
- Old users → migrate on next upload
- Phase out old backend after 3 months

**Recommendation:** Hard cutover (cleaner, faster, less complexity)

---

## 📊 Success Metrics

### Technical Metrics:
- [ ] 99.9% uptime (8.76 hours downtime/year)
- [ ] <10 minute job processing time (p95)
- [ ] <0.5% job failure rate
- [ ] 60% AI cache hit rate
- [ ] Zero connection exhaustion errors
- [ ] $73/month baseline cost (as projected)

### Business Metrics:
- [ ] 10+ CSV formats supported (Chase, BofA, AmEx, PayPal, Coinbase, etc.)
- [ ] >90% AI categorization accuracy
- [ ] >4.5/5 user satisfaction (post-job survey)
- [ ] <2% support ticket rate
- [ ] 10%+ free → paid conversion rate

---

## 💰 Cost Projection (Production)

### Infrastructure Baseline: $60/month
- RDS t4g.small: $24.82
- RDS Proxy: $10.08
- ElastiCache: $11.52
- VPC Endpoints: $7.00
- Secrets Manager: $1.60
- S3 Storage: $1.15
- CloudWatch: $3.15
- SNS: $0.50

### Per 1000 Jobs (Free Tier): $12.96
- Lambda: $10.50
- Virus scanning (ClamAV): $1.00
- AI (Gemini Flash): $0.00
- RDS compute: $1.00
- Other: $0.46

### Total Free Tier (1000 jobs/month): $73/month

**ROI:** At 10% conversion to Pro ($89/year), break-even at ~1000 free tier users

---

## 🚀 Launch Readiness Checklist

- [ ] All Terraform resources deployed
- [ ] Database schema migrated
- [ ] All 3 Lambdas deployed and tested
- [ ] RDS Proxy connection pooling verified
- [ ] Tier-based AI working (Gemini/Haiku/Opus)
- [ ] Tier-based virus scanning working (ClamAV/GuardDuty)
- [ ] 10+ CSV formats tested and parsing correctly
- [ ] Load test passed (50 concurrent jobs, zero failures)
- [ ] Security audit completed
- [ ] Legal compliance verified (IRS categories, privacy policy)
- [ ] Monitoring dashboards configured
- [ ] CloudWatch alarms triggering correctly
- [ ] Beta testing completed (10+ users)
- [ ] Documentation complete (README, RUNBOOK, FAQ)
- [ ] Marketing website updated (universal messaging)
- [ ] Support team trained
- [ ] Launch announcement ready

---

## 🎯 Next Steps

1. **Review this plan** - Approve overall approach
2. **Start Phase 1** - Terraform infrastructure setup
3. **Parallel work:**
   - You: Update frontend for universal messaging
   - Me: Build Terraform configs + Lambda code
4. **Weekly check-ins** - Review progress, adjust timeline

---

## 📞 Support During Migration

**If you need help:**
- Architecture questions → Reference BACKEND_ARCHITECTURE.md
- Connection pool issues → Reference RDS_PROXY_FIX_SUMMARY.md
- Tier-based AI → Reference TIER_BASED_IMPLEMENTATION_SUMMARY.md
- Universal CSV → Reference UNIVERSAL_CSV_MIGRATION_CHECKLIST.md

**Terraform starts when you're ready.** 🚀

---

**Document Status:** Ready for Review
**Next Action:** Your approval to proceed with Phase 1 (Terraform Infrastructure)
