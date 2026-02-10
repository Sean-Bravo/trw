---
title: TurboTax Integration
description: How to import TaxFormatter data into TurboTax
order: 3
---

# TurboTax Integration

TurboTax is the most popular tax software. Here's how to use TaxFormatter with it.

## Supported TurboTax Versions

- ✅ TurboTax 2024
- ✅ TurboTax 2025
- ✅ TurboTax Plus
- ✅ TurboTax Premier
- ✅ TurboTax Self-Employed

Compatibility is backward-compatible 2+ versions.

## Step-by-Step: TurboTax Desktop

### Step 1: Get Your CSV

1. Upload your CSV to TaxFormatter
2. Download the formatted file (Free or Pro)
3. Save to your computer

### Step 2: Open TurboTax

1. Launch TurboTax
2. Go to your return
3. Navigate to **Investments** → **Investment Income**
4. Click **Stocks, Mutual Funds, Bonds, Other**

### Step 3: Import CSV

1. Click **Add** → **Other options** → **Import from file**
2. Browse and select your TaxFormatter CSV
3. Click **Open**

### Step 4: Map Columns

TurboTax will ask you to map columns:

```
TaxFormatter Column → TurboTax Field
Date → Acquisition Date (buy) or Sold Date (sell)
Amount → Number of Shares
Price → Cost per Share (buy) or Sales Price (sell)
Total → Total Cost (buy) or Total Sales (sell)
```

Usually maps automatically. If not:

- **Cost per Share:** Your cost basis column
- **Quantity:** Amount column
- **Sales Price:** Price column (for sales)
- **Date Sold:** Date column (for sales)

### Step 5: Review Imported Transactions

```
Transaction 1: BUY 0.5 BTC @ $42,525.50 = $21,262.75
  Date: 2025-01-15
  Status: ✓

Transaction 2: SELL 0.5 BTC @ $45,000 = $22,477.50
  Date: 2025-01-20
  Gain/Loss: $1,215 (calculated by TurboTax)
  Status: ✓
```

Verify against your records.

### Step 6: Confirm and Continue

1. Click "Done" or "Next"
2. TurboTax calculates gains/losses automatically
3. Flows to Schedule D
4. Continues with your return

## Step-by-Step: TurboTax Online

### Step 1: Navigate to Investment Income

1. Log into TurboTax.com
2. Go to **Federal** → **Investments**
3. Click **Stocks, Mutual Funds, Bonds, and Other**

### Step 2: Enter Transactions

Online version requires manual entry OR:

Click **Upload or Import CSV** (if available):
1. Click "Add transaction" → "Import from file"
2. Select your TaxFormatter CSV
3. Follow mapping prompts

If upload unavailable, manual entry:
1. Click "Add transaction"
2. Enter each trade details
3. TurboTax calculates gains/losses

### Step 3: Verify and Save

Review each transaction:
- Date matches CSV
- Quantity correct
- Cost basis correct
- Sales price correct

Save.

## Handling Flagged Transactions

### Wash Sales (Free Tier)

**You see:** `[FLAG: Wash Sale]`

**What to do:**

1. TurboTax asks: "Is this part of a wash sale?"
2. Click "Yes"
3. Enter the date of the original sale
4. Enter the disallowed loss amount
5. TurboTax adjusts automatically

Or manually:

1. In the flagged transaction, edit Cost Basis
2. Increase cost basis by the disallowed loss
3. Re-enter the adjusted amount
4. Verify the gain/loss changes correctly

### Wash Sales (Pro Tier)

**You see:** `Cost Basis: 47275 (adjusted)`

**What to do:**

1. Import normally
2. TurboTax sees the adjusted cost basis
3. Calculates gains/losses correctly
4. No manual adjustment needed

### Staking Income

In TurboTax:

1. Go to **Federal** → **Income** → **Interest & Dividends** (or similar)
2. Under "Other Income," find cryptocurrency option
3. Click "Staking Rewards" or "Cryptocurrency Income"
4. Enter total staking income from TaxFormatter
5. TurboTax adds to Schedule 1

Or look in:
- **Federal** → **Deductions & Credits** → **Other**
- Find "Cryptocurrency Income"

### Ordinary Income (Airdrops, Staking)

