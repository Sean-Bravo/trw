---
title: Koinly Integration
description: How to import TaxFormatter data into Koinly
order: 4
---

# Koinly Integration

Koinly is a specialized crypto tax platform. Here's how to use TaxFormatter with it.

## Koinly Overview

Koinly automatically connects to exchange APIs and wallets. TaxFormatter works great with Koinly's manual import feature.

**Best for:**
- Multi-exchange traders
- DeFi activity
- Automated tracking
- Detailed tax reports

## Connecting Koinly + TaxFormatter

### Option 1: Direct API (Recommended)

Connect your exchange directly to Koinly:

1. Log into Koinly
2. Go to **Settings** → **Exchange & Wallet Connections**
3. Click "Add Exchange"
4. Select your exchange (Binance, Coinbase, etc.)
5. Authorize with API keys
6. Koinly auto-imports all transactions

**Advantage:** Automatic, always up-to-date  
**Disadvantage:** Requires API keys

If you use this: You don't need TaxFormatter CSV for Koinly import.

But Pro tip: Still use TaxFormatter to:
- Verify Koinly data is correct
- Get plain English explanations of flagged issues
- Cross-check before filing taxes

### Option 2: Manual CSV Import (With TaxFormatter)

If you can't use APIs or want to verify data:

1. Get your formatted CSV from TaxFormatter
2. Import into Koinly manually
3. Koinly reconciles with any API-connected data
4. You verify everything before export

This is where TaxFormatter + Koinly combo excels.

## Step-by-Step: Importing CSV to Koinly

### Step 1: Download TaxFormatter CSV

1. Upload your exchange CSV to TaxFormatter
2. Choose Free or Pro tier
3. Download formatted file

### Step 2: Go to Koinly Import

1. Log into Koinly.io
2. Go to **Portfolio** (top menu)
3. Click **Add Transactions** → **Manual Import**
4. Or click **Import CSV** if available

### Step 3: Prepare Your File

If Koinly requires different columns:

1. Open TaxFormatter CSV in spreadsheet
2. Koinly prefers columns:
   - Date
   - Asset
   - Type (BUY, SELL, etc.)
   - Amount
   - Price
   - Fee

TaxFormatter provides all of these, so usually no prep needed.

### Step 4: Upload CSV

1. Click **Choose File**
2. Select your TaxFormatter CSV
3. Click **Open**

### Step 5: Map Columns

Koinly will ask you to map columns:

```
TaxFormatter Column → Koinly Field
Date → Date
Pair → Bought/Sold (extract from pair)
Amount → Amount
Price → Price
Fee → Fee
Type → Type (BUY, SELL, DEPOSIT, etc.)
```

Usually auto-maps correctly.

### Step 6: Verify Transactions

```
Koinly shows:
Transaction 1: BUY 0.5 BTC @ $42,525.50
Transaction 2: SELL 0.5 BTC @ $45,000
...
Total: 847 transactions imported
```

Spot-check a few transactions against TaxFormatter CSV.

### Step 7: Confirm Import

Click "Import" or "Confirm"

Koinly processes transactions and calculates gains/losses.

## Using TaxFormatter + Koinly Together

### Workflow

```
Step 1: Upload to TaxFormatter
  → Get formatted CSV + plain English explanations

Step 2: Review TaxFormatter results
  → Understand what issues exist
  → Read explanations

Step 3: Import formatted CSV to Koinly
  → Cleaner data than raw exchange export

Step 4: Verify in Koinly
  → Cross-check calculations
  → Confirm any flagged items

Step 5: Export tax report from Koinly
  → Use for TurboTax, CPA, or filing
```

## Handling Flagged Items in Koinly

### Wash Sales

**If Free tier (flagged):**
1. TaxFormatter flags the wash sale
2. You see note in TaxFormatter
3. Manually tell Koinly to apply wash sale rule
4. Koinly recalculates cost basis

**In Koinly:**
1. Find the flagged transaction
2. Click edit
3. Look for "Wash Sale" option
4. Check the box and enter related transaction
5. Koinly auto-adjusts basis

**If Pro tier (adjusted):**
1. Your CSV already has adjusted cost basis
2. Import with adjusted numbers
3. Koinly uses the adjusted basis
4. Calculations flow through correctly

### Staking & Airdrop Income

**In Koinly:**

1. Import staking/airdrop transactions with Type: STAKING or AIRDROP
2. Koinly recognizes the type
3. Treats as ordinary income (not capital gain)
4. Reports in income section (not gains/losses)
5. TaxFormatter notes explain fair market value
6. You can reference TaxFormatter notes if Koinly asks

## Comparing TaxFormatter Flags to Koinly

