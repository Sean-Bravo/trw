---
title: ZenLedger Integration
description: How to import TaxFormatter data into ZenLedger
order: 6
---

# ZenLedger Integration

ZenLedger is a comprehensive crypto tax platform. Here's how to use TaxFormatter with it.

## ZenLedger Overview

ZenLedger offers automated API connections and tax reporting.

**Best for:**
- API-connected exchanges
- Simplified tax process
- Professional tax reports
- Multi-exchange tracking

## Integration Methods

### Option 1: Direct API (Primary Method)

ZenLedger connects directly to your exchanges:

1. Log into ZenLedger
2. Go to **Settings** → **Exchange Connections**
3. Select your exchange (Binance, Coinbase, etc.)
4. Authorize with API keys
5. ZenLedger auto-imports all transactions

**Advantage:** Automatic, always updated  
**When to use:** If you can provide API keys

If using APIs directly: You don't need TaxFormatter for ZenLedger import.

But **still use TaxFormatter to:**
- Verify ZenLedger data
- Get explanations of flagged items
- Cross-check before taxes

### Option 2: CSV Upload (With TaxFormatter)

Manual import for users who can't/won't use APIs:

1. Export from exchange
2. Format in TaxFormatter
3. Upload CSV to ZenLedger
4. Verify data
5. Generate tax reports

This is where TaxFormatter excels.

## Step-by-Step: CSV Import to ZenLedger

### Step 1: Get TaxFormatter CSV

1. Upload your exchange CSV to TaxFormatter
2. Download formatted file (Free or Pro)
3. Save to your computer

### Step 2: Go to ZenLedger Import

1. Log into ZenLedger
2. Go to **Dashboard** → **Imports**
3. Or **Settings** → **Data Imports**
4. Click **Add Import** or **Upload CSV**

### Step 3: Upload File

1. Click **Choose File**
2. Select your TaxFormatter CSV
3. Click **Upload**

### Step 4: Choose Transaction Type

ZenLedger will ask: "What type of transactions are these?"

Select:
- **Trades** (for buys/sells)
- **Income** (for staking/airdrops)
- **Transfers** (for deposits/withdrawals)
- **Mixed** (for all types together)

Choose **Mixed** to include all transaction types.

### Step 5: Map Columns

If ZenLedger asks for column mapping:

```
TaxFormatter Column → ZenLedger Field
Date → Transaction Date
Pair → Currency Pair
Type → Transaction Type
Amount → Amount
Price → Price/Rate
Fee → Fee
Cost Basis → Cost Basis (if available)
```

Usually auto-maps. If needed, select from dropdowns.

### Step 6: Verify Preview

ZenLedger shows preview of imported data:

```
Transactions to import: 847
Sample:
- BUY 0.5 BTC @ $42,525.50 on 2025-01-15 ✓
- SELL 0.5 BTC @ $45,000 on 2025-01-20 ✓
```

Verify count and spot-check a few transactions.

### Step 7: Confirm Import

Click **Import** or **Confirm**

ZenLedger processes and calculates gains/losses.

## ZenLedger + TaxFormatter Workflow

### Best Practice Workflow

```
1. Export from exchange
   ↓
2. Format in TaxFormatter
   ↓
3. Review TaxFormatter output
   ↓
4. If API available: Connect to ZenLedger
   If no API: Upload TaxFormatter CSV to ZenLedger
   ↓
5. Verify in ZenLedger
   ↓
6. Generate tax report
   ↓
7. File taxes
```

## Using TaxFormatter with ZenLedger APIs

Even if you use ZenLedger's API connections:

### Cross-Verification

1. ZenLedger imports from API automatically
2. Export your exchange data to TaxFormatter separately
3. Compare reports:
   - Same transaction count?
   - Same gains/losses?
   - Any discrepancies?

### Flagging

ZenLedger has AI detection for:
- Wash sales
- Staking income
- DeFi transactions

TaxFormatter provides **detailed explanations** of each flag.

Use TaxFormatter notes to understand what ZenLedger flagged.

### Example

**ZenLedger alerts:** "Wash sale detected"  
**You think:** "What does that mean?"  
**TaxFormatter explains:** "You sold BTC at a loss on Jan 16, bought again on Jan 20. Loss of $2,500 disallowed. Cost basis of new purchase increased."

Now you understand the impact.

## Cost Basis Handling in ZenLedger

### With Free Tier TaxFormatter

CSV shows:
```
Cost Basis: 42525.50 [FLAG: Wash Sale]
```

In ZenLedger:
1. You import with original basis
2. ZenLedger calculates gains/losses
3. ZenLedger flags the wash sale
4. You tell ZenLedger to apply wash sale rule
5. ZenLedger recalculates with adjusted basis

### With Pro Tier TaxFormatter

CSV shows:
```
Cost Basis: 47275.00 (WASH SALE - cost basis adjusted)
```

In ZenLedger:
1. You import with adjusted basis
2. ZenLedger uses adjusted basis directly
3. Gains/losses calculated correctly
4. No manual recalculation needed

**Pro tier saves back-and-forth with ZenLedger.**

## Special Transaction Handling

### Staking Income

**In TaxFormatter:**
```
Type: STAKING
Amount: 0.125 ETH
FMV: $2,400
Notes: "Staking income - $300 ordinary income"
```

**In ZenLedger:**
1. Import with Type: STAKING
2. ZenLedger recognizes as income
3. Not included in capital gains
4. Flows to income section
5. Generates Schedule 1 line

**TaxFormatter notes verify:**
- Correct FMV
- Correct cost basis for future sales

### Airdrops

**In TaxFormatter:**
```
Type: AIRDROP
Amount: 100 UNI
FMV: $550
Notes: "Airdrop income - $550 ordinary income"
```