TurboTax field location:
- **Federal** → **Income** → **Interest & Dividends**
- Scroll to "Other Income" section
- Find "Cryptocurrency" or "Staking Rewards"
- Enter amount from TaxFormatter Notes column

## Matching to Schedule D

After import, verify TurboTax populated Schedule D correctly:

1. Go to **Federal** → **Taxes** → **Schedule D**
2. Check that transactions appear:
   - Part I: Short-term gains/losses
   - Part II: Long-term gains/losses
3. Verify totals match:
   - Number of transactions
   - Total proceeds
   - Total gain/loss

If mismatch:
- Go back to Investments section
- Correct the transaction
- Schedule D auto-updates

## Common TurboTax Issues

### Issue 1: CSV Won't Import

**Problem:** "Unsupported file format"

**Solution:**
- Verify file is .csv (not .xlsx)
- Open in text editor to verify it's plain CSV
- Try removing special characters from filename
- Re-upload to TaxFormatter if corrupted

### Issue 2: Cost Basis Seems Wrong

**Problem:** TurboTax shows different basis than your CSV

**Solution:**
1. Check decimal places (rounding difference?)
2. Check you're looking at correct transaction
3. Verify the CSV matches exchange records
4. If Pro tier, cost basis should be adjusted already
5. If discrepancy: contact support

### Issue 3: Gain/Loss Calculation Off

**Problem:** TurboTax's gain differs from your calculation

**Solution:**
- TurboTax includes fees automatically
- Check if you double-counted fees
- Example: 
  - You sold 1 BTC for $50,000
  - You paid $25 fee
  - Your proceeds: $49,975 (minus fee)
  - TurboTax might show sales price differently
- Verify with original exchange records

### Issue 4: Wash Sale Appears Twice

**Problem:** Flagged transactions appear in both Pro and manual entry

**Solution:**
- Import once from CSV
- Don't manually add flagged transactions
- If already added, delete and re-import

### Issue 5: Date Not Recognized

**Problem:** TurboTax won't accept the date format

**Solution:**
- TurboTax prefers MM/DD/YYYY
- TaxFormatter provides YYYY-MM-DD
- Either:
  - TurboTax auto-converts (usually)
  - You convert in a spreadsheet: YYYY-MM-DD → MM/DD/YYYY
  - Save and re-upload

## Pro Tips for TurboTax

1. **Import in batches if many transactions**
   - Import 100 at a time
   - Less overwhelming to verify
   - Easier to spot errors

2. **Keep TaxFormatter CSV handy**
   - Reference when TurboTax questions arise
   - Original source of truth
   - Good for audits

3. **Use Schedule C if Self-Employed**
   - If crypto trading is business (frequent trader)
   - Different rules apply
   - TurboTax has self-employed section

4. **Screenshot TaxFormatter annotations**
   - Pro tier explains each flag
   - Save screenshots for your records
   - Good documentation for audits

5. **Use TurboTax's "Chat with Tax Expert"**
   - For questions about cryptocurrency
   - They can help interpret TaxFormatter data
   - Premium feature

## TurboTax vs Free Tier vs Pro Tier

| | TurboTax Only | Free + TurboTax | Pro + TurboTax |
|---|---|---|---|
| Manual entry | Hours | 30 mins | 10 mins |
| Cost basis adjustments | Manual | Manual | Auto |
| Wash sale handling | You figure out | You research | Explained |
| Error risk | High | Medium | Low |
| Audit confidence | Low | Medium | High |

## After Import: Final Review

Before submitting your return:

1. ✓ Verify transaction count matches TaxFormatter
2. ✓ Check Schedule D totals are correct
3. ✓ Verify ordinary income (staking, airdrops) in Schedule 1
4. ✓ Confirm long-term vs short-term split is correct
5. ✓ Review any flagged items one more time
6. ✓ Keep TaxFormatter CSV in files with return copy

## TaxFormatter Pro Makes TurboTax Easier

With Pro tier:
- Pre-adjusted cost basis flows through
- Form references tell you exactly where to report
- Explanations save research time
- Less chance of TurboTax entry errors

Cost: $49  
Time saved: 2-3 hours  
Error reduction: Significant  

## Troubleshooting with Support

If you run into issues:

- **TaxFormatter question:** support@taxformatter.com
- **TurboTax integration issue:** TurboTax support chat
- **Tax interpretation question:** Tax professional

We're here to help!