<div align="center">

# 📊 TaxFormatter

### _Crypto CSVs and bank statement PDFs, parsed into tax-ready data._

**REST API · MCP Server · Node SDK · Python SDK · Consumer Dashboard**

[![API](https://img.shields.io/badge/API-api.taxformatter.com-059669?style=flat-square)](https://api.taxformatter.com)
[![MCP](https://img.shields.io/badge/MCP-@taxformatter%2Fmcp--server-8B5CF6?style=flat-square)](https://www.npmjs.com/package/@taxformatter/mcp-server)
[![Node SDK](https://img.shields.io/badge/npm-@taxformatter%2Fsdk-CB3837?style=flat-square)](https://www.npmjs.com/package/@taxformatter/sdk)
[![License](https://img.shields.io/badge/License-Source--available-1a365d?style=flat-square)](LICENSE)

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
- `GET  /v1/sources` — list every supported exchange, bank, and output format, each with a `verified` / `beta` status
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

### 🏦 14 Exchanges · 6 Banks · 4 Export Formats

Every public supported-source claim is generated from two registries, and drift tests fail CI if any surface disagrees with them:

- **Exchanges** — [`backend/configs/exchanges.yaml`](backend/configs/exchanges.yaml), mirrored by [`lib/exchange-registry.ts`](lib/exchange-registry.ts)
- **Banks** — [`backend/configs/banks/*.yaml`](backend/configs/banks), mirrored by [`lib/bank-registry.ts`](lib/bank-registry.ts)

`GET /v1/sources` serves the same lists. Every entry carries a `status`: **verified** means a fixture-backed parse test runs on every change; **beta** means the parser exists but has no fixture yet. A new status is earned by a test, never by editing a registry.

**Exchanges (verified):** Binance · Coinbase · Kraken · KuCoin · Bybit · Cash App · Robinhood · PayPal · Crypto.com · Gemini · FTX · Bitfinex · OKX

**Exchanges (beta):** Venmo

**Banks (verified):** Chase · Mercury · Navy Federal

**Banks (beta):** Bank of America · Wells Fargo · Citi

**Export formats:** Koinly · TurboTax (Form 8949) · CoinLedger · ZenLedger

Per-exchange detail: [content/docs/getting-started/supported-exchanges.md](content/docs/getting-started/supported-exchanges.md).

### 🧠 Tiered AI Insights
Every parsed file comes back with analysis scaled to your plan. Plans expose an insights _level_; the level → model mapping lives in [`lib/insights-engine.ts`](lib/insights-engine.ts) and is published only in the [API docs](https://www.taxformatter.com/docs/api) and blog Updates posts.

| Level | Plans | Output |
|-------|-------|--------|
| Standard | Free / Starter | Quick stats + basic flagging |
| Advanced | Growth | Balanced analysis, breakdowns |
| Premium | Business | Deep analysis + tax suggestions |

The insights contract is strict. Model output is validated against a fixed schema, and a refusal, truncation, or unparseable response falls back to the deterministic quick stats with an `insights unavailable` warning rather than partial flags. Every result is stamped with the model, prompt version, and effort that produced it, and every model call logs tokens, cache-hit rate, latency, and cost.

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
| **Cron** | Vercel Cron (daily 30-day retention prune) |
| **IaC** | Terraform |

---

## 📁 Repo Layout

```
trw/
├── app/                 # Next.js App Router (marketing, dashboard, docs, blog)
│   ├── api/             # Internal API routes (NextAuth, uploads, jobs, dev keys, cron/prune)
│   ├── dashboard/       # Authenticated user area + /dashboard/developer
│   ├── docs/ · blog/    # MDX-powered docs site and blog (content in content/)
│   ├── playground/      # API playground
│   ├── samples/         # Sample outputs
│   └── upload/          # Anonymous bank statement → CSV landing page
│
├── backend/             # Python processing layer (AWS Lambda)
│   ├── handlers/        # scanner · processor · webhook · api
│   ├── services/
│   │   ├── engine.py            # CSV parsing (14 exchange parsers)
│   │   ├── format_converter.py  # Koinly → TurboTax/CoinLedger/ZenLedger
│   │   ├── fingerprinting.py    # Exchange auto-detection
│   │   ├── ai_insights.py       # Tiered AI analysis (schema-validated, refusal-safe)
│   │   ├── api_auth.py          # API key validation + rate limiting
│   │   └── bank_statement/      # PDF extraction pipeline
│   ├── configs/
│   │   ├── exchanges.yaml       # Exchange source registry (serves /v1/sources)
│   │   └── banks/*.yaml         # Bank source registry + parser configs
│   ├── tests/                   # pytest suite + parse fixtures
│   └── terraform/               # Infra as code
│
├── packages/
│   ├── mcp-server/      # @taxformatter/mcp-server (npm)
│   ├── sdk-node/        # @taxformatter/sdk (npm)
│   └── sdk-python/      # taxformatter (PyPI)
│
├── components/          # React components (marketing, dashboard, ui)
├── content/             # Docs (.md) and blog (.mdx) sources
├── lib/                 # Business logic (auth, api-keys, stripe, email)
│   ├── exchange-registry.ts # Mirrors backend/configs/exchanges.yaml
│   ├── bank-registry.ts     # Mirrors backend/configs/banks/*.yaml
│   ├── tier-registry.ts     # The one price list (plan, price, quota, RPM, insights level)
│   ├── insights-engine.ts   # The one model list (insights level → model)
│   └── retention.ts         # RETENTION_DAYS = 30
├── db/                  # PostgreSQL schema + migrations
├── __tests__/           # Jest suite, incl. copy and registry drift guards
└── docs/                # Setup guides, plans, build reports
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

const tf = new TaxFormatter(process.env.TF_API_KEY!);

// Parse a file by path, or pass a Buffer with a filename
const result = await tf.parse("./coinbase.csv");
const turbotax = await tf.parse(buffer, "coinbase.csv", { outputFormat: "turbotax" });
```

### Install the Python SDK

```bash
pip install taxformatter
```

```python
from taxformatter import TaxFormatter

tf = TaxFormatter("tf_live_...")
result = tf.parse("./coinbase.csv")
```

---

## 🧪 Testing

```bash
npm test              # Jest (700+ tests: API routes, MCP, keys, registries, UI)
npm run test:e2e      # Playwright end-to-end tests
npm run typecheck     # TypeScript strict mode
npm run lint          # ESLint
cd backend && pytest  # Python engine, parsers, insights, API Lambda (370+ tests)
```

Public copy is tested too. Drift guards under [`__tests__/`](__tests__) fail if any surface hard-codes a price, quota, or model name outside the registries, names an exchange or bank the registries don't list, or carries a superseded retention or marketing claim.

---

## 💳 Pricing

One plan, two ways to use it — drop a file in the dashboard or call our API. Same quota, same AI insights.

| Tier | Price | Quota | RPM | AI Insights | Highlights |
|------|-------|-------|-----|-------------|------------|
| Free | $0 | 25 files | 10 | Standard | All exchanges · No credit card |
| Starter | $29/mo | 100 files | 30 | Standard | All exchanges |
| Growth | $99/mo | 500 files | 60 | Advanced | + Bank PDF parsing |
| Business | $249/mo | 2,000 files | 120 | Premium | + Custom integrations |

Source of truth: `lib/tier-registry.ts` (prices, quotas, limits) and `lib/insights-engine.ts` (which model serves each insights level). Model names are published in the [API docs](https://www.taxformatter.com/docs/api) and blog Updates posts only.

---

## 🔒 Security Highlights

- **API payloads never stored** — request bodies are parsed in memory and never written to S3 or the database
- **Metadata-only request log** — `api_requests` stores key id, endpoint, status, bytes, timing, detected source, error code, and caller IP; never file contents
- **API keys SHA-256 hashed** at rest, prefixed `tf_live_` for easy identification
- **Uploads only** — TaxFormatter never asks for exchange API keys or bank logins
- **TLS 1.3** enforced everywhere
- **AES-256** encryption on all stored uploads
- **AWS WAF** in front of the API
- **30-day retention** — uploads, outputs, and parsed rows are deleted within 30 days (sooner from the dashboard); enforced by an S3 lifecycle rule and a daily prune cron

Full disclosure at [taxformatter.com/security](https://taxformatter.com/security).

---

## 📚 Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Full system design
- **[content/docs/api/index.md](content/docs/api/index.md)** — API reference
- **[content/docs/getting-started/supported-exchanges.md](content/docs/getting-started/supported-exchanges.md)** — per-exchange status, generated from the registry
- **[packages/mcp-server/README.md](packages/mcp-server/README.md)** — MCP setup guide
- **[RELIABILITY.md](RELIABILITY.md)** — SLOs, incident playbooks
- **[docs/PARKED_UNTIL_REVIEW.md](docs/PARKED_UNTIL_REVIEW.md)** — post-launch initiatives frozen until the Oct 28 review
- **[docs/](docs/)** — Stripe, Sentry, deployment guides, and build reports

---

## License

Source-available, not open source. Copyright (c) 2026 Quantum Transfer Group,
all rights reserved — you may read and audit this code, but not run, copy, or
build on it. Full terms in [LICENSE](LICENSE); the published npm and PyPI
client packages are licensed separately.

## Security

Found a vulnerability? Report it privately — see [SECURITY.md](SECURITY.md).
Please don't open a public issue.

## Contributing

Bug reports are welcome, especially parsing failures against real exchange or
bank exports. We don't accept outside pull requests — see
[CONTRIBUTING.md](CONTRIBUTING.md).
