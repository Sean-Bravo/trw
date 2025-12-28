---
title: CoinLedger Integration
description: How to import TaxFormatter data into CoinLedger
order: 5
---

# CoinLedger Integration

CoinLedger is a specialized crypto tax platform focused on accuracy. Here's how to use TaxFormatter with it.

## CoinLedger Overview

CoinLedger offers automated tracking and tax reporting specifically for cryptocurrency.

**Best for:**
- Accurate cost basis tracking
- Multi-platform support
- Detailed audit reports
- Tax form generation

## Integration Method: CSV Import

CoinLedger accepts CSV uploads for manual transaction import.

### Step-by-Step

#### Step 1: Download TaxFormatter CSV

1. Upload your exchange CSV to TaxFormatter
2. Select Free or Pro tier
3. Download formatted file

#### Step 2: Go to CoinLedger Import

1. Log into CoinLedger.io
2. Go to **Transactions** → **Import**
3. Click **Upload CSV** (or "Manual Import" if available)

#### Step 3: Upload File

1. Click **Choose File**
2. Select your TaxFormatter CSV
3. Click **Upload**

#### Step 4: Map Columns

CoinLedger will ask for column mapping:

```
TaxFormatter Column → CoinLedger Field
Date → Transaction Date
Pair → Cryptocurrency (asset)
Type → Type (BUY, SELL, etc.)
Amount → Quantity
Price → Unit Price
Fee → Fee
Total → Total (optional)
Cost Basis → Cost Basis (if provided)
```

Usually auto-maps. If not, click and select from dropdown.

#### Step 5: Verify Transactions

Review imported data:
- Count matches TaxFormatter
- Dates and amounts correct
- Types recognized

#### Step 6: Confirm Import

Click **Confirm** or **Save**

CoinLedger processes transactions and calculates gains/losses.

## TaxFormatter CSV Structure for CoinLedger

Your TaxFormatter export includes all fields CoinLedger needs:

```csv
Date,Pair,Type,Amount,Price,Fee,Total,Cost Basis,Notes
2025-01-15,BTC/USD,BUY,0.5,42500,12.75,21262.75,42525.50,
2025-01-20,BTC/USD,SELL,0.5,45000,22.50,22477.50,42525.50,[FLAG: Wash Sale]
```

CoinLedger recognizes:
- **Date** → When transaction occurred
- **Type** → BUY, SELL, DEPOSIT, WITHDRAWAL, etc.
- **Amount** → Quantity
- **Price** → Per-unit cost/sale price
- **Cost Basis** → Your cost per unit (Pro tier adjusted)

## Cost Basis Handling

### Free Tier

Your CSV shows flagged items:
```
Cost Basis: 42525.50 [FLAG: Wash Sale]
```

In CoinLedger:
1. Import with original cost basis
2. CoinLedger alerts you about the flag
3. You manually adjust basis if needed
4. Or contact CPA for guidance

### Pro Tier

Your CSV shows adjusted cost basis:
```
Cost Basis: 47275.00 (WASH SALE - cost basis adjusted)
```

In CoinLedger:
1. Import with adjusted basis
2. CoinLedger uses adjusted basis automatically
3. Gains/losses calculated correctly
4. No manual adjustments needed

## Handling Special Transactions in CoinLedger

### Staking Rewards

**Type:** STAKING  
**CoinLedger field:** Type

In CoinLedger:
1. Transaction marked as STAKING
2. CoinLedger treats as income (not capital gain)
3. Reports in income section
4. Flows to appropriate tax form

**TaxFormatter notes help you verify:**
- Fair market value at receipt
- Cost basis for future sales
- Where to report (Schedule 1)

### Airdrops

**Type:** AIRDROP  
**CoinLedger field:** Type

In CoinLedger:
1. Transaction marked as AIRDROP
2. CoinLedger recognizes as income
3. Records FMV at receipt
4. Uses as cost basis for future sales

**TaxFormatter notes explain:**
- Income is ordinary income
- When recognized (receipt date)
- Tax form reference

### DeFi Transactions

For swaps, LP farming, etc.:

```csv
Type: SWAP (for token exchange)
Type: LP_DEPOSIT (for liquidity pools)
Type: LP_REWARD (for farming income)
```

CoinLedger interprets:
- SWAP = capital gain/loss
- LP_REWARD = ordinary income
- LP transactions = tracks through withdrawal

**TaxFormatter notes provide:**
- Explanation of what happened
- Tax treatment
- Whether cost basis affected

## Multi-Wallet with CoinLedger

If you hold coins in multiple wallets (Coinbase, MetaMask, Hardware wallet, etc.):

### Option 1: Export each exchange separately

1. Export Coinbase → TaxFormatter → Import to CoinLedger
2. Export MetaMask → TaxFormatter → Import to CoinLedger
3. CoinLedger consolidates all wallets
4. Calculates total gains/losses

