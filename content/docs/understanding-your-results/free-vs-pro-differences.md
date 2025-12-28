---
title: Free vs Pro Differences
description: Compare free and pro tier features
order: 3
---

# Free Tier vs Pro Tier

TaxFormatter offers two tiers. Here's what each includes and how to choose.

## Quick Comparison

| Feature | Free | Pro ($49) |
|---------|------|-----------|
| CSV Upload | ✅ | ✅ |
| Exchange Detection | ✅ | ✅ |
| Transaction Normalization | ✅ | ✅ |
| AI Flagging | ✅ | ✅ |
| Basic Export | ✅ | ✅ |
| **Flagged Issue Annotations** | ❌ | ✅ |
| **Cost Basis Adjustments** | ❌ | ✅ |
| **Direct Tax Software Export** | ❌ | ✅ |
| **Multi-Year Reconciliation** | ❌ | ✅ |
| **Priority Support** | ❌ | ✅ |

## Free Tier Details

**Best for:** Single-year filers, simple portfolios, budget-conscious users

**What you get:**
- Upload and process CSV files
- AI detection of tax issues (wash sales, staking, etc.)
- Plain English explanations of each flagged issue
- Formatted CSV download
- Import to any tax software

**Limitations:**
- Flags are noted but not annotated in CSV
- No automatic cost basis adjustments
- No pre-formatted exports for tax software
- Single-file processing only
- Standard email support (48-hour response)

**Export format:**
```
Date,Pair,Type,Amount,Price,Fee,Total,CostBasis,Notes
2025-01-16,BTC/USD,SELL,1,45000,25,44975,42500,[FLAG: Wash Sale]
```

You see the flag, but you adjust cost basis manually.

## Pro Tier Details

**Best for:** Serious traders, complex portfolios, multi-year filers

**What you get:**
- Everything in Free
- **Annotated CSV** - Flags with context added directly to your file
- **Adjusted cost basis** - Wash sales automatically recalculated
- **Platform-ready exports** - Formatted for TurboTax, Koinly, CoinLedger, ZenLedger
- **Multi-year processing** - Track adjustments across multiple tax years
- **Priority support** - 4-hour response time
- **Reconciliation tools** - Compare your CSV to exchange records

**Enhanced export format:**
```
Date,Pair,Type,Amount,Price,Fee,Total,CostBasis,Notes
2025-01-16,BTC/USD,SELL,1,45000,25,44975,47500,"WASH SALE - Loss disallowed. Cost basis adjusted +$5,000 from Jan 12 buy."
```

You get the annotation, explanation, and adjusted basis—ready to import.

## Feature Breakdown

### AI Flagging (Both Tiers)

**Free:** You see the flag and a summary explanation
```
FLAG: Wash Sale detected
Buy on Jan 12, Sell on Jan 16, Buy again on Jan 20
Your loss ($2,500) is disallowed by IRS
```

**Pro:** You get the flag PLUS annotations in your CSV
```
WASH SALE TRIPLE: Jan 12 BUY → Jan 16 SELL (loss) → Jan 20 BUY
Disallowed loss: $2,500
Adjusted cost basis: $47,500 (increased by $5,000)
Form: 8949 - Report loss adjustment on Schedule D
```

### Cost Basis Handling (Key Difference)

**Free:** You manually adjust in tax software
- We flag wash sales
- You open spreadsheet
- You manually recalculate cost basis
- You enter adjusted numbers in TurboTax/Koinly
- Risk of errors increases

**Pro:** We do it for you
- We detect wash sales
- We calculate adjustments automatically
- Your CSV has adjusted numbers
- You import directly
- Zero manual adjustment needed

### Tax Software Integration

**Free:** Generic CSV
- Works with all platforms
- May need reformatting
- Might require manual column mapping

**Pro:** Platform-optimized exports
- TurboTax format - imports to Schedule D directly
- Koinly format - matches their column structure
- CoinLedger format - pre-populated fields
- ZenLedger format - recognized as native import

### Multi-Year Reconciliation (Pro Only)

Track adjustments across tax years:

```
Year 1: Jan 2024 buy, Dec 2024 sell at loss
Year 2: Jan 2025 buy (within 30 days) ← Wash sale applies to 2025
```

Pro tier automatically flags and adjusts across years.

## When to Use Free

✅ First time user testing the platform  
✅ Simple portfolio (< 100 transactions)  
✅ Single tax year  
✅ Willing to manually adjust cost basis  
✅ Budget is tight  

## When to Use Pro

✅ Active trader (100+ transactions/year)  
✅ Multiple exchanges or wallets  
✅ Concerned about wash sale adjustments  
✅ Want to import and submit directly  
✅ Trading for 3+ years  
✅ Complex DeFi activity  
✅ Need priority support  

## Pricing

**Free:** $0  
**Pro:** $49/year per tax year

One $49 payment covers all uploads and processing for that tax year.

## How to Upgrade

1. Upload and process in Free tier
2. See the results and flags
3. Click "Upgrade to Pro" button
4. Pay $49 securely
5. Re-download your CSV with annotations
6. Import to tax software

## Money-Back Guarantee

Not satisfied with Pro? Email support@taxformatter.com within 7 days for a full refund.

## Which Should You Choose?

**Choose Free if:**
- You have time to manually adjust cost basis
- Your portfolio is simple
- You want to test TaxFormatter first

**Choose Pro if:**
- You want accurate, automated adjustments
- You have wash sales (very common)
- You value your time
- You want direct tax software integration
- You trade frequently

When in doubt: **Pro pays for itself in time saved** (1 hour of manual work = $49 value).