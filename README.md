<div align="center">

# 📊 TaxFormatter

### _Crypto CSVs and bank statement PDFs, parsed into tax-ready data._

**REST API · MCP Server · Node SDK · Python SDK · Consumer Dashboard**

[![API](https://img.shields.io/badge/API-api.taxformatter.com-059669?style=flat-square)](https://api.taxformatter.com)
[![MCP](https://img.shields.io/badge/MCP-@taxformatter%2Fmcp--server-8B5CF6?style=flat-square)](https://www.npmjs.com/package/@taxformatter/mcp-server)
[![Node SDK](https://img.shields.io/badge/npm-@taxformatter%2Fsdk-CB3837?style=flat-square)](https://www.npmjs.com/package/@taxformatter/sdk)
[![License](https://img.shields.io/badge/License-Private-1a365d?style=flat-square)](#license)

</div>

---

## 🚀 What It Does

TaxFormatter turns messy financial exports into structured, tax-ready data — for humans _and_ for AI agents.

Drop a CSV from Coinbase, a ZIP from Kraken, a `.tar.gz` from Binance, or a PDF statement from Chase, and get back a clean, normalized transaction set you can pipe into Koinly, TurboTax, CoinLedger, ZenLedger — or straight into your own software.

```
   Exchange CSV                        Clean, normalized
   Bank PDF              →             transactions (JSON / CSV)
   XLSX / ZIP / TAR.GZ                 + AI-generated insights
```

---

## ✨ Features

### 🔌 Developer REST API
Ship a crypto-tax or bank-ingestion feature into your product in an afternoon.

- `POST /v1/parse` — upload a CSV or PDF, get structured JSON back
- `GET  /v1/sources` — list every supported exchange, bank, and output format
- `GET  /v1/usage` — monthly quota, RPM limit, current consumption
- `GET  /v1/health` — liveness probe
- **Auth:** `X-API-Key` header with `tf_live_*` keys (SHA-256 hashed at rest)
- **Host:** `https://api.taxformatter.com`

### 🤖 MCP Server for AI Agents
Give Claude, Cursor, Windsurf, or any MCP-compatible agent the ability to parse crypto and bank data directly.

```bash
npx @taxformatter/mcp-server
```

| Tool | What it does |
|------|---------------|
| `parse_crypto_csv` | Auto-detects the exchange, returns normalized transactions |
| `parse_bank_statement` | Extracts transactions from bank statement PDFs |
| `list_supported_sources` | Queries every supported source + output format |

### 📦 Official SDKs
- **Node.js** → [`@taxformatter/sdk`](packages/sdk-node) — promise-based, fully typed
- **Python** → [`taxformatter`](packages/sdk-python) — idiomatic, type-hinted

### 🏦 14 Exchanges · 7+ Banks · 4 Tax Software Formats

**Exchanges:** Coinbase · Kraken · Gemini · Binance · Robinhood · Crypto.com · PayPal · Cash App · Venmo · KuCoin · Bybit · FTX · Bitfinex · OKX

**Banks:** Chase · Mercury · Navy Federal · Bank of America · Wells Fargo · Citi · Capital One

**Export formats:** Koinly · TurboTax (Form 8949) · CoinLedger · ZenLedger

### 🧠 Tiered AI Insights
Every parsed file comes back with actionable analysis — scaled to your plan.

| Tier | Model | Output |
|------|-------|--------|
| Free | Gemini 1.5 Flash | Quick stats + basic flagging |
| Pro | Claude Sonnet 4 | Balanced analysis, breakdowns |
| Premium | Claude Opus 4 | Deep analysis + tax suggestions |

### 🖥️ Consumer Dashboard
Not a developer? The web app at [taxformatter.com](https://taxformatter.com) is a full drag-and-drop experience with real-time job status, exchange auto-detection, transformation previews, and one-click downloads.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16 · React 19 · TypeScript · Tailwind v4 |
| **Auth** | NextAuth (Google OAuth + email/password + 2FA) |
| **Database** | Neon (serverless PostgreSQL) |
| **Storage** | AWS S3 (presigned URLs) |
| **Queue** | AWS SQS + DLQ |
| **Compute** | AWS Lambda × 4 (scanner, processor, webhook, api) |
| **Edge** | AWS API Gateway + WAF + CloudFront |
| **Payments** | Stripe (consumer + developer tiers) |
| **Email** | AWS SES / Nodemailer |
| **Monitoring** | Sentry + CloudWatch |
| **IaC** | Terraform |

---

## 📁 Repo Layout

```
trw/
├── app/                 # Next.js App Router (marketing, dashboard, /v1 admin)
│   ├── api/             # Internal API routes (NextAuth, uploads, jobs, dev keys)
│   ├── dashboard/       # Authenticated user area + /dashboard/developer
│   ├── docs/            # MDX-powered docs site
│   └── upload/          # Anonymous bank statement → CSV landing page
│
├── backend/             # Python processing layer (AWS Lambda)
│   ├── handlers/        # scanner · processor · webhook · api
│   ├── services/
│   │   ├── engine.py            # CSV parsing (14 exchange parsers)
│   │   ├── format_converter.py  # Koinly → TurboTax/CoinLedger/ZenLedger
│   │   ├── fingerprinting.py    # Exchange auto-detection
│   │   ├── ai_insights.py       # Tiered AI analysis
│   │   ├── api_auth.py          # API key validation + rate limiting
│   │   └── bank_statement/      # PDF extraction pipeline
│   ├── configs/banks/*.yaml     # YAML-driven bank configs
│   └── terraform/               # Infra as code
│
├── packages/
│   ├── mcp-server/      # @taxformatter/mcp-server (npm)
│   ├── sdk-node/        # @taxformatter/sdk (npm)
│   └── sdk-python/      # taxformatter (PyPI)
│
├── components/          # React components (marketing, dashboard, ui)
├── lib/                 # Business logic (auth, api-keys, stripe, email)
├── db/                  # PostgreSQL schema + migrations
└── docs/                # Setup guides
```

Full architectural reference: **[ARCHITECTURE.md](ARCHITECTURE.md)**

---

## ⚡ Quick Start

### Run the web app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Try the API

```bash
curl -X POST https://api.taxformatter.com/v1/parse \
  -H "X-API-Key: tf_live_..." \
  -F "file=@coinbase.csv"
```

### Use the MCP server with Claude Code

```json
{
  "mcpServers": {
    "taxformatter": {
      "command": "npx",
      "args": ["@taxformatter/mcp-server"],
      "env": { "TAXFORMATTER_API_KEY": "tf_live_..." }
    }
  }
}
```

### Install the Node SDK

```bash
npm install @taxformatter/sdk
```

```ts
import { TaxFormatter } from "@taxformatter/sdk";

const tf = new TaxFormatter({ apiKey: process.env.TF_API_KEY! });
const result = await tf.parse({ file: fs.createReadStream("./coinbase.csv") });
```

---

## 🧪 Testing

```bash
npm test              # Jest unit tests (160+ across API, MCP, keys, UI)
npm run test:e2e      # Playwright end-to-end tests
npm run typecheck     # TypeScript strict mode
npm run lint          # ESLint
```

---

## 💳 Pricing

### Consumer (dashboard)
| Tier | Price | Highlights |
|------|-------|------------|
| Free | $0 | 3 downloads/month · Gemini insights |
| Pro | $89/year | Unlimited · Claude Sonnet insights |
| Premium | $189/year | Everything + Claude Opus + priority support |

### Developer (API)
| Tier | Price | Quota | RPM |
|------|-------|-------|-----|
| Starter | $29/mo | 100 files | 30 |
| Growth | $99/mo | 500 files | 60 |
| Business | $249/mo | 2,000 files | 120 |

---

## 🔒 Security Highlights

- **Stateless API processing** — file content lives in Lambda RAM only, never written to disk
- **Zero payload logging** — `api_requests` stores metadata only (hash, status, bytes, timing)
- **API keys SHA-256 hashed** at rest, prefixed `tf_live_` for easy identification
- **TLS 1.3** enforced everywhere
- **AES-256** encryption on all stored uploads
- **AWS WAF** — DDoS shield, SQL injection, XSS mitigation
- **User-controlled retention** — 1 year default, or delete-after-download

Full disclosure at [taxformatter.com/security](https://taxformatter.com/security).

---

## 📚 Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Full system design
- **[content/docs/api/index.md](content/docs/api/index.md)** — API reference
- **[packages/mcp-server/README.md](packages/mcp-server/README.md)** — MCP setup guide
- **[RELIABILITY.md](RELIABILITY.md)** — SLOs, incident playbooks
- **[docs/](docs/)** — Stripe, Sentry, and deployment guides

---

## License

Private — Quantum Transfer Group. All rights reserved.
