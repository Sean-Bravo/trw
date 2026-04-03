# TaxFormatter — Release Status

> **Last Updated:** 2026-04-03
> **Overall Status:** P0 complete. P1 in progress.
> **Previous Name:** TaxReadyWallet (renamed to TaxFormatter)

## Quick Reference

| Metric | Value |
|--------|-------|
| Tests Passing | 540+ (480 unit + 60 E2E) |
| Security Grade | A- (92/100) |
| Crypto Exchange Parsers | 14 |
| Bank Statement Parsers | 13 |
| Export Formats | 4 (Koinly, TurboTax, CoinLedger, ZenLedger) |
| Packages Ready to Publish | 3 (2 npm + 1 PyPI) |
| Build Phases Complete | 4/4 |

---

## 1. What's Shipped

### API Pivot (Mar 17-18)
TaxFormatter pivoted from consumer SaaS (upload CSV, download fixed file) to developer API platform. The parsing engine (`engine.py`) is now exposed as a REST API and MCP server. Consumer features still work but are free for all logged-in users. Revenue comes from API tiers.

### Build Plan — 4 Phases Complete (Mar 23-24)

| Phase | What | Commit |
|-------|------|--------|
| 1. Stripe Billing | Real keys, products, webhook hardening, payment failure handling | `509eaa0` |
| 2. REST API Polish | X-Request-Id, Retry-After, input validation, metadata fix | `c351d0c` |
| 3. MCP Server | `@taxformatter/mcp-server` — npm publish-ready, typed errors, configurable | `eab3f4e` |
| 4. SDKs | `@taxformatter/sdk` (Node) + `taxformatter` (Python) | `9d3f37c` |

### Core Features

**API Endpoints:**
- `POST /v1/parse` — Parse crypto CSV or bank PDF (base64-encoded)
- `GET /v1/sources` — List supported exchanges and banks
- `GET /v1/usage` — Usage stats for current API key
- `GET /v1/health` — Health check

**Authentication & Billing:**
- API key auth (`tf_live_` prefix, SHA-256 hashed)
- Per-tier rate limiting (RPM) and monthly quotas
- Stripe checkout, webhooks (7 events), customer portal
- Payment failure disables key, payment success re-enables

**Developer Tools:**
- MCP server for Claude Code, Cursor, Windsurf
- Node.js SDK with auto-retry on 429, typed errors, zero deps
- Python SDK with same features, single dep (`requests`)
- Developer dashboard with key management, usage bars, curl snippets

**Consumer Features (still working, now free):**
- 14 exchange parsers (Coinbase, Kraken, Binance, Robinhood, Crypto.com, PayPal, Cash App, Gemini, FTX, Venmo, KuCoin, Bybit, Bitfinex, OKX)
- 13 bank parsers (Chase, BofA, Wells Fargo, Citi, Capital One, US Bank, PNC, TD Bank, Mercury, Navy Federal, Regions, HSBC, BMO)
- 4 export formats, AI insights, job processing pipeline
- Full auth (email/password, Google OAuth, 2FA, password reset)

**Infrastructure:**
- 4 AWS Lambdas (webhook, scanner, processor, API)
- API Gateway with custom domain (api.taxformatter.com)
- S3 (3 buckets), SQS + DLQ, WAF, CloudWatch
- Neon PostgreSQL (11 tables)
- Sentry error tracking, CSP headers, HSTS

---

## 2. Package Publishing

### npm: `@taxformatter/mcp-server` v0.1.0

MCP server for AI agents to parse financial documents via TaxFormatter API.

**Registry:** https://www.npmjs.com/package/@taxformatter/mcp-server

**Publish:**
```bash
cd packages/mcp-server
npm run build
npm publish --access public
```

**Verify:**
```bash
npm info @taxformatter/mcp-server
```

**Pre-publish checklist:**
- [ ] `npm run build` succeeds
- [ ] `npm pack --dry-run` shows expected files (dist/, bin/, README.md, LICENSE)
- [ ] 19/19 tests passing
- [ ] README has correct install instructions and config examples
- [ ] CHANGELOG.md is current (v0.1.0)

