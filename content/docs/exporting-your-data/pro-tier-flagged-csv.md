---
title: Pro Tier Flagged CSV
description: Understanding pro tier export with annotations
order: 2
---

# Pro Tier Flagged CSV

Pro tier exports are annotated and pre-adjusted for direct import into tax software.

## What You Get

- ✅ Everything in Free tier
- ✅ **Flagged issues annotated** in CSV
- ✅ **Adjusted cost basis** for wash sales
- ✅ **Plain English explanations** inline
- ✅ **Platform-ready formatting**
- ✅ **Ready to import directly**

## File Naming

Same as Free tier:

```
{EXCHANGE}_formatted_{DATE}.csv
```

But with full annotations inside.

## Pro Tier Columns (Enhanced)

All free tier columns, PLUS:

| Column | Enhanced In Pro |
|--------|-----------------|
| **Notes** | Full explanations instead of flags |
| **Cost Basis** | Automatically adjusted |
| **Annotations** | Action items explained |

## Example Pro Tier Export

```csv
Date,Pair,Type,Amount,Price,Fee,Total,Cost Basis,Notes
2025-01-15 14:30:00,BTC/USD,BUY,0.5,42500,12.75,21262.75,42525.50,
2025-01-20 09:15:00,BTC/USD,SELL,0.5,45000,22.50,22477.50,42525.50,"WASH SALE - Loss of $2,237.50 is disallowed. Report on Form 8949."
2025-01-27 16:45:00,BTC/USD,BUY,0.5,38000,10.00,19010.00,47275.00,"WASH SALE - Cost basis increased by $5,000 (disallowed loss from Jan 20 sale). Adjusted basis: $47,275."
2025-02-01 16:45:00,ETH/USD,BUY,5,2250,50.00,11300.00,2260.00,
2025-02-10 11:20:00,ETH/USD,SELL,5,2300,50.00,11450.00,2260.00,"Capital gain: $200. Long-term if held >1 year."
2025-03-15 08:00:00,ETH/USD,STAKING,0.125,2400,0.00,300.00,2400.00,"Staking income - $300 ordinary income. Report on Schedule 1, line 8z."
```

## Key Pro Tier Features

### 1. Flagged Issues Explained

**Free:**
```
Notes: [FLAG: Wash Sale]
```

**Pro:**
```
Notes: "WASH SALE - Loss of $2,237.50 is disallowed. Report on Form 8949."
```

You understand the issue without research.

### 2. Cost Basis Adjusted Automatically

**Free:**
```
Jan 20 BUY: Cost Basis 38000 (original, needs manual adjustment)
```

**Pro:**
```
Jan 20 BUY: Cost Basis 47275 (pre-adjusted for wash sale)
```

Ready to import. No manual work.

### 3. Actionable Explanations

**Free:**
```
[FLAG: Timestamp Mismatch]
(You have to figure out what to do)
```

**Pro:**
```
"Timestamp mismatch: CSV shows 14:30, exchange shows 14:32. Impact: <$10. 
Action: Use exchange time. Cost basis unchanged."
```

Clear instructions on what to do.

### 4. Tax Form References

**Free:**
No guidance

**Pro:**
```
"Schedule D, line 1a"
"Form 8949"
"Schedule 1, line 8z"
"Report as long-term capital gain"
```

Tells you exactly where to report.

## Pro Tier Annotation Examples

### Wash Sale Annotation

```
Date: 2025-01-20
Type: BUY
Amount: 1 BTC
Original Cost Basis: 38000
Adjusted Cost Basis: 47275

Note: "WASH SALE ADJUSTMENT
Prior sale: Jan 15, 2025 (loss: $2,237.50)
This buy: Within 30-day window
IRS rule: Loss disallowed, added to cost basis
Adjusted: 38000 + 5000 + 5275 (fees) = 47275
Report: Schedule D, Form 8949 (adjusted basis)"
```

### Staking Income Annotation

```
Date: 2025-03-15
Type: STAKING
Amount: 0.125 ETH
Price at Receipt: 2400
Ordinary Income: $300

Note: "STAKING INCOME
Fair market value at receipt: $300
Tax treatment: Ordinary income (not capital gain)
Cost basis for future sale: $2,400 per ETH
Report: Schedule 1, Line 8z (other income)"
```