### Option 2: Use CoinLedger API connections

1. Connect Coinbase API to CoinLedger
2. Export other wallets → TaxFormatter
3. Manual import to CoinLedger
4. Hybrid approach: automation + verification

## Wash Sale Handling in CoinLedger

### Free Tier (Flag shown)

TaxFormatter notes: `[FLAG: Wash Sale]`

In CoinLedger:
1. Import with original cost basis
2. CoinLedger may flag it too
3. You tell CoinLedger about wash sale
4. CoinLedger adjusts basis
5. Or you manually update

### Pro Tier (Adjusted automatically)

TaxFormatter notes: `Cost basis adjusted from 38000 to 47275`

In CoinLedger:
1. Import with adjusted basis (47275)
2. CoinLedger uses your imported basis
3. Calculates gains/losses correctly
4. No manual adjustment needed

**Pro tip:** Pro tier saves back-and-forth with CoinLedger support.

## Tax Report Generation

After importing and verifying:

1. Go to **Tax Reports** in CoinLedger
2. Select tax year
3. Select report type (USA, Canada, etc.)
4. Click **Generate**

CoinLedger creates:
- Capital gains summary
- Schedule D format (for US)
- Form 8949 (for US)
- Exportable PDF

Use for:
- Your CPA
- TurboTax import
- Direct IRS filing
- Your records

## Comparing TaxFormatter to CoinLedger

| | TaxFormatter | CoinLedger |
|---|---|---|
| Purpose | Data cleaning + tax flagging | Full tax reporting |
| Best for | Preparing data | Filing taxes |
| Output | Clean CSV | Tax forms |
| Flagging | Explains each issue | Generates report |
| Cost | Free or $49/year | $199-599/year |

**Common workflow:**
1. Use TaxFormatter to clean & verify data ($0-49)
2. Use CoinLedger to generate tax forms ($199+)
3. File taxes with confidence

## Pro Tier Benefits for CoinLedger Users

TaxFormatter Pro ($49) pays for itself when:

✅ You have wash sales (pre-adjusted basis)  
✅ You want to avoid CoinLedger support questions  
✅ Clean data = accurate tax forms  
✅ Less audit risk  

CoinLedger Pro is more expensive, but TaxFormatter Pro data makes it work better.

## Common CoinLedger + TaxFormatter Issues

### Issue 1: Duplicate Transactions

**Problem:** Transaction appears twice in CoinLedger

**Solution:**
1. Check TaxFormatter CSV for duplicates
2. Or CoinLedger may already have from API
3. Delete duplicate in CoinLedger
4. Keep only one version

### Issue 2: Wrong Transaction Type

**Problem:** CoinLedger shows TRADE instead of SWAP

**Solution:**
1. Edit in CoinLedger: click transaction → edit Type
2. Select correct type
3. Save (CoinLedger recalculates)
4. Or check TaxFormatter Type was correct

### Issue 3: Cost Basis Missing

**Problem:** CoinLedger can't calculate gain/loss

**Solution:**
1. Check TaxFormatter included Cost Basis column
2. If using Free tier: manually enter basis
3. If using Pro tier: basis should be there
4. Re-import if needed

### Issue 4: Report Shows Wrong Amounts

**Problem:** CoinLedger tax report total doesn't match TaxFormatter

**Solution:**
1. Verify all transactions imported
2. Check for deposits/withdrawals (shouldn't affect gains)
3. Verify cost basis matches in both
4. Contact CoinLedger support if persists

## Best Practices

1. **Use TaxFormatter first**
   - Clean data
   - Understand issues
   - Get explanations

2. **Review TaxFormatter output**
   - Read any flags
   - Understand impact
   - Pro tier annotations help

3. **Import clean data to CoinLedger**
   - CoinLedger works better with clean data
   - Fewer errors to correct
   - Faster report generation

4. **Verify in CoinLedger**
   - Spot-check transactions
   - Confirm total counts
   - Review flagged items

5. **Generate CoinLedger report**
   - Use for taxes
   - Export to CPA or TurboTax
   - Keep for records

## When to Use TaxFormatter + CoinLedger

✅ Want clean CSV before CoinLedger import  
✅ Have flagged items needing explanation  
✅ Pro tier for pre-adjusted cost basis  
✅ Want to minimize CoinLedger troubleshooting  
✅ Have complex tax situation  
✅ Multiple years or multiple exchanges  

## CoinLedger Subscription Consideration

CoinLedger costs $199-599/year (depending on tier).

TaxFormatter ($49/year) is much cheaper and provides:
- Clean data for CoinLedger
- Flagging and explanations
- Pre-adjusted basis (Pro)
- Cross-verification

**Tip:** Use both for robust tax preparation.

TaxFormatter = data cleaning + flagging  
CoinLedger = tax form generation  

Together = accurate, complete tax filing.