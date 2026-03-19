# TaxFormatter API Strategy

**Date:** March 17, 2026

---

## The Opportunity

You already have the hard part built — engine.py with parsers for 12 banks and multiple crypto exchanges. Right now it powers a consumer upload tool. An API wraps the same engine and sells it to developers, fintechs, and accounting SaaS companies who need parsing baked into their own products.

**Why this matters:**
- One API customer can send thousands of files/month — more parser validation than months of ad spend
- Bank statement parsing is year-round demand (not seasonal like crypto tax)
- Recurring revenue that scales without paying per click
- The consumer tool (taxformatter.com/upload) becomes the demo/playground for the API

---

## Competitive Landscape

### Bank Statement Parsing APIs

| Competitor | Pricing | Approach |
|---|---|---|
| DocuClipper | $29/mo (60 pages) → $399/mo (2,000 pages) | PDF to Excel/CSV, accounting integrations |
| Veryfi | Per-page pricing, enterprise-focused | OCR → structured JSON |
| Mindee | $0.01–$0.10/page depending on volume | OCR API, multiple document types |
| Parsio | $49/mo (1,000 credits) → $299/mo (12,000) | AI-driven document parsing |
| Docsumo | Free → $2,499/mo | AI document processing |
| Unstract | Enterprise pricing | Bank statement extraction API |
| Microsoft Document Intelligence | Pay-per-page Azure pricing | US bank statements, OCR |

### Crypto CSV Parsing

| Competitor | Pricing | Approach |
|---|---|---|
| Koinly | $49–$300+/year | End-user tax reports, 10K free txns |
| CoinTracker | $59–$299+/year | End-user tax reports, per-transaction tiers |

**Key insight:** Most crypto competitors are end-user products, not developer APIs. Very few offer a pure "send me a Coinbase CSV, get back clean structured data" API. This is a gap.

---

## TaxFormatter's API Positioning

### What makes you different

1. **You do both bank statements AND crypto** — competitors typically do one or the other
2. **You're a parser, not an OCR tool** — Veryfi/Mindee do generic OCR. You have bank-specific and exchange-specific parsers in engine.py that understand the exact format of a Chase statement or a Coinbase CSV
3. **Output flexibility** — CSV, Excel, QuickBooks (QBO), Xero format. Most OCR APIs return raw JSON and leave formatting to the developer
4. **No OCR overhead for crypto** — Crypto exchange CSVs are already text. You're reformatting, not doing OCR. This means faster processing and lower cost to serve

### Two API products

**1. Bank Statement Parser API**
- Input: PDF bank statement
- Output: Structured JSON, CSV, Excel, QBO, or Xero format
- Supported banks: Chase, BofA, Wells Fargo, Citi, Capital One, US Bank, PNC, TD Bank, Mercury, Navy Federal, Regions, HSBC, BMO
- Value prop: "Upload a bank PDF, get clean transactions back. We detect the bank automatically."
- Year-round demand

**2. Crypto Exchange Formatter API**
- Input: Exchange CSV (Coinbase, Binance, Kraken, etc.)
- Output: Standardized CSV for TurboTax, QuickBooks, or custom format
- Value prop: "Send us any exchange CSV, get tax-ready output. We auto-detect the exchange."
- Seasonal spike (Jan–April) but steady baseline from accounting firms year-round

---

## Pricing Model

### Recommended: Per-file pricing with monthly tiers

Based on competitor research, per-page/per-file pricing is the standard in this space:

| Tier | Price | Files/month | Per-file cost | Target customer |
|---|---|---|---|---|
| Starter | $29/mo | 100 files | $0.29 | Developers evaluating, solo bookkeepers |
| Growth | $99/mo | 500 files | $0.20 | Accounting firms, growing apps |
| Business | $249/mo | 2,000 files | $0.12 | Fintech SaaS, large firms |
| Enterprise | Custom | Unlimited | Negotiated | Lenders, banks, large platforms |

**Why this model:**
- Starter tier gets developers in the door and validates more parsers
- Per-file is simple to understand and track
- Tiers incentivize volume (which validates more parsers)
- Undercuts DocuClipper ($29/mo for only 60 pages) significantly
- Enterprise tier opens the door to lending/fintech (bank statement analysis for loan underwriting is a massive market)

### Overage pricing
- $0.35/file beyond tier limit
- No hard cutoff — don't block a customer mid-workflow

---

## Who Buys This

### Primary targets (highest intent)

