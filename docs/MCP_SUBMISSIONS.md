# MCP Server Directory Submissions

Tracking sheet for `@taxformatter/mcp-server` across MCP directories and registries.

**Package:** [`@taxformatter/mcp-server`](https://www.npmjs.com/package/@taxformatter/mcp-server)
**Source:** [`packages/mcp-server`](../packages/mcp-server) in this repo
**Manifests:** [`mcp-manifest.json`](../packages/mcp-server/mcp-manifest.json) · [`smithery.yaml`](../smithery.yaml) · [`glama.json`](../glama.json) · [`server.json`](../server.json)

---

## Status overview

| # | Directory | Status | Submitted | Listed at | Notes |
|---|---|---|---|---|---|
| 1 | **Smithery** | ✅ Live | — | https://smithery.ai/server/sean-bavo/taxformatter | Submitted via GitHub connection. Namespace typo: `sean-bavo` not `sean-bravo` (autofill at signup). 61/100 health score, all 3 tools detected, hosted endpoint at `https://taxformatter--sean-bavo.run.tools`. |
| 2 | **Glama** | ⏳ Pending review | 2026-05-04 | _add URL_ | Re-submitted after repo went public. |
| 3 | **Official MCP Registry** | ✅ Live | 2026-05-04 | [API query](https://registry.modelcontextprotocol.io/v0/servers?search=taxformatter) | Published `0.1.2`. Registry is API-first — no public-facing detail page. |
| 4 | **mcp.run** | ⏭️ Skipped | — | — | Rebranded to TurboMCP — now an enterprise gateway product, not a public directory. Don't submit. |
| 5 | **PulseMCP** | ⏳ Pending propagation | — | _add URL_ | Auto-ingests from Official MCP Registry weekly. Will appear within ~7 days of 2026-05-04 (Official Registry live date). |
| 6 | **mcp.so** | ⏳ Pending review | 2026-05-04 | _add URL_ | Submitted via web form (signed in via GitHub). |
| 7 | **awesome-mcp-servers** | ⬜ Not started | — | — | GitHub PR to `punkpeye/awesome-mcp-servers`, Finance & Fintech section. |

Legend: ✅ live · ⏳ submitted, awaiting review · ⏭️ skipped (deprecated/rebranded) · ⬜ not started · ❌ rejected

---

## Submission details

### 1. Smithery
- **Listing URL:** https://smithery.ai/server/sean-bavo/taxformatter
- **Hosted endpoint:** `https://taxformatter--sean-bavo.run.tools` — Smithery serves the MCP server as a hosted endpoint, usable by clients that can't run `npx`.
- **Submission method:** GitHub connection (auto-reads `smithery.yaml` from repo root)
- **Manifest:** [`smithery.yaml`](../smithery.yaml)
- **Health score:** 61/100 (fresh listing — should improve with usage signals).
- **Status:** Live. All 3 tools detected (`parse_crypto_csv`, `parse_bank_statement`, `list_supported_sources`); connection prompt + CLI integration auto-generated.
- **Namespace typo:** the slug is `sean-bavo` not `sean-bravo` — autofill mistake at signup. Renaming the namespace via Settings would break any external links and is not worth chasing for the typo.

### 2. Glama
- **URL:** https://glama.ai/mcp/servers
- **Submission method:** GitHub URL submission via web form
- **Manifest:** [`glama.json`](../glama.json) (auto-pulled)
- **Submitted:** 2026-05-04 (re-submission; previously blocked because repo was private)
- **Notes:** Description corrected to 25 files/month free tier (was 10 in original `glama.json`).

### 3. Official MCP Registry
- **URL:** https://registry.modelcontextprotocol.io
- **Submission method:** Publish via the registry CLI/API using [`server.json`](../server.json) at the repo root. Validates against `https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json`.
- **Manifest:** [`server.json`](../server.json)
- **Listing query:** `curl https://registry.modelcontextprotocol.io/v0/servers?search=taxformatter`
- **Status:** ✅ Live as of 2026-05-04, version `0.1.2`. Registry is API-first — no public-facing detail page yet, consumed by Smithery / PulseMCP / etc.

### 4. mcp.run
- **Status:** ⏭️ Skipped. mcp.run rebranded to **TurboMCP** — now an enterprise gateway product, not a public directory. Removed from the active submission list.

### 5. PulseMCP
- **URL:** https://www.pulsemcp.com
- **Submission method:** Auto-ingests from the Official MCP Registry daily, processes weekly. No manual submission required — but the Official Registry listing (#3) must be live first (now satisfied as of 2026-05-04).
- **Status:** ⏳ Pending propagation. Verified not yet listed on 2026-05-04; expected within ~7 days.
- **If a listing edit is ever needed after going live:** email the PulseMCP team rather than re-submitting.

### 6. mcp.so
- **URL:** https://mcp.so
- **Submission method:** Web form submission, signed in via GitHub
- **Status:** ⏳ Submitted 2026-05-04, awaiting review.

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

- **When the package is republished:** bump the `version` field in **all four** version-carrying manifests so directory listings stay aligned:
  - [`packages/mcp-server/package.json`](../packages/mcp-server/package.json)
  - [`packages/mcp-server/mcp-manifest.json`](../packages/mcp-server/mcp-manifest.json)
  - [`server.json`](../server.json) (Official Registry — both top-level `version` AND `packages[0].version`)
  - [`glama.json`](../glama.json) (no `version` field today, but if added, keep aligned)
  - `smithery.yaml` carries no version field; nothing to bump there.

  Some directories surface stale versions if any of these drift.

- **When a directory listing goes live:** fill in the URL in the status table above and mark ✅. Update the announce blog post (Workstream 3 punch list) once 3+ are live.
- **Free-tier copy lives in three places:** `mcp-manifest.json`, `smithery.yaml`, and `content/docs/api/index.md`. Update all three together if quotas change.
