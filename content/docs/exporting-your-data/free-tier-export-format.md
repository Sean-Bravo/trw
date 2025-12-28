---
title: Free Tier Export Format
description: Understanding free tier CSV export structure
order: 1
---

# Free Tier Export Format

Your free tier export is a clean, normalized CSV ready for any tax software.

## What You Get

- ✅ Normalized dates and times
- ✅ Standardized asset symbols
- ✅ Cleaned transaction types
- ✅ Fee tracking for deductions
- ✅ Basic cost basis calculations
- ✅ Tax flagging (without annotations)

## File Naming

Your download is named:

```
{EXCHANGE}_formatted_{DATE}.csv
```

**Examples:**
- `binance_formatted_2025-12-27.csv`
- `coinbase_formatted_2025-12-27.csv`
- `kraken_formatted_2025-12-27.csv`

This naming prevents overwrites and clearly identifies the source.

## CSV Columns

Your free tier export includes:

| Column | Purpose | Example |
|--------|---------|---------|
| **Date** | Normalized timestamp | 2025-01-15 14:30:00 |
| **Pair** | Asset pair | BTC/USD |
| **Type** | Transaction type | BUY, SELL, DEPOSIT |
| **Amount** | Quantity | 0.5 |
| **Price** | Per-unit price | 42500 |
| **Fee** | Transaction fee | 12.75 |
| **Total** | Amount × Price + Fee | 21262.75 |
| **Cost Basis** | Per-unit cost | 42525.50 |
| **Notes** | Flags only | [FLAG: Wash Sale] |

## Example Free Tier Export

```csv
Date,Pair,Type,Amount,Price,Fee,Total,Cost Basis,Notes
2025-01-15 14:30:00,BTC/USD,BUY,0.5,42500,12.75,21262.75,42525.50,
2025-01-20 09:15:00,BTC/USD,SELL,0.5,45000,22.50,22477.50,42525.50,[FLAG: Wash Sale]
2025-02-01 16:45:00,ETH/USD,BUY,5,2250,50.00,11300.00,2260.00,
2025-02-10 11:20:00,ETH/USD,SELL,5,2300,50.00,11450.00,2260.00,
2025-03-15 08:00:00,ETH/USD,STAKING,0.125,2400,0.00,300.00,2400.00,[FLAG: Ordinary Income]
```

## How to Import to Tax Software

### TurboTax

1. Open TurboTax → Schedule D
2. Click "Add transactions"
3. Choose "Import from CSV"
4. Select your formatted file
5. Map columns (usually automatic):
   - Date → Transaction Date
   - Amount → Shares/Units
   - Cost Basis → Cost per Share
   - Total → Total Cost
   - Price → Sales Price
6. Review and save

### Koinly

1. Log into Koinly.io
2. Go to Portfolio
3. Click "Add transactions" → "Import"
4. Choose "CSV Upload"
5. Select your formatted file
6. Choose transaction type (buy, sell, etc.)
7. Koinly will map columns
8. Review imported data

### CoinLedger

1. Log into CoinLedger
2. Go to Tax Reports
3. Click "Import" → "CSV"
4. Select your file
5. Verify column mapping
6. Select tax year
7. Import

### ZenLedger

1. Log into ZenLedger
2. Go to Transactions → "Add Transactions"
3. Choose "Bulk Import"
4. Upload your CSV
5. Map columns if needed
6. Confirm and save

## Manual Entry Alternative

If your tax software doesn't accept CSV:

1. Open spreadsheet (Excel, Google Sheets)
2. Copy and paste formatted CSV
3. Manually enter into tax software
4. Verify as you go

## What's NOT in Free Tier

❌ Adjusted cost basis for wash sales  
❌ Platform-specific column formatting  
❌ Pre-calculated capital gains  
❌ Direct software integration  
❌ Annotated issue explanations  

All of these are available in **Pro Tier** ($49).

## Free Tier Limitations

1. **Manual adjustments needed**
   - You see flags like "[FLAG: Wash Sale]"
   - You manually adjust cost basis in your software
   - Risk of errors increases

2. **Generic format**
   - Works with all platforms
   - But no platform-specific optimization

3. **Flags without context**
   - Shows the flag
   - Doesn't explain the adjustment needed
   - Requires separate research

## Example: Using Free Tier with Wash Sale

```csv
2025-01-16,BTC/USD,SELL,1,45000,25,44975,42500,[FLAG: Wash Sale]
2025-01-20,BTC/USD,BUY,1,38000,10,38010,38020,[FLAG: Wash Sale]
```

**What you do:**
1. See the flags
2. Read the wash sale doc to understand it
3. Manually calculate adjusted cost basis
4. In TurboTax, change the second buy cost basis from 38020 to 43275
5. Note the adjustment in your records

**What Pro Tier does:**
```csv
2025-01-16,BTC/USD,SELL,1,45000,25,44975,42500,WASH SALE - disallowed $2500 loss
2025-01-20,BTC/USD,BUY,1,38000,10,38010,43275,WASH SALE - cost basis adjusted +$5275
```

Cost basis already adjusted. Just import.

## Tips for Free Tier Users

1. **Download and review before importing**
   - Spot-check a few transactions
   - Verify they match exchange records

2. **Keep the original CSV**
   - Archive the file
   - Useful for future reference

3. **Document your adjustments**
   - Keep a spreadsheet of manual changes
   - Note what you changed and why
   - Save for your records

4. **Use a tax professional**
   - For complex portfolios
   - To verify your manual adjustments
   - Especially if wash sales exist

5. **Consider upgrading to Pro**
   - If you have wash sales (very common)
   - If > 100 transactions
   - If you value your time ($49 = ~1 hour of work)

## Troubleshooting Free Tier Exports

### Issue: Transaction appears twice

**Cause:** Duplicate in your original CSV  
**Fix:** Remove duplicate before uploading

### Issue: Wrong date range

**Cause:** Export settings on exchange  
**Fix:** Re-export with correct date range

### Issue: Decimal places differ

**Cause:** Rounding differences  
**Fix:** Usually acceptable (< $0.01 per transaction)

### Issue: Asset symbol unrecognized

**Cause:** Exchange uses non-standard symbol  
**Fix:** Email sample to support; we'll normalize for you

## Free Tier is Right If You:

✅ Have simple portfolio (< 100 trades)  
✅ No wash sales detected  
✅ Want to save $49  
✅ Have time for manual adjustments  
✅ Using tax software that accepts CSV  

## When to Upgrade to Pro

→ See "Free vs Pro Differences" page for details