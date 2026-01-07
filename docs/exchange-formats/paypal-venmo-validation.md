# PayPal and Venmo Crypto CSV Export Format Validation

> **Research Date:** January 2026
> **Status:** Validated with discrepancies noted

## Table of Contents

- [Overview](#overview)
- [PayPal Crypto Export](#paypal-crypto-export)
- [Venmo Crypto Export](#venmo-crypto-export)
- [Format Comparison](#format-comparison)
- [Discrepancies and Variations](#discrepancies-and-variations)
- [Implementation Notes](#implementation-notes)

---

## Overview

This document validates the CSV export formats for cryptocurrency transactions on PayPal and Venmo. Both platforms are owned by PayPal Holdings but use **different CSV formats** for their exports.

### Key Finding

**PayPal and Venmo do NOT use identical formats.** While both platforms export CSV files, the column structures, naming conventions, and available fields differ significantly.

---

## PayPal Crypto Export

### Export Path

```
Activity → Statements → Custom → Transactions → CSV
```

Alternative paths:
- `Reports → Activity download → Transaction type: Balance affecting → CSV`
- `Settings → Data and Privacy → Download your data`

### Available CSV Files for Crypto

1. **Transaction Statement (CSV)** - Recommended for tax software import
2. **Gains and Losses Statement (CSV)** - For tax reference only, not importable to most software

### Standard Activity Download Columns

| Column | Mandatory | Description |
|--------|-----------|-------------|
| Date | Yes | Transaction date |
| Time | Yes | Transaction time |
| TimeZone | Yes | Timezone of transaction |
| Name | Yes | Counterparty name |
| Type | Yes | Transaction type label |
| Status | Yes | Completed, Pending, etc. |
| Currency | Yes | Currency code (USD, BTC, ETH, etc.) |
| Gross | Yes | Gross amount |
| Fee | Yes* | Transaction fee (*business accounts only) |
| Net | Yes | Net amount after fees |
| From Email Address | Yes | Sender email |
| To Email Address | Yes | Recipient email |
| Transaction ID | Yes | Unique transaction identifier |
| Reference Txn ID | Yes | Reference transaction ID |
| Receipt ID | Yes | Receipt identifier |

### Crypto Transaction Statement Columns

| Column | Description |
|--------|-------------|
| Transaction Date | Date of crypto acquisition/sale |
| Quantity | Amount of cryptocurrency |
| Fees | Transaction fees |
| Value | USD value at time of transaction |
| Transaction ID | Unique identifier |

### Gains and Losses Statement Columns

| Column | Description |
|--------|-------------|
| Date Acquired | Original purchase date |
| Date Sold | Sale date |
| Asset | Cryptocurrency type |
| Quantity | Amount sold |
| Proceeds | Sale proceeds |
| Cost Basis | Original cost (HIFO method) |
| Gain (or Loss) | Calculated gain/loss |
| Tax Year | Applicable tax year |

### Crypto Transaction Type Labels

**Expected values in Type column:**
- `Cryptocurrency Purchase` - Buying crypto
- `Cryptocurrency Sale` - Selling crypto
- `Crypto Transfer` - Sending/receiving crypto
- `Checkout with Crypto` - Using crypto for payment

> **Note:** Exact type labels may vary. PayPal's CSV format has been reported as inconsistent across different account types and time periods.

### Personal vs Business Account Differences

| Feature | Personal Account | Business Account |
|---------|------------------|------------------|
| Fee Column | Not included | Included |
| Gross/Net Split | Single "Amount" column | Separate Gross/Fee/Net |
| Available Columns | ~10 columns | 40+ columns available |

---

## Venmo Crypto Export

### Export Path

```
Statements → Select Year → Transactions Statement (CSV) → Download CSV
```

For crypto-specific tax documents:
```
Tax Documents → Tax Year → Transactions Statement (CSV)
```

### CSV Column Structure

| Column | Description |
|--------|-------------|
| ID | Unique transaction identifier |
| Datetime | Combined date/time (format: `YYYY-MM-DDTHH:mm:ss`) |
| Type | Transaction type |
| Status | Transaction status |
| Note | Transaction description/memo |
| From | Sender |
| To | Recipient |
| Amount (total) | Transaction amount |
| Amount (tip) | Tip amount (if applicable) |
| Amount (tax) | Tax amount (if applicable) |
| Amount (fee) | Fee amount |
| Funding Source | Payment method |
| Destination | Where funds went |
| Beginning Balance | Balance before transaction |
| Ending Balance | Balance after transaction |
| Statement Period Venmo Fees | Fees for statement period |
| Terminal Location | Location (if applicable) |
| Year to Date Venmo Fees | YTD fees |
| Disclaimer | Legal text (last row) |

### Transaction Type Values

| Type Value | Description |
|------------|-------------|
| Payment | Money sent directly (negative = you paid) |
| Charge | Money requested and accepted (negative = you were charged) |
| Standard Transfer | Bank transfer |
| Crypto Purchase | Buying cryptocurrency |
| Crypto Sale | Selling cryptocurrency |

### Date/Time Format Difference

**Critical:** Venmo uses a combined `Datetime` column with ISO 8601 format (`2024-03-25T23:28:44`), while PayPal uses separate `Date`, `Time`, and `TimeZone` columns.

### Export Limitations

- Maximum 90 days per download through standard UI
- URL hack available for up to 1 year:
  ```
  https://account.venmo.com/api/statement/download?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&csv=true
  ```

---

## Format Comparison

### Column Mapping: Expected vs Actual

| Expected Column | PayPal Activity | PayPal Crypto | Venmo |
|-----------------|-----------------|---------------|-------|
| Date | `Date` | `Transaction Date` | Part of `Datetime` |
| Time | `Time` | N/A | Part of `Datetime` |
| Type | `Type` | N/A | `Type` |
| Status | `Status` | N/A | `Status` |
| Currency | `Currency` | Asset type in separate column | In amount context |
| Gross | `Gross` | `Value` | `Amount (total)` |
| Fee | `Fee` | `Fees` | `Amount (fee)` |
| Net | `Net` | Calculated | Calculated |

### Key Structural Differences

| Feature | PayPal | Venmo |
|---------|--------|-------|
| Date/Time Format | Separate columns | Combined ISO 8601 |
| Timezone | Explicit column | Implicit (user's timezone) |
| Fee Breakdown | Single fee column | Multiple fee columns |
| Balance Tracking | Optional `Balance` column | `Beginning/Ending Balance` |
| Crypto-Specific File | Separate Transaction Statement | Integrated with main CSV |

---

## Discrepancies and Variations

### Confirmed Discrepancies from Expected Format

1. **Date/Time Separation**
   - Expected: Separate `Date` and `Time` columns
   - Venmo Actual: Combined `Datetime` column
   - **Impact:** Requires parsing for separate date/time values

2. **Venmo Missing Columns**
   - Expected: `Currency` column
   - Actual: Currency context embedded in other fields
   - **Impact:** Need to infer currency from transaction context

3. **Fee Column Naming**
   - Expected: `Fee`
   - PayPal Actual: `Fee` (business) or not present (personal)
   - Venmo Actual: `Amount (fee)`

4. **Net Column**
   - Expected: `Net`
   - Venmo Actual: Must be calculated from `Amount (total)` - `Amount (fee)`

### PayPal-Specific Variations

1. **Personal Account Limitations**
   - Fee column absent
   - Reduced column set (~10 vs 40+)

2. **CSV Format Inconsistency**
   - Headers may vary between export dates
   - Some users report up to 100+ columns in full data export

3. **Crypto Transaction Statement**
   - Separate file from main activity download
   - Different column structure than standard export

### Venmo-Specific Variations

1. **Crypto vs Regular Transactions**
   - Same CSV file, different Type values
   - No separate crypto-only export option

2. **Gains and Losses Statement**
   - **Warning:** Cannot be imported to tax software
   - Use Transaction Statement CSV instead

---

## Implementation Notes

### Parsing Recommendations

```javascript
// PayPal: Parse separate date/time
const paypalDate = row['Date'];  // "03/25/2024"
const paypalTime = row['Time'];  // "14:30:45"
const paypalTz = row['TimeZone']; // "PST"

// Venmo: Parse combined datetime
const venmoDatetime = row['Datetime'];  // "2024-03-25T14:30:45"
const [date, time] = venmoDatetime.split('T');
```

### Type Label Detection

```javascript
// PayPal crypto types
const paypalCryptoTypes = [
  'Cryptocurrency Purchase',
  'Cryptocurrency Sale',
  'Crypto Transfer',
  'Checkout with Crypto'
];

// Venmo crypto types
const venmoCryptoTypes = [
  'Crypto Purchase',
  'Crypto Sale'
];
```

### Validation Checklist

- [ ] Handle missing Fee column (PayPal personal accounts)
- [ ] Parse combined Datetime (Venmo)
- [ ] Support separate Date/Time/TimeZone (PayPal)
- [ ] Handle Amount (fee) vs Fee naming
- [ ] Calculate Net when not provided (Venmo)
- [ ] Detect crypto transaction types for both platforms

---

## Sources

- [PayPal Activity Download Report Documentation](https://developer.paypal.com/docs/reports/online-reports/activity-download/)
- [PayPal View and Download Statements](https://www.paypal.com/us/cshelp/article/how-do-i-view-and-download-statements-and-reports-help145)
- [Venmo Transaction History](https://help.venmo.com/cs/articles/transaction-history-vhel281)
- [Venmo Crypto Tax Documentation](https://help.venmo.com/hc/en-us/articles/1500003317961-Taxes-for-Cryptocurrency-on-Venmo)
- [CoinLedger Venmo Import Guide](https://help.coinledger.io/en/articles/5964845-venmo-file-import-guide)
- [CoinLedger PayPal Import Guide](https://help.coinledger.io/en/articles/6531809-paypal-file-import-guide)
- [Koinly PayPal Crypto Taxes](https://koinly.io/blog/paypal-crypto-taxes/)

---

## Summary

| Aspect | Status |
|--------|--------|
| Expected columns present | Partial - variations exist |
| PayPal/Venmo format identical | **No** - significantly different |
| Crypto type labels documented | Yes - with platform-specific values |
| Column name variations | **Flagged** - see discrepancies section |

**Key Takeaway:** Separate parsing logic is required for PayPal and Venmo CSV files. The formats are not interchangeable despite both platforms being owned by PayPal Holdings.
