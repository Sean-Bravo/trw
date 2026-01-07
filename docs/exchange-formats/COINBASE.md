# Coinbase CSV Format Validation Report

**Last Updated:** 2026-01-07
**Status:** ⚠️ Needs Update
**Priority:** CRITICAL

## Current Support Status

TaxFormatter currently supports Coinbase (all account types).

## Format Changes Detected (2024-2025)

### Breaking Changes

1. **Form 8949 Removed from Tax Center (2025)**
   - Form 8949 is no longer available through Coinbase Retail Tax Center
   - Users must subscribe to CoinTracker or use external tools
   - TaxFormatter must fill this gap

2. **New 1099-DA Reporting (Starting Jan 1, 2025)**
   - Coinbase required to report gross proceeds to IRS
   - Cost basis reporting starts January 1, 2026
   - CSV exports may include new columns for compliance

3. **Coinbase Pro Deprecated (Migrated to Advanced Trade)**
   - Coinbase Pro format differs from standard Coinbase
   - Pro exports NOT compatible with TurboTax directly
   - Must handle both legacy Pro and new Advanced Trade formats

### CSV Header Compatibility Issues

Users report: "CSV headers are not what TurboTax expects for the columns"

| Expected (TurboTax) | Actual (Coinbase) | Impact |
|---------------------|-------------------|--------|
| `Date Acquired` | `Timestamp` | Parsing fails |
| `Date Sold` | `Timestamp` | Requires split logic |
| `Proceeds` | `Total (inclusive of fees)` | Column mismatch |
| `Cost Basis` | Not provided | Must calculate |

## Current Expected Columns

### Standard Coinbase Export
```csv
Timestamp,Transaction Type,Asset,Quantity Transacted,Spot Price Currency,Spot Price at Transaction,Subtotal,Total (inclusive of fees and/or spread),Fees and/or Spread,Notes
```

### Coinbase Pro / Advanced Trade Export
```csv
portfolio,trade id,product,side,created at,size,size unit,price,fee,total,price/fee/total unit
```

### Coinbase Wallet Export
```csv
Timestamp,Transaction Type,Token,Quantity,USD Equivalent,Network Fee,Network,To/From Address,Transaction Hash
```

## Column Changes Needed

| Current Parser | Actual Export | Action Required |
|----------------|---------------|-----------------|
| `Timestamp` | `Timestamp` | ✅ OK |
| `Transaction Type` | `Transaction Type` | ✅ OK |
| `Asset` | `Asset` | ✅ OK |
| `Amount` | `Quantity Transacted` | ⚠️ Verify mapping |
| `Price` | `Spot Price at Transaction` | ✅ OK |
| `Fee` | `Fees and/or Spread` | ✅ OK |
| `Total` | `Total (inclusive of fees)` | ✅ OK |
| - | `Subtotal` | ➕ New: Useful for verification |
| - | `Notes` | ➕ New: Parse for additional context |

### Pro/Advanced Trade Columns
| Field | Mapping | Notes |
|-------|---------|-------|
| `created at` | `Timestamp` | Different format |
| `side` | `Transaction Type` | `buy`/`sell` lowercase |
| `product` | `Asset` | Format: `BTC-USD` |
| `size` | `Amount` | Quantity |
| `price` | `Price` | Unit price |
| `fee` | `Fee` | Transaction fee |
| `total` | `Total` | Net amount |

## New Transaction Types to Add

| Type | Description | Tax Treatment |
|------|-------------|---------------|
| `Learning Reward` | Coinbase Earn rewards | Income |
| `Coinbase Earn` | Educational rewards | Income |
| `Staking Income` | Staking rewards | Income |
| `Inflation Reward` | Protocol inflation | Income |
| `Advanced Trade Buy` | New trading format | Standard buy |
| `Advanced Trade Sell` | New trading format | Standard sell |
| `Rewards Income` | Card/other rewards | Income |
| `Send` | Outbound transfer | Track cost basis |
| `Receive` | Inbound transfer | Needs cost basis input |
| `Convert` | Asset-to-asset swap | Taxable event |
| `Coinbase One Rewards` | Subscription benefits | Income |

## Validation Errors Found

1. **Date Format Inconsistency**
   - Sample data shows mixed formats: ISO and MM/DD/YYYY
   - Parser must handle both gracefully

2. **Cost Basis Not Provided**
   - Coinbase exports don't include cost basis for sells
   - TaxFormatter must track or calculate from buys

3. **Spread Hidden in Fees**
   - "Fees and/or Spread" combines both
   - May overstate deductible fees

4. **Missing Wallet Transactions**
   - Coinbase Wallet exports separate from main Coinbase
   - DeFi transactions may be missing

## Recommended Updates

### Immediate (P0)
- [ ] Add Coinbase Pro / Advanced Trade format detection
- [ ] Handle lowercase `buy`/`sell` transaction types
- [ ] Add `Learning Reward` and `Coinbase Earn` types
- [ ] Improve date format detection

### Short-term (P1)
- [ ] Add cost basis tracking/calculation
- [ ] Parse `Notes` field for additional context
- [ ] Add `Convert` transaction handling
- [ ] Support Coinbase Wallet format

### Medium-term (P2)
- [ ] Prepare for 1099-DA format changes (2026)
- [ ] Add Coinbase One rewards support
- [ ] DeFi transaction categorization

## Test Files Needed

- [x] `sample-before-coinbase.csv` - ✅ Exists in `/public/samples/`
- [ ] `coinbase-pro-2025.csv` - Pro format testing
- [ ] `coinbase-advanced-trade-2025.csv` - New format
- [ ] `coinbase-wallet-2025.csv` - Wallet transactions

## Sample Data Analysis

Existing sample file (`/public/samples/sample-before-coinbase.csv`) contains:
- 21 transactions with varied formats
- Inconsistent dates (ISO vs MM/DD/YYYY) - **NEEDS FIX**
- Missing values in some rows
- Multiple transaction types present

## References

- [Coinbase Tax Reports](https://help.coinbase.com/en/coinbase/taxes/forms-reports/download-report)
- [Coinbase 2025 Tax Changes](https://www.coinbase.com/learn/crypto-taxes/whats-new-crypto-tax-regulation)
- [TurboTax Coinbase CSV Issues](https://ttlc.intuit.com/community/taxes/discussion/coinbase-csv-file-not-compatible-on-turbotax-no-headers-found-in-this-file-error/00/1820285)