Koinly has built-in tax intelligence. It might flag issues too.

If Koinly flags something different from TaxFormatter:

1. **Check TaxFormatter first**
   - It's specialized for tax issues
   - Read the detailed explanation

2. **Cross-reference in Koinly**
   - See if Koinly has additional context
   - Sometimes they flag different things

3. **When in doubt, contact support**
   - TaxFormatter: support@taxformatter.com
   - Koinly: Koinly support chat
   - Tax pro: For conflicting advice

## Multi-Exchange with TaxFormatter + Koinly

### Scenario: You use Binance and Coinbase

**Option A: API both exchanges**
1. Connect both to Koinly directly
2. Don't need TaxFormatter
3. Use TaxFormatter to verify/cross-check

**Option B: Use TaxFormatter**
1. Export from Binance → TaxFormatter → Import to Koinly
2. Export from Coinbase → TaxFormatter → Import to Koinly
3. Koinly consolidates both
4. Verify against TaxFormatter data

**Option C: Hybrid**
1. Connect Binance API to Koinly
2. Export Coinbase to TaxFormatter
3. Import TaxFormatter CSV to Koinly
4. Best of both: automation + verification

## Pro Tier Benefits for Koinly Users

With TaxFormatter Pro:

✅ Pre-adjusted cost basis  
✅ Wash sales explained inline  
✅ Plain English annotations  
✅ Form references (where to report)  
✅ Ready to import with confidence  

Example Pro annotation:
```
"WASH SALE - Loss disallowed per IRS rule.
Cost basis adjusted from 38000 to 47275.
Report adjusted basis in Koinly."
```

Koinly will use the adjusted basis you imported.

## Koinly Export for Taxes

After importing and verifying:

1. Go to **Tax Reports**
2. Select your country (US)
3. Select tax year
4. Click **Generate Report**

Koinly creates:
- Summary of gains/losses
- Schedule D format
- Form 8949 format
- Exportable to PDF

Use this for your CPA or TurboTax.

## Common Koinly + TaxFormatter Issues

### Issue 1: Transaction Count Mismatch

**Problem:** TaxFormatter shows 847 transactions, Koinly shows 840

**Solution:**
1. Check for deposits/withdrawals (Koinly may exclude)
2. Check TaxFormatter doesn't include duplicates
3. Filter by date range in both
4. Ask support if discrepancy persists

### Issue 2: Cost Basis Different

**Problem:** Koinly calculates basis differently than TaxFormatter

**Solution:**
1. TaxFormatter includes fees in basis (correct)
2. Check Koinly settings: "Include fees in basis?"
3. May need to adjust Koinly settings
4. Or use TaxFormatter Pro (pre-adjusted)

### Issue 3: Wash Sale Not Recognized

**Problem:** You told Koinly about wash sale, but it didn't adjust

**Solution:**
1. Koinly has own wash sale rules
2. May not work exactly like IRS
3. Use TaxFormatter Pro (pre-adjusted)
4. Import adjusted cost basis directly

### Issue 4: Income vs Gain Mixed Up

**Problem:** Staking income showing as capital gain

**Solution:**
1. Check transaction Type in Koinly (should be STAKING, not BUY)
2. May need to manually correct in Koinly
3. TaxFormatter notes will explain what it should be
4. Contact Koinly support if persists

## Best Practices

1. **Download TaxFormatter first**
   - Gets you clean, formatted data
   - Explanations help you understand

2. **Review TaxFormatter notes**
   - Read annotations (Pro tier)
   - Understand any flags
   - Prepares you for Koinly

3. **Import to Koinly**
   - Use formatted CSV
   - Data is cleaner than raw export
   - Reduces Koinly errors

4. **Verify in Koinly**
   - Cross-check totals
   - Spot-check transactions
   - Make sure gains/losses look right

5. **Keep TaxFormatter CSV**
   - Archive with your return
   - Good for audits
   - Proves your source of truth

## TaxFormatter Pro for Koinly Users

Cost: $49  
Value:
- Koinly integration smoother with adjusted basis
- No manual cost basis corrections needed
- Clear explanations for every flag
- Ready-to-import format

Worth it if you want error-free data flowing from TaxFormatter → Koinly → Tax filing.

## When to Use TaxFormatter + Koinly

✅ Multiple exchanges  
✅ Complex DeFi activity  
✅ Want verification of data  
✅ Need detailed explanations  
✅ Want clean import into Koinly  

## Final Step: Export to TurboTax

After using Koinly:

1. In Koinly, generate Tax Report
2. Download PDF or CSV
3. Use in TurboTax or give to CPA
4. File taxes with confidence

TaxFormatter → Koinly → TurboTax → IRS ✓