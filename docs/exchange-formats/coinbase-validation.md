# Coinbase CSV Export Format Validation

> **Last Updated:** January 2025
> **Research Date:** January 7, 2026

## Official Export Path

### Standard Coinbase (Current Method)

**Primary Path:** Profile Icon > Manage Account > Statements > Transactions > Generate Custom Statement

**Step-by-step:**
1. Sign in to Coinbase at https://accounts.coinbase.com/
2. Click the profile icon in the top right corner
3. Click "Manage Account"
4. Select "Statements" tab on the left sidebar
5. Select "Transactions" (NOT "Futures" or "Other" tabs)
6. Under "Generate custom statement":
   - Asset: All assets
   - Transaction type: All transactions
   - Date: Custom (select full date range)
   - Format: CSV
7. Click "Generate"

**Important:** Do NOT use the "Taxes" section for CSV export - the format is different and may not be compatible with import tools.

---

## CSV Column Headers

### Standard Coinbase Transaction Export

| Column # | Header Name | Description |
|----------|-------------|-------------|
| 1 | **Timestamp** | Date and time of transaction |
| 2 | **Transaction Type** | Type of transaction (Buy, Sell, Send, Receive, etc.) |
| 3 | **Asset** | Cryptocurrency symbol (BTC, ETH, etc.) |
| 4 | **Quantity Transacted** | Amount of cryptocurrency |
| 5 | **Spot Price Currency** | Currency for spot price (usually USD) |
| 6 | **Spot Price at Transaction** | Price of asset at transaction time |
| 7 | **Subtotal** | Amount before fees |
| 8 | **Total (inclusive of fees and/or spread)** | Final amount including all fees |
| 9 | **Fees and/or Spread** | Transaction fees charged |
| 10 | **Notes** | Additional transaction details |

**Full Header Line:**
```
Timestamp,Transaction Type,Asset,Quantity Transacted,Spot Price Currency,Spot Price at Transaction,Subtotal,Total (inclusive of fees and/or spread),Fees and/or Spread,Notes
```

### Alternative USD-Specific Format

Some exports may use this simplified format:
```
Timestamp,Transaction Type,Asset,Quantity Transacted,USD Spot Price at Transaction,USD Subtotal,USD Total (inclusive of fees),USD Fees,Notes
```

---

## Coinbase Pro / Advanced Trade Export Format

### Status Note
> **Coinbase Pro was deprecated on December 1, 2023.** All users have been migrated to Coinbase Advanced Trade. Historical Coinbase Pro data can still be downloaded from the website, but API access is no longer available.

### Coinbase Pro Fills Export Columns

| Column # | Header Name | Description |
|----------|-------------|-------------|
| 1 | **portfolio** | Account/portfolio name |
| 2 | **trade id** | Unique trade identifier |
| 3 | **product** | Trading pair (e.g., BTC-USD) |
| 4 | **side** | Buy or Sell |
| 5 | **created at** | Timestamp of trade |
| 6 | **size** | Amount traded |
| 7 | **size unit** | Asset symbol |
| 8 | **price** | Execution price |
| 9 | **fee** | Trading fee |
| 10 | **total** | Total transaction value |
| 11 | **price/fee/total unit** | Currency for monetary values |

**Full Header Line (Coinbase Pro Fills):**
```
portfolio,trade id,product,side,created at,size,size unit,price,fee,total,price/fee/total unit
```

### How to Export Coinbase Pro Data (Legacy)

1. Log in to Coinbase
2. Navigate to Coinbase Pro Statements page
3. Select "Filled" orders under My Orders
4. Click "Download statements"
5. Select "All Products" from Product dropdown
6. Choose "Custom Time Range"
7. Select CSV format (not PDF)
8. Click "GENERATE REPORT"
9. Report will be emailed to you

**Note:** Exports are limited to one-year increments.

### Required Exports for Complete History
- **Fills Report** - All executed trades
- **Account Report** - Deposits, withdrawals, transfers

---

## Timestamp Format

### Format Specification
- **Standard:** ISO 8601 format
- **Timezone:** UTC (Coordinated Universal Time)
- **Suffix:** `Z` indicates UTC timezone

### Examples
```
2024-02-25T03:11:42.164Z
2024-12-31T23:59:59.000Z
2025-01-15T14:30:00Z
```

### Format Pattern
```
YYYY-MM-DDTHH:MM:SS.sssZ
```

