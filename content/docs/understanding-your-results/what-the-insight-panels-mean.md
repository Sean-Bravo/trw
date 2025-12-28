---
title: What the Insight Panels Mean
description: Understanding each AI insight panel
order: 1
---

# Understanding the AI Insight Panels

When you upload your CSV to TaxFormatter, you'll see four real-time insight panels. Here's what each one means.

## 1. Exchange Detected ✓

**What it shows:** Which cryptocurrency exchange we recognized from your CSV format.

**Examples:**
- Binance Spot Trading
- Coinbase Pro
- Kraken API Export
- KuCoin Historical Data
- Bybit Perpetual

**Why it matters:** We use exchange-specific parsers to correctly interpret your data. If the wrong exchange is detected, we may misparse your transactions.

**What to do:** If it's wrong, export again from your exchange with default settings and re-upload.

## 2. Analyzing Transactions ↻

**What it shows:** Real-time count of transactions being processed.

**Examples:**
- "Analyzing 247 transactions..."
- "Processing complete: 847 transactions found"

**Why it matters:** This confirms we're finding and parsing your trades correctly. Large jumps or unexpectedly low counts might indicate parsing issues.

**What to do:** Compare to your exchange's transaction count. If it's significantly different, check for export settings or filters.

## 3. Potential Tax Issues ⚠️

**What it shows:** Count and type of flagged tax issues we detected.

**Examples:**
- "23 Wash Sales detected"
- "5 Staking income transactions"
- "12 Airdrop events"
- "3 Timestamp mismatches"

**Why it matters:** These flags indicate transactions that need special handling for accurate tax reporting.

**What to do:** Click each flag to see details. Read the explanations to understand what each issue means for your taxes.

## 4. Tax-Software Ready ✓

**What it shows:** Your data is formatted and ready for export.

**Examples:**
- "847 transactions normalized"
- "Cost basis calculated"
- "Ready for TurboTax, Koinly, CoinLedger, ZenLedger"

**Why it matters:** This confirms the data transformation is complete and safe to export to your tax software.

**What to do:** Download your formatted CSV and import it into your tax software of choice.

## Panel Colors Explained

- **🟢 Green (Complete)** - Exchange detected or data ready
- **🔵 Blue (Processing)** - Currently analyzing transactions
- **🟡 Yellow/Orange (Warning)** - Issues detected that need review
- **🔴 Red (Error)** - Critical problems preventing processing

## Reading the Timeline

The panels appear in order:

```
1. Exchange Detected (immediate)
   ↓
2. Analyzing Transactions (1-5 seconds)
   ↓
3. Potential Tax Issues (identified during analysis)
   ↓
4. Tax-Software Ready (final status)
```

This progression shows TaxFormatter is working through your data systematically.

## Next Steps

Once you see "Tax-Software Ready":

1. **Review the issues** - Check what was flagged
2. **Download your CSV** - Get your formatted file
3. **Import to tax software** - Follow platform guides
4. **Verify numbers** - Compare to exchange records