**Post-publish:**
- [ ] `npx @taxformatter/mcp-server` runs without error (will fail without API key, but should start)
- [ ] Submit to MCP directories: [Smithery](https://smithery.ai), [mcp.run](https://mcp.run), [Glama](https://glama.ai/mcp/servers)

---

### npm: `@taxformatter/sdk` v0.1.0

Official Node.js SDK. Zero runtime dependencies.

**Registry:** https://www.npmjs.com/package/@taxformatter/sdk

**Publish:**
```bash
cd packages/sdk-node
npm run build
npm publish --access public
```

**Verify:**
```bash
npm info @taxformatter/sdk
```

**Pre-publish checklist:**
- [ ] `npm run build` succeeds
- [ ] 17/17 tests passing
- [ ] `npm pack --dry-run` shows expected files (dist/, README.md, LICENSE)
- [ ] README has install instructions and quick-start example

---

### PyPI: `taxformatter` v0.1.0

Official Python SDK. Single dependency (`requests`). Python 3.8+.

**Registry:** https://pypi.org/project/taxformatter/

**Publish:**
```bash
cd packages/sdk-python
pip install build twine
python -m build
twine upload dist/*
```

**Verify:**
```bash
pip install taxformatter
python -c "from taxformatter import TaxFormatter; print('OK')"
```

**Pre-publish checklist:**
- [ ] 19/19 tests passing (`pytest`)
- [ ] `python -m build` produces `.tar.gz` and `.whl` in `dist/`
- [ ] PyPI account created with API token (or configure trusted publisher via GitHub Actions)
- [ ] README renders correctly (test with `twine check dist/*`)

**Alternative — Trusted Publisher (no API token needed):**
Set up in PyPI project settings → "Publishing" → add GitHub Actions as trusted publisher. Then publish via CI with no secrets needed.

---

## 3. Production Verification — P0 (Launch Blockers) ✅ COMPLETE

All items verified and passing as of 2026-04-03.

| # | Task | Status |
|---|------|--------|
| 1 | Verify Lambda health | ✅ |
| 2 | Set prod env vars in Vercel | ✅ |
| 3 | Google OAuth redirect URI | ✅ |
| 4 | Live Stripe checkout test | ✅ |
| 5 | Presigned URL + S3 upload | ✅ |
| 6 | End-to-end API test | ✅ |
| 7 | Download all 4 formats | ✅ |
| 8 | Auth flows | ✅ |
| 9 | Check for 500 errors | ✅ |
| 10 | Beta user UAT | ✅ |

---

## 4. Pre-Launch Polish — P1 (Should Do)

| Task | Est. | Notes |
|------|------|-------|
| ~~Stripe branding~~ | ~~10 min~~ | ✅ Complete |
| Cross-browser testing | 4-6 hr | Chrome, Safari, Firefox on macOS. Windows + mobile (Pixel, iPhone) |
| Fix CI/CD continue-on-error flags | 1-2 hr | `.github/workflows/ci.yml` has 3 `continue-on-error: true` TODOs |
| Review CloudWatch dashboard | 30 min | Verify alarms fire correctly, check DLQ is empty |
| Smoke test MCP server | 15 min | Add config to Claude Code, run `parse_crypto_csv` tool |
| Webhook endpoint registration | 10 min | Verify `https://taxformatter.com/api/webhooks/stripe` is registered in Stripe for all 7 events |

---

## 5. Growth & Marketing — P2 (Post-Launch)

### Content
- [ ] Publish 5 blog posts (already drafted in repo root as `blog-post-*.md`)
- [ ] Set up Google Search Console for taxformatter.com
- [ ] Add structured data (JSON-LD) for API product

### Paid Acquisition
- [ ] Launch Google Ads campaign (plan: `TaxFormatter_Google_Ads_Campaign_Plan.md`)
  - Ad Group 1: Bank statement parsing (year-round)
  - Ad Group 2: Crypto CSV formatting (seasonal Jan-Apr)
  - Conversion tracking: `AW-17945154043`

### Developer Distribution
- [ ] Submit MCP server to directories (Smithery, mcp.run, Glama)
- [ ] Product Hunt launch
- [ ] Reddit: r/selfhosted, r/cryptocurrency, r/taxpros
- [ ] Hacker News: Show HN post
- [ ] IndieHackers product page
- [ ] Dev.to / Hashnode article on bank statement parsing API

### Future Product
- [ ] Enterprise tier (custom pricing, SLA, dedicated support)
- [ ] Async endpoint for large PDFs (50+ pages)
- [ ] Move rate limiting to Redis/Upstash (currently in-memory per Lambda instance)
- [ ] GitHub Actions workflow for automated npm/PyPI publishing on tag

---

## 6. API Pricing

Products created in Stripe Dashboard (Mar 19). Price IDs in Vercel env vars.

| Tier | Price | Files/month | RPM | Target |
|------|-------|-------------|-----|--------|
| Starter | $29/mo | 100 | 30 | Developers evaluating, solo bookkeepers |
| Growth | $99/mo | 500 | 60 | Accounting firms, growing apps |
| Business | $249/mo | 2,000 | 120 | Fintech SaaS, large firms |

Consumer tiers (Free/$0, Pro/$9/mo, Premium/$19/mo) removed on Mar 23. Consumer features are now free for all logged-in users.

---

## 7. Infrastructure Reference

| Layer | Service | Detail |
|-------|---------|--------|
| Frontend | Vercel | Next.js 16.1, taxformatter.com |
| Database | Neon PostgreSQL | 11 tables, connection pooling |
| API | AWS API Gateway | api.taxformatter.com, TLS 1.2, 50 rpm / 100 burst |
| Compute | AWS Lambda x4 | webhook (60s/512MB), scanner (300s/1024MB), processor (900s/2048MB), API (120s/1024MB) |
| Storage | AWS S3 x3 | uploads, results, lambda code. Versioned, encrypted, 1yr lifecycle |
| Queue | AWS SQS + DLQ | 4-day retention, 3 retries before DLQ |
| Security | AWS WAF | Rate limiting, SQLi/XSS prevention |
| Payments | Stripe | 3 API tiers, 7 webhook events |
| Email | Resend + AWS SES | Transactional (verification, password reset) |
| Monitoring | Sentry + CloudWatch | Error tracking, 5XX/4XX alarms, DLQ alarm, queue depth alarm |
| Analytics | GA4 + Plausible | G-1B5PK7TZ87, taxformatter.com |
| IaC | Terraform | All AWS resources managed in `backend/terraform/` |

---

## 8. Environment Variables

All required env vars are documented in `.env.example`. Critical production values:

| Category | Variables |
|----------|-----------|
| App | `NEXT_PUBLIC_APP_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET` |
| Google OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Database | `NEON_DATABASE_URL` |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_API_PRICE_STARTER`, `STRIPE_API_PRICE_GROWTH`, `STRIPE_API_PRICE_BUSINESS` |
| AWS | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` |
| AI | `GOOGLE_GEMINI_API_KEY` |
| Sentry | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` |
| Ads | `NEXT_PUBLIC_GOOGLE_ADS_ID`, `NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL` |

---

## 9. Key Files

### API & Backend
| File | Purpose |
|------|---------|
| `backend/handlers/api.py` | API Lambda handler — `/v1/parse`, `/v1/sources`, `/v1/usage`, `/v1/health` |
| `backend/services/api_auth.py` | Key validation, rate limiting, usage tracking |
| `backend/services/engine.py` | Core parsing engine (14 crypto parsers, generic fallback) |
| `backend/services/bank_statement/` | Bank PDF → structured data pipeline |
| `backend/deploy.sh` | Package + deploy all 4 Lambdas |
| `backend/terraform/` | All AWS IaC |

### Packages
| File | Purpose |
|------|---------|
| `packages/mcp-server/` | `@taxformatter/mcp-server` — MCP server for AI agents |
| `packages/sdk-node/` | `@taxformatter/sdk` — Node.js SDK |
| `packages/sdk-python/` | `taxformatter` — Python SDK |

### Dashboard & Auth
| File | Purpose |
|------|---------|
| `app/dashboard/developer/page.tsx` | Developer dashboard |
| `components/dashboard/ApiKeyManager.tsx` | API key CRUD, usage bars, upgrade flow |
| `app/api/developer/keys/route.ts` | Key create + list |
| `app/api/developer/subscribe/route.ts` | Stripe checkout for API tiers |
| `app/api/webhooks/stripe/route.ts` | Stripe webhook handler (7 events) |
| `app/api/customer-portal/route.ts` | Stripe billing portal |
| `lib/stripe.ts` | Stripe client, price IDs, config validation |

### Documentation
| File | Purpose |
|------|---------|
| `content/docs/api/index.md` | Full API reference |
| `docs/STRIPE_SETUP.md` | Stripe integration guide |
| `docs/DEPLOYMENT_CHECKLIST.md` | Deployment guide |
| `ARCHITECTURE.md` | System overview, data flow, gotchas |
| `BUILD_PLAN.md` | 4-phase build plan (all complete) |

### Marketing
| File | Purpose |
|------|---------|
| `components/marketing/APIHero.tsx` | Landing page hero with animated terminal |
| `components/marketing/APIDemo.tsx` | Interactive API demo |
| `components/marketing/APIPricing.tsx` | API tier pricing cards |
| `blog-post-*.md` | 5 SEO blog posts (ready to publish) |

---

## 10. Known Limitations & Gotchas

| Issue | Workaround | Risk |
|-------|------------|------|
| API rate limiting is per-Lambda-instance | At low traffic this is fine. Move to Redis/Upstash at scale | Low |
| Archive files (.zip, .tar.gz) | Users must extract before uploading | Low |
| XLSX files (Gemini) | Users must save as CSV first | Low |
| API Lambda timeout is 120s | Large PDFs (50+ pages) may timeout. Add async endpoint later | Medium |
| No VPC on Lambdas | Direct connection to Neon (public internet). Faster cold starts but no private networking | Low |
| Sentry `diagnoseSdkConnectivity()` doesn't respect tunnel | Client errors route through `/monitoring` but connectivity check bypasses it | Low |
| SQS concurrency capped at 10 | Consumer processing limited to 10 concurrent jobs | Low |

---

## 11. Test Coverage

| Component | Tests | Coverage |
|-----------|-------|----------|
| Security (validation.ts) | 82 | 94.59% |
| Security (rate-limit.ts) | 32 | 88.88% |
| UI Components | 94 | High |
| API Routes (Auth) | 100 | All endpoints |
| API Routes (Bank) | 57 | Core paths |
| Dashboard Components | 62 | Core covered |
| Marketing Components | 54 | High |
| E2E (Playwright) | 60 | 5 browsers |
| API Handler + Auth | 51 | All endpoints |
| MCP Server | 19 | Full |
| Node SDK | 17 | Full |
| Python SDK | 19 | Full |
| **Total** | **647** | |

Jest coverage thresholds: 85% branches, 85% functions, 90% lines, 90% statements.
