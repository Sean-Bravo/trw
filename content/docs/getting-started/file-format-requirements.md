---
title: File Format Requirements
description: CSV structure and requirements for TaxFormatter
order: 3
---

# File Format Requirements

## What We Accept

- **File type:** CSV (Comma-Separated Values)
- **File size:** Up to 50MB
- **Rows:** Up to 100,000 transactions
- **Encoding:** UTF-8 preferred (we auto-detect)

## CSV Structure

Your CSV should have columns like:

```
Date,Pair,Type,Amount,Price,Fee,Total
2025-01-15,BTC/USD,BUY,0.5,42500,12.75,21262.75
2025-01-16,ETH/USD,SELL,5,2250,25.00,11225.00
```

## Required Columns

At minimum, your CSV must have:

| Column | Example | Notes |
|--------|---------|-------|
| **Date** | 2025-01-15 | When the trade happened |
| **Pair/Symbol** | BTC/USD or BTC | What was traded |
| **Type** | BUY, SELL, DEPOSIT | Transaction type |
| **Amount** | 0.5 | Quantity of asset |

## Optional But Helpful

- **Price** - Unit price per asset
- **Fee** - Transaction fee
- **Total** - Total cost (Amount × Price + Fee)
- **Order ID** - Unique identifier

## Date Formats Supported

TaxFormatter accepts multiple date formats:

- `2025-01-15` (ISO 8601)
- `01/15/2025` (US format)
- `15-01-2025` (EU format)
- `01-15-2025` (Alternative US)
- `2025-01-15 14:30:00` (With time)

## Transaction Types

Common types we recognize:

- **BUY** - Purchase of asset
- **SELL** - Sale of asset
- **DEPOSIT** - Funds into exchange
- **WITHDRAWAL** - Funds out of exchange
- **TRADE** - Exchange between assets
- **TRANSFER** - Move between accounts
- **STAKING** - Staking rewards
- **AIRDROP** - Airdrop or bonus

## What We Don't Accept

- Excel files (.xlsx, .xls) - **Convert to CSV first**
- JSON, XML, or other formats
- PDFs or images
- Files larger than 50MB
- Files with more than 100K rows
- Files with special characters in headers

## How to Convert Excel to CSV

1. Open your Excel file
2. Go to **File** → **Save As**
3. Select **CSV (Comma-delimited)** format
4. Save and upload

## Common Issues & Fixes

### "File Format Not Recognized"

Check:
- File extension is `.csv` (not `.xlsx`)
- File opens in a text editor and shows comma separation
- No binary characters or formatting
- Encoding is UTF-8

### "No Transactions Found"

Verify:
- Column headers exist in row 1
- Data starts in row 2
- Required columns present (Date, Pair, Type, Amount)
- No empty rows at top

### "Unrecognized Exchange Format"

If we can't auto-detect your exchange:
- Try exporting again with default settings
- Email sample to support@taxformatter.com
- We may need to add custom support

### "Special Characters Breaking Parser"

Solution:
- Open CSV in text editor
- Save as UTF-8 encoding
- Remove any non-standard quotes or symbols
- Re-upload

## Example Valid CSVs

### Binance Format
```
Date(UTC),Pair,Type,Amount,Price,Fee,Total
2025-01-15 14:30:00,BTC/USDT,BUY,0.5,42500,10.75,21250.25
```

### Coinbase Format
```
Timestamp,Product,Side,Amount,Price,Fee
2025-01-15T14:30:00Z,BTC-USD,BUY,0.5,42500,10
```

### Generic Format
```
Date,Asset,Action,Quantity,UnitPrice,TransactionFee
2025-01-15,BTC,BUY,0.5,42500,10.75
```

All these formats work with TaxFormatter!