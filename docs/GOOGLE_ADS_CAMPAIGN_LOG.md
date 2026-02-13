# TaxFormatter Google Ads Campaign Log

## Campaign 1: "Campaign #1" (Performance Max) — PAUSED

**Dates:** Feb 10–12, 2026
**Type:** Performance Max (wrong campaign type)
**Budget:** $15/day
**Total Spend:** ~$9.58
**Status:** Paused on Feb 12, 2026

### What Happened

Campaign 1 was created as a Performance Max campaign instead of a Search campaign. This was the root cause of nearly every issue encountered in the first 3 days.

### Problems

1. **Wrong campaign type.** PMax distributes budget across Search, Display, YouTube, Gmail, and Discover. We needed pure Search only — people typing error queries into Google.
2. **96% mobile traffic.** PMax optimized for the cheapest inventory, which was mobile display/app placements. Users on phones don't have CSV files to upload.
3. **56 interactions but only 14 clicks.** The 42 non-click interactions were likely "call" taps or "get directions" — completely useless for an online CSV upload tool.
4. **Google AI auto-generated assets.** PMax created YouTube videos, AI headlines ("Try TaxFormatter now"), and image ads we never approved. Budget was spent serving these across the Display network.
5. **Landing page was 404.** The /upload route wasn't deployed due to Vercel being stuck 9 commits behind origin/main. Fixed with an empty commit push (`ce38494`).
6. **Anonymous uploads returned 401.** The API route changes to allow no-auth uploads were edited locally but never committed. Every ad click that reached the page hit a broken upload flow. Fixed in commit `98866ec`.
7. **Conversion tracking never verified.** The purchase conversion label was generic (`/purchase`) instead of the real label from Google Ads. Fixed in commit `913a0d2`.

### Metrics (Final)

| Metric | Value |
|---|---|
| Impressions | 489 |
| Interactions | 56 |
| Clicks (website) | 14 |
| CTR | 3.06% |
| Avg CPC | ~$0.27 |
| Conversions | 0 |
| CSV Uploads | 0 |
| Total Spend | ~$9.58 |

### Lessons

- Always select "Search" campaign type for intent-based lead generation
- PMax is designed for e-commerce/broad reach — wrong fit for niche error-keyword targeting
- Smart Mode defaults new accounts into PMax — switch to Expert Mode immediately
- Smoke-test the deployed URL with `curl` before spending money
- Run `git status` after multi-file changes to catch uncommitted edits

---

## Campaign 2: "taxformatter_1" (Search) — ACTIVE

**Launch Date:** Feb 12, 2026
**Type:** Search
**Budget:** $15/day
**Status:** Active (pending ad review)
**Optimization Score:** 95.3%

### Setup

**Objective:** Website traffic
**Bidding:** Maximize Clicks (no conversion tracking verified yet)
**Max CPC Cap:** $3.00
**Daily Budget:** $15

**Networks:**
- Google Search
- Search Partners: OFF
- Display Network: OFF

**Geographic Targeting:** United States only
**Language:** English
**Final URL:** https://www.taxformatter.com/upload
**Display Path:** taxformatter.com/fix-csv/crypto

### Keywords (30 total)

**Exact Match (22):**

- [coinbase csv import error]
- [turbotax crypto csv not working]
- [koinly csv error]
- [crypto csv validation failed]
- [turbotax we could not import this]
- [binance csv turbotax]
- [crypto.com csv turbotax error]
- [csv import failed cryptocurrency]
- [fix crypto csv file]
- [crypto csv format error]
- [turbotax cryptocurrency upload problem]
- [crypto tax csv not accepted]
- [binance export turbotax]
- [coinbase tax csv format]
- [koinly import error]
- [coinledger csv not working]
- [kraken csv turbotax]
- [kucoin csv export format]
- [bybit csv tax]
- [gemini csv turbotax]
- [crypto.com app csv export]
- [robinhood crypto csv format]

**Phrase Match (8):**