**In ZenLedger:**
1. Import with Type: AIRDROP
2. ZenLedger recognizes as income
3. Records FMV at receipt
4. Uses as cost basis going forward
5. Generates income report

### DeFi Transactions

```
Type: SWAP (for DEX trades)
Type: LP_DEPOSIT (liquidity pool deposits)
Type: LP_WITHDRAW (liquidity pool withdrawal)
Type: LP_REWARD (farming income)
```

**In ZenLedger:**
1. SWAP = capital gain/loss
2. LP_REWARD = ordinary income
3. LP transactions tracked through
4. Impermanent loss noted if applicable

**TaxFormatter notes explain tax treatment.**

## Multi-Exchange with ZenLedger + TaxFormatter

### Scenario: Binance + Coinbase + MetaMask

**Option A: All APIs to ZenLedger**
1. Connect Binance API → ZenLedger
2. Connect Coinbase API → ZenLedger
3. MetaMask: No direct API → Use TaxFormatter CSV
4. ZenLedger consolidates all three

**Option B: TaxFormatter for all**
1. Export Binance → TaxFormatter → ZenLedger
2. Export Coinbase → TaxFormatter → ZenLedger
3. Export MetaMask → TaxFormatter → ZenLedger
4. Verifiable, clean data throughout

**Option C: Hybrid (Recommended)**
1. Binance API → ZenLedger (automatic)
2. Coinbase → TaxFormatter → ZenLedger (verified)
3. MetaMask → TaxFormatter → ZenLedger (manual wallet)
4. Best of both: automation + verification

## ZenLedger Tax Report

After importing:

1. Go to **Tax Reports**
2. Select tax year
3. Click **Generate Report**

ZenLedger creates:
- Capital gains/losses summary
- Schedule D (USA)
- Form 8949 (USA)
- Detailed transaction list
- Exportable PDF/CSV

Use for:
- CPA
- TurboTax import
- Direct filing
- Your records

## Verification Checklist

After importing to ZenLedger:

- [ ] Transaction count matches TaxFormatter
- [ ] Total gains/losses make sense
- [ ] Flagged items understood (use TaxFormatter notes)
- [ ] Cost basis values verified
- [ ] Staking/airdrop income in correct section
- [ ] Long-term vs short-term split correct
- [ ] Fee amounts included
- [ ] No duplicate transactions

## Common ZenLedger + TaxFormatter Issues

### Issue 1: Count Mismatch

**Problem:** TaxFormatter 847, ZenLedger 840

**Solution:**
1. Check for deposits/withdrawals (may be excluded)
2. Verify date range same in both
3. Check for duplicates in TaxFormatter export
4. Filter by transaction type

### Issue 2: Gain/Loss Calculation Different

**Problem:** Different gains than expected

**Solution:**
1. Verify cost basis same in both
2. Check fees included
3. Verify date of sale (affects year)
4. Check long-term vs short-term (holding period)

### Issue 3: Wash Sale Adjustment

**Problem:** ZenLedger adjusted differently than TaxFormatter

**Solution:**
1. ZenLedger may use different rules
2. Use TaxFormatter Pro (pre-adjusted, use those numbers)
3. Or consult your CPA on discrepancy
4. IRS rules are clear (TaxFormatter follows them exactly)

### Issue 4: Import Won't Complete

**Problem:** "Invalid file format" error

**Solution:**
1. Verify CSV file (check in text editor)
2. Try removing special characters from filename
3. Check file isn't corrupted
4. Re-download from TaxFormatter if needed

## Pro Tier Benefits for ZenLedger

TaxFormatter Pro ($49) provides:

✅ Pre-adjusted cost basis (ready to import)  
✅ Detailed explanations (understand each flag)  
✅ Plain English annotations (no guessing)  
✅ Form references (know where to report)  
✅ Cross-verification (check ZenLedger's work)  

Especially valuable if:
- You have wash sales
- Multiple exchanges
- Complex DeFi activity
- Want to verify ZenLedger results

## Best Practices

1. **Use TaxFormatter first**
   - Clean your data
   - Understand issues
   - Get explanations

2. **Review TaxFormatter output**
   - Read any flags
   - Use Pro tier for annotations
   - Understand implications

3. **Import clean data to ZenLedger**
   - Use formatted CSV (if not using API)
   - Or verify API import using TaxFormatter
   - Higher quality input → higher quality output

4. **Verify in ZenLedger**
   - Spot-check transactions
   - Review flagged items
   - Compare to TaxFormatter

5. **Generate and review report**
   - Check totals
   - Read notes
   - Verify before filing

## When to Use TaxFormatter + ZenLedger

✅ Want to verify API imports  
✅ Have wallets without API (MetaMask, hardware, etc.)  
✅ Pro tier for explanation + clean data  
✅ Cross-check before filing  
✅ Complex portfolios  
✅ Multiple years  

## Cost Comparison

| | Cost | Purpose |
|---|---|---|
| TaxFormatter Free | $0 | Clean CSV + basic flagging |
| TaxFormatter Pro | $49 | Annotations + adjusted basis |
| ZenLedger Free | $0 | API + basic reports |
| ZenLedger Pro | $199-599 | Full tax reports + support |

**Value stack:**
- Free tier both: CSV clean, basic report ✓
- Pro TaxFormatter + Free ZenLedger: Clean + explained ✓
- Either tier TaxFormatter + Pro ZenLedger: Full tax solution ✓

Choose based on your portfolio complexity and budget.

## Final Workflow: TaxFormatter → ZenLedger → IRS

```
1. TaxFormatter: Clean data + explain issues ($0-49)
   ↓
2. ZenLedger: Generate tax report ($0-599)
   ↓
3. CPA/TurboTax: File taxes
   ↓
4. IRS: Submit with confidence ✓
```

Done! You're all set.