Where:
- `YYYY` = 4-digit year
- `MM` = 2-digit month (01-12)
- `DD` = 2-digit day (01-31)
- `T` = Date/time separator
- `HH` = 2-digit hour (00-23)
- `MM` = 2-digit minute (00-59)
- `SS` = 2-digit second (00-59)
- `.sss` = Milliseconds (optional)
- `Z` = UTC timezone indicator

---

## Recent Format Changes (2024-2025)

### Confirmed Changes

1. **Coinbase Pro Deprecation (December 1, 2023)**
   - All users migrated to Coinbase Advanced Trade
   - API access to Pro endpoints discontinued
   - Web-based CSV export still available for historical data

2. **Advanced Trade Integration (2024)**
   - Coinbase and Coinbase Pro treated as separate exchanges prior to 2024
   - Post-migration, unified export available via standard Coinbase statements
   - API now supports 'advanced trade' transactions

3. **Network Field Addition (2024)**
   - New `network` field added for multi-chain support
   - Supports withdrawals on Solana, Polygon networks
   - Affects certain API endpoints and UI exports

### No Major CSV Schema Changes
As of January 2025, no major changes to the core CSV column structure have been documented. The 10-column format for standard exports remains consistent.

---

## Comparison Against Expected Columns

### Expected Columns (from requirements)
| Expected | Status | Coinbase Equivalent |
|----------|--------|---------------------|
| Timestamp | **MATCH** | `Timestamp` |
| Type | **MATCH** | `Transaction Type` |
| Currency | **PARTIAL** | `Asset` (crypto only, not fiat) |
| Amount | **MATCH** | `Quantity Transacted` |
| Total | **MATCH** | `Total (inclusive of fees and/or spread)` |
| Fee | **MATCH** | `Fees and/or Spread` |

### Discrepancies Flagged

| Issue | Severity | Details |
|-------|----------|---------|
| Column naming differs | LOW | "Type" vs "Transaction Type", "Currency" vs "Asset" |
| Additional columns present | INFO | Coinbase includes `Spot Price Currency`, `Spot Price at Transaction`, `Subtotal`, `Notes` |
| Currency vs Asset | MEDIUM | Coinbase uses "Asset" for cryptocurrency symbol; doesn't include fiat currency as separate column |
| Fee column naming | LOW | "Fee" vs "Fees and/or Spread" |
| Spot price columns | INFO | Extra pricing context not in expected schema |

### Column Mapping for Import

```javascript
const COINBASE_COLUMN_MAP = {
  'Timestamp': 'Timestamp',
  'Transaction Type': 'Type',
  'Asset': 'Currency',
  'Quantity Transacted': 'Amount',
  'Total (inclusive of fees and/or spread)': 'Total',
  'Fees and/or Spread': 'Fee',
  // Additional Coinbase columns (not in expected schema):
  // - Spot Price Currency
  // - Spot Price at Transaction
  // - Subtotal
  // - Notes
};
```

---

## Validation Rules

### Required Fields
All exports must contain:
- `Timestamp` - Cannot be empty
- `Transaction Type` - Must be valid type
- `Asset` - Valid cryptocurrency symbol
- `Quantity Transacted` - Numeric value

### Valid Transaction Types
- `Buy`
- `Sell`
- `Send`
- `Receive`
- `Convert`
- `Rewards Income`
- `Coinbase Earn`
- `Learning Reward`
- `Staking Income`
- `Inflation Reward`

### Common Issues

1. **Excel Corruption** - Opening CSV in Excel before import may alter headers/formatting
2. **Preamble Text** - CSV may contain non-CSV text at top of file that needs stripping
3. **Date Format Changes** - Excel may reformat timestamps
4. **Large Files** - Files over 2,251 transactions may have compatibility issues with some tax software

---

## Sources

- [Coinbase Blog - Export Transaction History](https://www.coinbase.com/blog/you-can-now-export-your-transaction-history)
- [CoinTracking - Coinbase Import Guide](https://cointracking.info/import/coinbase/)
- [CoinTracking - Coinbase Pro Import Guide](https://cointracking.info/import/coinbasepro/index.php)
- [CoinLedger - Coinbase File Import Guide](https://help.coinledger.io/en/articles/2535264-coinbase-file-import-guide)
- [Coinbase Developer Documentation](https://docs.cdp.coinbase.com/)
- [TaxBit - Coinbase Pro CSV Guide](https://help.taxbit.com/hc/en-us/articles/4415598353303-Coinbase-Pro-CSV-Guide)