- "coinbase csv import error"
- "turbotax crypto csv"
- "crypto csv error"
- "binance csv format"
- "fix crypto csv"
- "crypto tax csv"
- "cryptocurrency csv import"
- "exchange csv turbotax"

### Negative Keywords (48)

Applied at campaign level. Full list in google-ads-negative-keywords.csv. Key categories:
- Generic CSV tools (viewer, editor, template, pdf converter)
- Crypto noise (price, news, trading, wallet, mining, NFT, DeFi)
- Non-intent (free tax software, tax refund, tax return)

### Ad Copy

**Headlines (15/15):**

1. TaxFormatter
2. No manual editing required
3. Fix Your Broken Crypto CSV
4. Fix Crypto CSV Errors Fast
5. TurboTax Rejecting Your CSV?
6. Broken Coinbase Export? Fixed
7. CSV Import Failed? Upload Here
8. Free Beta: Fix Crypto CSVs
9. Stop Editing CSVs Manually
10. We Clean Messy Crypto CSVs
11. TurboTax-Ready in 30 Seconds
12. Upload Failed CSV Get Fixed
13. Crypto Tax CSV Repair Tool
14. Works With All Exchanges
15. Free During Beta Period

**Descriptions (4/4):**

1. Get a clean, tax-software-ready file in seconds
2. Free during beta
3. Upload your broken exchange CSV. Get a clean, tax-software-ready file in seconds
4. Fixes messy exports for TurboTax, Koinly, CoinLedger & ZenLedger. No manual editing.

**Callouts:**
- Free During Beta
- 11 Exchanges Supported
- No Signup Required
- 30-Second Fix

**Sitelinks:**
- Security Center → /security
- View Docs → /docs

### Estimated Performance (Google projections at $15/day)

| Metric | Estimate |
|---|---|
| Weekly Clicks | 483 |
| Avg CPC | $0.22 |
| Weekly Cost | $105 |

### What's Different from Campaign 1

| Setting | Campaign 1 (PMax) | Campaign 2 (Search) |
|---|---|---|
| Type | Performance Max | Search |
| Networks | Search + Display + YouTube + Gmail | Google Search only |
| Keywords | Google AI selected | 30 manually curated |
| Match types | Broad (AI controlled) | Exact + Phrase |
| Ad format | Asset groups (images, video, text) | Responsive Search Ad |
| Device control | None (Google optimized) | Manual adjustment available |
| Bidding | Maximize Conversions | Maximize Clicks ($3 cap) |
| AI content | Auto-generated videos + headlines | None — all manual |

### Pending Items

- [x] Install Google Ads gtag.js on /upload (already in root layout via `GoogleAds.tsx`)
- [x] Fix purchase conversion label (`913a0d2`)
- [ ] Add negative keywords from CSV (if not already applied)
- [ ] Set device bid adjustments: Desktop +50%, Mobile -50%
- [ ] Monitor Search Terms report after first 48 hours
- [ ] Check S3 for new uploads from ad traffic
- [ ] Add 2 more sitelinks (Google recommends 4 minimum)
- [ ] Consider adding Tier D keywords (specific error messages) after initial data

---

## Timeline

| Date | Event |
|---|---|
| Feb 10 | Campaign 1 launched (PMax, Smart Mode) |
| Feb 10 | /upload page returning 404 (Vercel stale) |
| Feb 11 | Day 2 data: $3.79 spent, 14 clicks, 96% mobile, 0 uploads |
| Feb 12 | Discovered PMax was wrong campaign type |
| Feb 12 | Fixed Vercel deploy — empty commit (`ce38494`) |
| Feb 12 | Fixed anonymous upload 401 (`98866ec`) |
| Feb 12 | Fixed purchase conversion label (`913a0d2`) |
| Feb 12 | Paused Campaign 1 |
| Feb 12 | Switched to Expert Mode |
| Feb 12 | Created Campaign 2 (Search, proper setup) |
| Feb 12 | Campaign 2 live, pending ad review |
