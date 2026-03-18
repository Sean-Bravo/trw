# TaxFormatter.com — Google Ads Campaign Restructure Plan

**Date:** March 17, 2026
**Current Status:** Campaign paused after $10.86 spent, 43 impressions, 7 clicks, 0 conversions

---

## Campaign Goal: Parser Validation (Beta Phase)

**Primary objective:** Maximize file uploads (bank statements + crypto exchange CSVs) to validate parsers in engine.py. Revenue is secondary — we need volume and variety across bank formats and crypto exchanges.

**What this means for the campaign:**
- Optimize for **uploads**, not purchases
- "Free during beta" messaging is a feature, not a liability — lean into it
- Track uploads as the primary conversion event, not signups or payments
- Two separate ad groups: one for bank statements, one for crypto
- Cast a wider net on keywords since any upload from a new bank/exchange format is valuable

---

## What Went Wrong (Previous Campaign)

1. **Generic keywords attracted wrong audience** — Most traffic came from "pdf to csv" and "csv formatter" searches.
2. **Zero high-intent impressions** — Your best keyword barely showed.
3. **Budget burned overnight** — All clicks happened between 12 AM–9 AM.
4. **3 ad groups splitting thin budget** — Only Ad Group 2 received any traffic.
5. **No conversion tracking** — Without tracking, Google can't optimize and you can't measure what's working.
6. **Crypto was completely missing** — No crypto keywords at all, missing half your product.

---

## Restructured Campaign: Two Ad Groups

Use **one campaign with two ad groups** — one for bank statements, one for crypto. This lets you track which vertical is driving more uploads and adjust budget accordingly.

### Ad Group 1: Bank Statement Keywords (Phrase Match)

**High-Intent — Bank Statement Specific:**
```
"bank statement to csv"
"bank statement converter"
"convert bank statement to excel"
"bank statement pdf to csv"
"bank statement pdf to excel"
"pdf bank statement converter"
"convert bank statement pdf"
"bank statement to quickbooks"
"bank statement to xero"
"import bank statement csv"
```

**Medium-Intent — Bank + Accounting Specific:**
```
"convert bank pdf to spreadsheet"
"bank statement data extraction"
"bank statement parser"
"bank pdf to accounting software"
"bank transaction csv converter"
```

**Long-Tail — Bank-Name Specific (your 12 supported banks):**
```
"convert chase statement to csv"
"bank of america statement to excel"
"wells fargo pdf to csv"
"citi bank statement converter"
"td bank statement to csv"
"capital one statement to excel"
"us bank statement to csv"
"pnc statement converter"
"mercury bank statement csv"
"navy federal statement to csv"
"regions bank pdf to csv"
"hsbc statement converter"
"bmo statement to csv"
```

### Ad Group 2: Crypto Exchange Keywords (Phrase Match)

**High-Intent — Crypto CSV/Tax Specific:**
```
"crypto csv converter"
"crypto transaction csv"
"convert crypto transactions to csv"
"crypto tax csv"
"crypto to csv for taxes"
"crypto exchange csv converter"
"format crypto transactions for taxes"
"crypto tax report csv"
```

**Exchange-Specific (add all exchanges you support):**
```
"coinbase csv converter"
"coinbase transactions to csv"
"binance csv converter"
"binance transaction history csv"
"kraken csv export converter"
"crypto.com csv to tax format"
"gemini transaction csv"
"robinhood crypto csv converter"
"metamask transactions to csv"
"phantom wallet csv"
"kucoin csv converter"
```

**Pain-Point Keywords (people hitting the exact problem you solve):**
```
"coinbase csv wrong format"
"binance csv not importing"
"crypto csv turbotax format"
"convert crypto csv to quickbooks"
"crypto csv to txf"
"fix coinbase csv format"
"crypto csv for accountant"
```

### Negative Keywords (campaign-level, apply to both ad groups)