1. **Bookkeeping SaaS** (Bench, Pilot, Botkeeper, etc.) — They ingest hundreds of bank statements daily. Currently manual or using expensive enterprise tools.

2. **Accounting firms / CPAs** — Firms handling 50+ clients need to process statements monthly. Too much for manual, too small for enterprise contracts.

3. **Crypto tax apps** — Smaller crypto tax tools that don't want to build their own CSV parsers for every exchange. They'd rather call your API.

4. **Fintech lenders** — Need to analyze bank statements for loan underwriting. This is a huge market (Plaid adjacent) but requires more advanced parsing (cash flow analysis, income verification). Future expansion.

### Secondary targets

5. **Personal finance apps** — Import bank data for budgeting, spending analysis
6. **Audit firms** — Need structured data from bank statements for compliance
7. **ERP integrations** — Companies importing bank data into NetSuite, SAP, etc.

---

## Go-to-Market

### Phase 1: Developer playground (now → validated parsers)
- The consumer tool at taxformatter.com/upload IS the demo
- Every ad-driven upload validates parsers and proves the product works
- Add a "For Developers" or "API" link to the nav bar
- Create a simple API docs page showing the endpoint, request/response format

### Phase 2: Soft launch API (post-parser validation)
- Wrap engine.py in a REST API (you're already on Next.js, so an API route or separate FastAPI service)
- Offer Starter tier ($29/mo, 100 files/month) to get developers trying it
- List on RapidAPI marketplace for discovery
- Post on Hacker News "Show HN", Product Hunt, and r/accounting

### Phase 3: Developer marketing
- SEO content: "How to parse bank statements programmatically," "Bank statement parsing API comparison"
- API-specific Google Ads keywords (see below)
- Developer docs with SDKs (Python, Node.js at minimum)
- Integration guides: "How to import bank statements into QuickBooks via API"

### Phase 4: Enterprise & partnerships
- Reach out to bookkeeping SaaS companies directly
- Offer white-label option for larger partners
- Build cash flow analysis features on top of parsed data (loan underwriting use case)

---

## API-Specific Google Ads Keywords (for later)

Once the API is live, run a separate campaign targeting developers:

```
"bank statement parsing API"
"bank statement extraction API"
"bank statement OCR API"
"parse bank statement PDF"
"bank statement to JSON API"
"crypto CSV parsing API"
"coinbase CSV API"
"document parsing API"
"bank statement API developer"
"parse PDF bank statement programmatically"
"extract transactions from bank statement API"
```

Developer keywords tend to have lower CPC and very high intent — someone searching "bank statement parsing API" is literally looking to buy what you're building.

---

## Technical Considerations

### API endpoint design (simple v1)

```
POST /api/v1/parse
Content-Type: multipart/form-data

file: [bank statement PDF or exchange CSV]
output_format: "json" | "csv" | "excel" | "qbo" | "xero"

Response:
{
  "status": "success",
  "detected_source": "chase",
  "source_type": "bank_statement",
  "transactions": [...],
  "metadata": {
    "account_number_last4": "4829",
    "statement_period": "2025-01-01 to 2025-01-31",
    "transaction_count": 47
  }
}
```

### What you need before launching
- [ ] Rate limiting and API key management
- [ ] Usage tracking (files parsed per API key per month)
- [ ] Error handling that returns useful messages (unsupported bank, corrupt PDF, etc.)
- [ ] Webhook option for async processing of large files
- [ ] API documentation (Swagger/OpenAPI spec)
- [ ] At least 80%+ parser success rate across supported banks/exchanges (this is what the beta validates)

---

## Timeline

| When | Milestone |
|---|---|
| Now → April 15 | Run Google Ads, validate parsers with real uploads (crypto heavy for tax season) |
| April–May | Analyze parser success rates, fix edge cases in engine.py |
| May–June | Build API layer, docs, API key management, usage tracking |
| June | Soft launch: Starter tier, RapidAPI listing, Show HN |
| July–August | Paid tiers, developer marketing, API-specific Google Ads |
| September+ | Enterprise outreach, partnership conversations |
| January 2027 | Ramp crypto API marketing for next tax season |

---

## The Big Picture

Right now: taxformatter.com/upload is a consumer tool that validates parsers via Google Ads traffic.

Soon: the same engine.py becomes an API that developers pay for monthly. The consumer tool becomes the free demo that drives API signups.

Long term: TaxFormatter is the Stripe of document parsing — drop in our API, get clean financial data back. Bank statements are the beachhead, crypto is the seasonal accelerant, and the API is the year-round revenue engine.
