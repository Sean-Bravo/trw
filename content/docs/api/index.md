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
  -d '{ "file_content": "<base64>", "filename": "coinbase.csv" }'
```

Get your API key at [taxformatter.com/dashboard/developer](/dashboard/developer).

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
| `rate_limited` | 429 | Exceeded requests per minute limit |
| `invalid_file_type` | 400 | Not a PDF, CSV, or XLSX |
| `file_too_large` | 400 | Exceeds 10MB limit |
| `file_empty` | 400 | Empty file |
| `unsupported_exchange` | 422 | CSV doesn't match any known exchange |
| `unsupported_bank` | 422 | PDF doesn't match any known bank |
| `parse_error` | 422 | Recognized format but parsing failed |
| `internal_error` | 500 | Server error (retry with backoff) |

## Rate Limits

| Tier | Files/month | Requests/minute | Price |
|------|-------------|-----------------|-------|
| Free | 10 | 10 | $0 |
| Starter | 100 | 30 | $29/mo |
| Growth | 500 | 60 | $99/mo |
| Business | 2,000 | 120 | $249/mo |

Overage is flagged via `X-Api-Overage: true` response header — requests are never hard-blocked.

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

Then ask: "Parse the bank statement at ~/Downloads/chase_jan.pdf"