```
-template
-"txt to csv"
-"image to csv"
-"jpg to csv"
-"how to make"
-"csv editor"
-tutorial
-"what is"
-"how to create"
-sample
-example
-blank
-generator
-"cv" (people searching "pdf to cv" want a resume, not CSV)
-open source
-github
-python
-code
-api
-library
-"csv formatter" (wrong intent — they want to format an existing CSV)
-"buy crypto"
-"crypto price"
-"crypto news"
-"how to trade"
-mining
-staking
-nft
```

> **Note:** Removed `-free` and `-"for free"` from negatives. Since you're in beta and offering free uploads, freebie-seekers ARE your target audience right now. Every upload validates a parser.

### Ad Copy: Bank Statement Ad Group

**Headlines (max 30 characters each — provide 15):**
```
1. Bank Statement to CSV Fast
2. Convert Bank PDFs Instantly
3. Bank Statement Converter
4. PDF Bank Statements → CSV
5. 12 Banks Supported
6. 100% Free During Beta
7. Save Hours of Manual Entry
8. Bank PDF to Excel & CSV
9. No Signup Required
10. Import to QuickBooks Easy
11. No Manual Data Entry
12. Try TaxFormatter Free
13. Convert in Under 60 Sec
14. Bank Statements Made Easy
15. Secure & Private Uploads
```

**Descriptions (max 90 characters each — provide 4):**
```
1. Stop manually entering bank transactions. Convert any bank PDF to clean CSV in seconds.
2. Works with Chase, BofA, Wells Fargo, Citi & more. Free during beta — no signup needed.
3. Can't import your bank statement? Upload the PDF, get a clean CSV. QuickBooks & Xero ready.
4. Upload your bank statement PDF and get a clean spreadsheet. Files auto-deleted in 24hrs.
```

### Ad Copy: Crypto Ad Group

**Headlines (max 30 characters each — provide 15):**
```
1. Crypto CSV Converter Free
2. Fix Your Crypto CSV Format
3. Crypto Transactions to CSV
4. Coinbase CSV Converter
5. Binance CSV to Tax Format
6. Crypto CSV for TurboTax
7. 100% Free During Beta
8. No Signup Required
9. Format Crypto for Taxes
10. Exchange CSV Converter
11. Crypto to QuickBooks CSV
12. Try TaxFormatter Free
13. All Major Exchanges
14. Crypto Tax CSV Made Easy
15. Secure & Private Uploads
```

**Descriptions (max 90 characters each — provide 4):**
```
1. Your exchange CSV won't import? We reformat Coinbase, Binance & more for tax software.
2. Convert crypto transaction history to clean CSV for TurboTax, QuickBooks, or your CPA.
3. Free during beta. Upload your exchange CSV, get a tax-ready format back. No signup needed.
4. Supports Coinbase, Binance, Kraken, Gemini & more. Auto-detects your exchange format.
```

> **Note:** Ad copy for both groups mirrors landing page language for strong Quality Score. The "free during beta" angle is a conversion driver, not a liability — every upload validates a parser.

### Ad Schedule

Based on your time-series data, restrict ads to **6 AM – 10 PM** in your target timezone. This prevents budget waste on overnight clicks that aren't converting.

### Bidding Strategy

- Start with **Manual CPC** at $2.00–$3.00 max for high-intent bank statement keywords
- Switch to **Maximize Conversions** only after you have 30+ conversions tracked
- Do NOT use broad match + smart bidding until you have conversion data — this is what burned your budget on irrelevant searches

---

## Conversion Tracking Setup (Critical)

Without this, nothing else matters. Since the goal is parser validation, track **uploads** as your primary metric.

1. **Primary conversion:** User uploads a file (bank PDF or crypto CSV) — this is the event that validates a parser
2. **Secondary conversion:** User downloads the converted output (confirms the parser worked)
3. **Bonus data to log:** Which bank/exchange was detected by engine.py, whether parsing succeeded or failed — this tells you which parsers still need work and which keywords are driving the most useful uploads

**Next.js implementation notes (tag not currently firing):**

Since taxformatter.com is a React/Next.js SPA, the Google tag needs special handling:

- Load the gtag script via `next/script` with `strategy="afterInteractive"` in your root layout
- Fire conversion events manually via `gtag('event', 'conversion', { send_to: 'AW-XXXXX/YYYYY' })` when:
  - A user uploads a file (primary conversion)
  - A user downloads the converted output (secondary conversion)
- Do NOT rely on page-load triggers — SPAs don't do full page reloads
- Google Tag Manager (GTM) is recommended over raw gtag for SPAs — it has built-in "History Change" triggers for SPA navigation

**TODO:** Fix tag implementation before unpausing campaign. Share your layout file and upload page code for exact integration help.

---

## Landing Page: taxformatter.com/upload

**Ad destination URL:** `https://taxformatter.com/upload` — use this as the final URL for all ads.

The landing page is already strong. Here's what it does well and what to tweak:

**Already in place (keep these):**
- Pain-point headline: "Can't import your bank statement?" → "Upload your bank statement. Get a clean CSV back."
- Upload dropzone above the fold with drag-and-drop
- QuickBooks / Xero / Excel error message cards (connects with frustrated users)
- 3-step value prop: Auto-detects bank → Extracts transactions → Exports to your format
- 12 supported banks listed by name (Chase, BofA, Wells Fargo, Citi, Capital One, US Bank, PNC, TD Bank, Mercury, Navy Federal, Regions, HSBC, BMO)
- Export formats: CSV, QuickBooks (QBO), Xero, Excel
- Trust signals: "Free during beta", "No signup required", "Files auto-deleted in 24hrs"
- Privacy policy and Terms links in footer (required by Google)
- Strong CTA: "Convert My Statement for Free →"

**Recommended improvements for ad traffic:**
- Add social proof above the fold (e.g., "10,000+ statements converted" or "Trusted by 500+ bookkeepers") — cold ad traffic converts better with proof
- Consider a secondary CTA or anchor link near the top that scrolls to the upload area — some users on mobile may not immediately see the dropzone
- Add a "How it works" 30-second demo GIF or video — reduces bounce rate from paid clicks
- The page headline matches ad copy well ("Bank Statement to CSV" → "Upload your bank statement. Get a clean CSV back.") which will help Quality Score

---

## Budget & Seasonal Strategy

**Tax season window: ~4 weeks remaining (deadline April 15, 2026)**

Crypto tax search volume spikes Jan–April and drops off hard after filing deadline. Bank statement conversion is steady year-round. Go heavy on crypto now while demand is hot.

**Now through April 15 (tax season push):**
- Total budget: $25–$35/day
- Crypto ad group: 75% of budget
- Bank statement ad group: 25% of budget

**After April 15 (off-season):**
- Flip to 25% crypto / 75% bank statements
- Or pause crypto entirely and focus bank statement parsers through summer
- Crypto picks back up in January when people start tax prep again

---

## Week 1 Checklist

- [ ] Fix Google Tag / conversion tracking on Next.js app (see Conversion Tracking section)
- [ ] Delete old Ad Groups 1 and 3
- [ ] Restructure into 2 ad groups: Bank Statements + Crypto
- [ ] Add bank statement keywords to Ad Group 1
- [ ] Add crypto exchange keywords to Ad Group 2
- [ ] Add all negative keywords at campaign level
- [ ] Create responsive search ads for each ad group (copy above)
- [ ] Set ad schedule to 6 AM – 10 PM
- [ ] Set manual CPC bids at $2.00 (can afford more clicks at beta stage)
- [ ] Add social proof to landing page (upload count, exchange count)
- [ ] Unpause campaign
- [ ] Check search terms report daily — add negatives aggressively

## Week 2–3 Checklist

- [ ] Review search terms — add new negatives for irrelevant queries
- [ ] Check which ad group (bank vs crypto) is driving more uploads
- [ ] Shift budget toward whichever vertical has more parsers that need validation
- [ ] Add exchange-specific keywords for any new parsers added to engine.py
- [ ] Check which headlines/descriptions are performing best
- [ ] Consider competitor keywords: "docuclipper alternative", "koinly alternative", "cointracker alternative"
- [ ] Review engine.py parser success/fail rates by bank/exchange to identify where you need more test uploads
