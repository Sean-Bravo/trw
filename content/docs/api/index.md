---
title: Developer API
description: Parse crypto CSVs and bank statement PDFs programmatically with the TaxFormatter API
order: 6
---

The TaxFormatter API lets you parse crypto exchange CSVs and bank statement PDFs programmatically. Send a file, get structured transaction data back.

## Base URL

```
https://api.taxformatter.com/v1
```

## Authentication

All requests (except `/v1/health` and `/v1/sources`) require an API key via the `X-API-Key` header:

```bash
curl -X POST https://api.taxformatter.com/v1/parse \
  -H "X-API-Key: tf_live_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{ "file_content": "'$(base64 -i coinbase_2024.csv)'", "filename": "coinbase_2024.csv" }'
```

Get your API key at [taxformatter.com/dashboard/developer](/dashboard/developer). Every account gets a Free key (25 parses/month) on signup — no credit card required.

## Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/v1/parse` | Yes | Parse a crypto CSV or bank PDF |
| GET | `/v1/sources` | No | List supported exchanges and banks |
| GET | `/v1/usage` | Yes | Get usage stats for your key |
| GET | `/v1/health` | No | Health check |

## Parse a File

**POST `/v1/parse`**

Send a base64-encoded file and get structured transaction data back. The API auto-detects whether it's a crypto CSV or bank PDF based on the filename extension.

### Request

```json
{
  "file_content": "<base64-encoded file>",
  "filename": "coinbase_2024.csv",
  "exchange": "coinbase",
  "output_format": "koinly"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `file_content` | Yes | Base64-encoded file content |
| `filename` | Yes | Filename with extension (.csv, .xlsx, or .pdf) |
| `exchange` | No | Exchange name (auto-detected if omitted) |
| `bank` | No | Bank name for PDFs (auto-detected if omitted) |
| `output_format` | No | `koinly`, `turbotax`, `coinledger`, or `zenledger` (default: `koinly`) |

### Success Response

```json
{
  "status": "success",
  "summary": "Parsed 147 Coinbase transactions (Jan–Dec 2024).",
  "detected_source": "coinbase",
  "source_type": "crypto_exchange",
  "output_format": "koinly",
  "transactions": [...],
  "warnings": [],
  "metadata": {
    "transaction_count": 147,
    "processing_time_ms": 1234,
    "api_version": "2026-03-01"
  }
}
```

### Code Examples

**Python**

```python
import requests
import base64

with open("coinbase_2024.csv", "rb") as f:
    encoded = base64.b64encode(f.read()).decode()

response = requests.post(
    "https://api.taxformatter.com/v1/parse",
    headers={"X-API-Key": "tf_live_your_key_here"},
    json={"file_content": encoded, "filename": "coinbase_2024.csv"}
)

data = response.json()
print(f"{data['metadata']['transaction_count']} transactions parsed")
print(f"Processing time: {response.headers['X-TF-Processing-Time']}ms")
```

**Node.js**

```javascript
import { readFileSync } from "fs";

const file = readFileSync("coinbase_2024.csv");
const res = await fetch("https://api.taxformatter.com/v1/parse", {
  method: "POST",
  headers: {
    "X-API-Key": "tf_live_your_key_here",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    file_content: file.toString("base64"),
    filename: "coinbase_2024.csv",
  }),
});

const data = await res.json();
console.log(`${data.metadata.transaction_count} transactions parsed`);
```

### Error Response

```json
{
  "status": "error",
  "code": "unsupported_exchange",
  "message": "Could not detect exchange format.",
  "suggestion": "Specify the 'exchange' parameter, or check /v1/sources."
}
```

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `invalid_api_key` | 401 | Key missing, malformed, or revoked |
| `feature_not_available` | 403 | Endpoint requires a higher tier (e.g., bank PDF on Free) |
| `rate_limited` | 429 | Exceeded requests per minute limit |
| `quota_exceeded` | 429 | Free tier monthly file limit reached. Resets on the 1st |
| `invalid_file_type` | 400 | Not a PDF, CSV, or XLSX |
| `file_too_large` | 400 | Exceeds 10MB limit |
| `file_empty` | 400 | Empty file |
| `unsupported_exchange` | 422 | CSV doesn't match any known exchange |
| `unsupported_bank` | 422 | PDF doesn't match any known bank |
| `parse_error` | 422 | Recognized format but parsing failed |
| `internal_error` | 500 | Server error (retry with backoff) |

`quota_exceeded` and `feature_not_available` responses include an `upgrade_url` field pointing at the pricing page. The 429 quota response also sets `Retry-After` (seconds until reset) and `X-Quota-Reset` (ISO-8601 timestamp of the next reset) headers.

## Rate Limits and Quotas

> **Free tier** — Every account gets a free API key with 25 files/month and 10 requests/minute on signup. No credit card required. [Get your API key here](/dashboard/developer).

| Tier | Files/month | Requests/minute | Bank PDF | Price |
|------|-------------|-----------------|----------|-------|
| Free | 25 | 10 | — | $0 |
| Starter | 100 | 30 | — | $29/mo |
| Growth | 500 | 60 | ✓ | $99/mo |
| Business | 2,000 | 120 | ✓ | $249/mo |

**Quota enforcement:**

- **Free tier is hard-blocked at 25 files/month.** The 26th request returns `429 quota_exceeded` with `Retry-After` and `X-Quota-Reset` headers and an `upgrade_url`. Resets at 00:00 UTC on the 1st.
- **Paid tiers (Starter, Growth, Business) are not hard-blocked.** Overage is flagged via the `X-Api-Overage: true` response header along with `X-Api-Usage` and `X-Api-Quota` so you can monitor and upgrade proactively.

**Feature gates:**

- **Bank PDF parsing requires Growth tier or higher.** Calling `/v1/parse` with a `.pdf` filename on a Free or Starter key returns `403 feature_not_available` with an `upgrade_url`.

## MCP Server (AI Agents)

For Claude Code, Cursor, and other MCP-compatible tools:

```bash
npm install -g @taxformatter/mcp-server
```

Add to `~/.claude/mcp.json`:

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

Then ask your agent:

- "Parse the bank statement at ~/Downloads/chase_jan.pdf"
- "Parse my Coinbase export and format it for Koinly"
- "I have a Kraken CSV from 2024, normalize it for TurboTax"
- "List all supported exchanges and output formats"
