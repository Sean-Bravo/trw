# MCP Server Directory Submissions

Tracking sheet for `@taxformatter/mcp-server` across MCP directories and registries.

**Package:** [`@taxformatter/mcp-server`](https://www.npmjs.com/package/@taxformatter/mcp-server)
**Source:** [`packages/mcp-server`](../packages/mcp-server) in this repo
**Manifests:** [`mcp-manifest.json`](../packages/mcp-server/mcp-manifest.json) · [`smithery.yaml`](../smithery.yaml) · [`glama.json`](../glama.json) · [`server.json`](../server.json)

---

## Status overview

| # | Directory | Status | Submitted | Listed at | Notes |
|---|---|---|---|---|---|
| 1 | **Smithery** | ✅ Live | — | _add URL_ | Submitted via GitHub connection. |
| 2 | **Glama** | ⏳ Pending review | 2026-05-04 | _add URL_ | Re-submitted after repo went public. |
| 3 | **Official MCP Registry** | ❓ Verify | — | _add URL_ | Listed per planning notes — needs URL confirmation. |
| 4 | **mcp.run** | ❓ Verify | — | _add URL_ | Listed per planning notes — needs URL confirmation. |
| 5 | **PulseMCP** | ⏳ Pending propagation | — | _add URL_ | Auto-ingests from Official MCP Registry weekly. Verified not yet listed on 2026-05-04. Will appear within ~7 days of #3 going live. |
| 6 | **mcp.so** | ❓ Verify | — | _add URL_ | Submitted per planning notes — needs URL confirmation. |
| 7 | **awesome-mcp-servers** | ⬜ Not started | — | — | GitHub PR to `punkpeye/awesome-mcp-servers`, Finance & Fintech section. |

Legend: ✅ live · ⏳ submitted, awaiting review · ❓ status unverified, needs check · 🔄 auto-mirrored from another source · ⬜ not started · ❌ rejected

---

## Submission details

### 1. Smithery
- **URL:** https://smithery.ai
- **Submission method:** GitHub connection (auto-reads `smithery.yaml` from repo root)
- **Manifest:** [`smithery.yaml`](../smithery.yaml)
- **Status:** Live

### 2. Glama
- **URL:** https://glama.ai/mcp/servers
- **Submission method:** GitHub URL submission via web form
- **Manifest:** [`glama.json`](../glama.json) (auto-pulled)
- **Submitted:** 2026-05-04 (re-submission; previously blocked because repo was private)
- **Notes:** Description corrected to 25 files/month free tier (was 10 in original `glama.json`).

### 3. Official MCP Registry
- **URL:** https://registry.modelcontextprotocol.io (or wherever the official registry lives)
- **Submission method:** Likely PR-based (TBD)
- **Manifest:** [`server.json`](../server.json) at repo root (added during initial registry submission)
- **Status:** Listed per planning notes — verify on next session.

### 4. mcp.run
- **URL:** https://www.mcp.run
- **Submission method:** Reads `mcp-manifest.json`
- **Manifest:** [`packages/mcp-server/mcp-manifest.json`](../packages/mcp-server/mcp-manifest.json)
- **Status:** Listed per planning notes — verify URL.

### 5. PulseMCP
- **URL:** https://www.pulsemcp.com
- **Submission method:** Auto-ingests from the Official MCP Registry daily, processes weekly. No manual submission required — but the Official Registry listing (#3) must be live and propagated first.
- **Status:** Verified not yet listed on 2026-05-04. Pending propagation from #3.
- **If a listing edit is ever needed after going live:** email the PulseMCP team rather than re-submitting.

### 6. mcp.so
- **URL:** https://mcp.so
- **Submission method:** Web form submission
- **Status:** Submitted per planning notes — verify URL.

### 7. awesome-mcp-servers (GitHub)
- **URL:** https://github.com/punkpeye/awesome-mcp-servers
- **Submission method:** Fork → add entry to Finance & Fintech section → PR
- **Status:** Not started.
- **Recommended entry:**
  ```markdown
  - [@taxformatter/mcp-server](https://github.com/Sean-Bravo/trw) 📇 ☁️ 🏠 - Parse crypto exchange CSVs (Coinbase, Binance, Kraken, +11 more) and bank statement PDFs (Chase, BofA, Wells Fargo, +10 more) into Koinly, TurboTax, CoinLedger, or ZenLedger formats. Free tier: 25 files/month, no credit card. `npx -y @taxformatter/mcp-server`
  ```
- **Symbols:** 📇 (TypeScript) · ☁️ (cloud — calls hosted API) · 🏠 (local — runs via stdio)

---

## Reusable submission copy

Paste these into directory forms verbatim. All numbers (25 files/month, 14 exchanges, 13 banks) are accurate as of 2026-05-04.

### Short description (≤100 chars)
```
Parse crypto exchange CSVs and bank statement PDFs into tax-software-ready transactions.
```

### Medium description (≤200 chars)
```
MCP server that parses crypto CSVs (Coinbase, Binance, Kraken, +11 more) and bank statement PDFs (Chase, BofA, +11 more) into Koinly / TurboTax / CoinLedger / ZenLedger formats.
```

### Long description (full pitch)
```
TaxFormatter MCP Server lets AI agents parse crypto exchange CSVs and bank statement PDFs into structured transaction data ready for Koinly, TurboTax, CoinLedger, or ZenLedger.

Supports 14 crypto exchanges (Coinbase, Binance, Kraken, Robinhood, Gemini, Bitstamp, Bittrex, Crypto.com, KuCoin, OKX, Bybit, MEXC, Phemex, Uphold) and 13 banks (Chase, BofA, Wells Fargo, Capital One, Citi, US Bank, PNC, TD, Truist, Mercury, Navy Federal, Schwab, Fidelity).

Three tools: parse_crypto_csv, parse_bank_statement, list_supported_sources.

Free tier: 25 files/month, no credit card required.
```

### Install command
```
npx -y @taxformatter/mcp-server
```

### Required env vars
| Variable | Required | Default | Purpose |
|---|---|---|---|
| `TAXFORMATTER_API_KEY` | Yes | — | Get one at https://taxformatter.com/dashboard/developer |
| `TAXFORMATTER_API_URL` | No | `https://api.taxformatter.com` | Override for local/staging testing |

### Links
- **GitHub:** https://github.com/Sean-Bravo/trw
- **Package directory:** https://github.com/Sean-Bravo/trw/tree/main/packages/mcp-server
- **npm:** https://www.npmjs.com/package/@taxformatter/mcp-server
- **Homepage:** https://taxformatter.com
- **Docs:** https://taxformatter.com/docs/api
- **Issues:** https://github.com/Sean-Bravo/trw/issues
- **License:** MIT

### Categories / tags
```
tax, crypto, finance, csv, pdf, banking, accounting, koinly, turbotax, coinledger, coinbase, binance, kraken
```

---

## Maintenance notes

- **When the package is republished:** bump the `version` field in [`mcp-manifest.json`](../packages/mcp-server/mcp-manifest.json) to match `package.json`. Some directories surface stale versions otherwise.
- **When a directory listing goes live:** fill in the URL in the status table above and mark ✅. Update the announce blog post (Workstream 3 punch list) once 3+ are live.
- **Free-tier copy lives in three places:** `mcp-manifest.json`, `smithery.yaml`, and `content/docs/api/index.md`. Update all three together if quotas change.