### Airdrop Annotation

```
Date: 2025-04-10
Type: AIRDROP
Amount: 100 UNI
Price at Receipt: 5.50
Ordinary Income: $550

Note: "AIRDROP INCOME
Tokens received: 100 UNI
Fair market value: $550 (at $5.50/token)
Tax treatment: Ordinary income (taxed at your rate)
Cost basis per token: $5.50
Report: Schedule 1, Line 8z (other income)
If sold later: Use $5.50 cost basis for capital gain/loss"
```

### Impermanent Loss Annotation

```
Date: 2025-06-30
Type: LP_WITHDRAW
Value Deposited: 30000
Value Withdrawn: 29500
Impermanent Loss: 500

Note: "IMPERMANENT LOSS WARNING
LP deposit value: $30,000
LP withdrawal value: $29,500
Impermanent loss: $500 (due to price changes)
Tax treatment: IRS guidance unclear - consult tax pro
Action: Document this loss and ask your CPA if deductible
Note for tax pro: 'Impermanent loss from Uniswap LP, $500'"
```

## How to Use Pro Tier Export

### Step 1: Download

After processing completes:
- Click "Download Pro CSV"
- Pay $49 (one-time for tax year)
- File downloads with full annotations

### Step 2: Review (Optional)

Open in Excel or Google Sheets:
- Spot-check a few transactions
- Read the annotations
- Understand what's been adjusted

### Step 3: Import to Tax Software

Follow platform instructions (TurboTax, Koinly, etc.):
- Your CSV is already formatted correctly
- Tax software recognizes the structure
- Most columns auto-map

### Step 4: Trust the Data

With Pro tier:
- Cost basis is pre-adjusted
- Flags are explained
- Form references are provided
- You can import with confidence

### Step 5: Save Everything

Archive:
- The CSV file
- Your download receipt
- Any tax pro correspondence

## Pro Tier Reduces Errors

### Without Pro (Free Tier)

```
1. See flag "[FLAG: Wash Sale]"
2. Research what wash sale means
3. Calculate adjusted cost basis manually
4. Update cost basis in TurboTax
5. Hope you got it right
6. Risk: Mathematical error, wrong form, audit risk
```

### With Pro

```
1. Download CSV
2. See annotation explaining the wash sale
3. Cost basis already adjusted
4. Import to TurboTax (auto-maps)
5. Cost basis flows through correctly
6. Less audit risk
```

## Pro Tier Cost Justification

**Cost:** $49  
**Value of time saved:** ~2-3 hours of research + manual work  
**Hourly rate implied:** $17-25/hour  

If you value your time at > $17/hour, Pro pays for itself.

Plus: Reduced audit risk is worth more than $49.

## Multi-Year Tracking (Pro Only)

Pro tier tracks adjustments across years:

```
Year 1 (2024):
Jan 15: Buy BTC
Dec 20: Sell BTC (at loss, triggers wash sale)

Year 2 (2025):
Jan 10: Buy BTC (within 30 days, wash sale applies)
Pro tier automatically:
- Flags wash sale spanning two years
- Adjusts 2025 cost basis
- Notes that adjustment originated from 2024 loss
- Exports both years' files with cross-references
```

## Pro Tier Support

With Pro upgrade, you get:
- Priority email support (4-hour response)
- Help interpreting annotations
- Guidance on tax software import
- Assistance with edge cases

Email: support@taxformatter.com

## When Pro Pays for Itself

✅ Portfolio has wash sales (very common for active traders)  
✅ 100+ transactions per year  
✅ Trading across 3+ years  
✅ Complex DeFi activity  
✅ Multiple staking income sources  
✅ Airdrop income  
✅ Value your time  

One complicated adjustment saved = $49 value.

## Pro Tier is Right If You:

✅ Want annotations without research  
✅ Need pre-adjusted cost basis  
✅ Prefer direct tax software import  
✅ Trading 100+ transactions/year  
✅ Have wash sales or complex activity  
✅ Want to minimize audit risk  

## Switch from Free to Pro

1. Use Free tier to see results
2. Review the flagged items
3. Decide if Pro annotations are worth $49
4. If yes, click "Upgrade to Pro"
5. Pay $49
6. Download annotated CSV
7. Import to tax software

Simple, no commitment. Try Free first.