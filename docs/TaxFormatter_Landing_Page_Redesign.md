# TaxFormatter Landing Page Redesign — API & Agent Client First

**Date:** 2026-03-18
**Status:** Complete — builds successfully

---

## Why

The original landing page positioned TaxFormatter as a consumer CSV repair tool ("Fix Your Broken Exchange CSVs in Seconds"). With the developer REST API and MCP server now shipped, the site needs to lead with the API story to attract the higher-value B2B audience — developers, fintech apps, and AI agent builders.

---

## What Changed

### New Page Flow

```
Before (Consumer-first):
Hero → HowItWorks → SocialProof → Integrations → BankFeature → TrustEngine → Pricing → FAQ → Footer

After (API-first):
APIHero → APIDemo → AgentSection → APICapabilities → APIPricing → TrustEngine → FAQ → Footer
```

### New Components Created

| Component | File | Description |
|-----------|------|-------------|
| **APIHero** | `components/marketing/APIHero.tsx` | Split layout: headline + stats on left, animated terminal on right showing a live `POST /v1/parse` request with typed code lines and streaming JSON response |
| **APIDemo** | `components/marketing/APIDemo.tsx` | Tabbed code examples in Python, Node.js, and cURL with syntax highlighting and copy-to-clipboard. Feature chips below (auto-detect, base64 in/JSON out, 4 formats, etc.) |
| **AgentSection** | `components/marketing/AgentSection.tsx` | MCP server setup: shows `claude_desktop_config.json` config, a natural language prompt example, and 3 tool cards (`parse_crypto_csv`, `parse_bank_statement`, `list_supported_sources`) with npm link |
| **APICapabilities** | `components/marketing/APICapabilities.tsx` | Grid of all 14 supported exchanges, 7+ banks, 4 output formats. Six feature cards: auto-detection, PDF parsing, structured errors, ephemeral processing, sub-2s response, enterprise ready |
| **APIPricing** | `components/marketing/APIPricing.tsx` | Three API tiers — Starter ($29/mo, 100 files/mo), Growth ($99/mo, 500 files/mo, highlighted), Business ($249/mo, 2,000 files/mo). Includes "Not a developer?" callout linking to the consumer dashboard |

### Files Modified

| File | Change |
|------|--------|
| `app/page.tsx` | Replaced all consumer sections with API-focused component composition |
| `components/marketing/Header.tsx` | Nav links updated: Features → API, Security → Exchanges. Links to `/docs/api` and `/#capabilities` |
| `tsconfig.json` | Added `packages` to exclude array (prevents MCP server ESM deps from breaking the Next.js build) |
| `packages/mcp-server/src/client.ts` | Fixed index signature property access for strict TypeScript (`body.exchange` → `body['exchange']`) |

### Sections Kept (Unchanged)

| Component | Reason |
|-----------|--------|
| `TrustEngine` | Security messaging applies equally to API consumers — ephemeral processing, encryption, zero access |
| `FAQ` | Questions still relevant; can be updated later with API-specific entries |
| `Footer` | Newsletter, links, legal — all still applicable |
| `HeaderWithSession` | Session-aware wrapper still needed for auth state |

### Sections Removed from Landing Page

| Component | Status |
|-----------|--------|
| `Hero` | Replaced by `APIHero` — still exists in codebase for potential consumer sub-page |
| `HowItWorks` | Consumer upload demo — no longer the primary story |
| `SocialProof` | CSV error analysis cards — consumer-focused |
| `Integrations` | Exchange marquee — replaced by `APICapabilities` grid |
| `BankFeature` | Bank PDF converter promo — now a feature bullet in API sections |
| `Pricing` | Consumer tiers ($0/$89/$189) — replaced by `APIPricing` API tiers |

> **Note:** No components were deleted. The consumer-focused components remain in `components/marketing/` and can be composed into a separate consumer landing page (e.g., `/consumer` or `/upload`) if needed.

---

## Design Decisions

### Aesthetic
- **Dark-dominant** (`#030712` / `#020617`) — developer-centric, matches API docs aesthetic
- **Dot grid background** instead of line grid — subtler, more modern
- **Gradient orbs** — indigo, emerald, sky — create depth without distraction
- **Monospace code blocks** — terminal chrome with traffic lights, POST badges, response timing

### Hero Strategy
- **Split layout** (copy left, terminal right) instead of centered — gives more room for the code demo
- **Animated terminal** — code lines appear sequentially, then response streams in — demonstrates the API in action without requiring interaction
- **Stats row** (14 Exchanges, <2s Latency, MCP Agent Ready) — builds credibility immediately

### Consumer Positioning
- Consumer tool is **not hidden** — it's called out in the pricing section footer
- "Not a developer? Upload CSVs directly at taxformatter.com/dashboard — no code required."
- This preserves the consumer funnel while making the API the primary narrative

---

## Verification

- `npx next build` — compiles successfully with zero errors
- Dev server renders all sections correctly
- All existing tests still pass (160 new API tests + 62 existing)
