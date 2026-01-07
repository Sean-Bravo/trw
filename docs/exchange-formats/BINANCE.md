# Binance CSV Format Validation Report

**Last Updated:** 2026-01-07
**Status:** ⚠️ Needs Update
**Priority:** HIGH

## Current Support Status

TaxFormatter currently supports Binance Spot, Margin, and Futures exports.

## Format Changes Detected (2024-2025)

### Breaking Changes

1. **Trade History Page Removed (Feb 2022)**
   - Binance removed the dedicated Trade History page
   - Only Order History export is now available
   - Format is more difficult to parse than previous trade history

2. **API Historical Access Restricted (Sept 2022)**
   - Transactions before September 2022 must be imported via CSV
   - API no longer provides historical data before this date

3. **File Size Changes**
   - Each export file can now contain up to 1 year of data (previously limited)
   - Maximum 10,000 data points per export
   - Maximum export range of 6 months per request

### Missing Data Issues

| Issue | Severity | Workaround |
|-------|----------|------------|
| Withdrawal fees missing from CSV | HIGH | Only available via API |
| Universal transfers limited to 6 months | MEDIUM | Multiple exports required |
| Deprecated account codes in API | MEDIUM | Manual mapping needed |

## Current Expected Columns

### Spot Trading History
```csv
Date(UTC),Pair,Type,Order Price,Order Amount,AvgTrading Price,Filled,Total,status
```

### Order History (Current Format)
```csv
Date(UTC),OrderNo,Pair,Type,Order Price,Order Amount,AvgTrading Price,Filled,Total,Trigger Condition,status
```

### Deposit History
```csv
Date(UTC),Coin,Amount,TransactionFee,Address,TXID,SourceAddress,PaymentID,Status
```

### Withdrawal History
```csv
Date(UTC),Coin,Amount,TransactionFee,Address,TXID,SourceAddress,PaymentID,Status,Network
```

## Column Changes Needed

| Current Parser | Actual Export | Action Required |
|----------------|---------------|-----------------|
| `Date` | `Date(UTC)` | ✅ Already mapped |
| `Pair` | `Pair` | ✅ OK |
| `Type` | `Type` | ✅ OK |
| `Amount` | `Order Amount` / `Filled` | ⚠️ Verify correct field |
| `Price` | `AvgTrading Price` | ⚠️ Was `Order Price` |
| `Fee` | Missing in Order CSV | ❌ Must calculate or fetch via API |
| `Total` | `Total` | ✅ OK |
| - | `OrderNo` | ➕ New: Add for reconciliation |
| - | `status` | ➕ New: Filter by Filled status |

## New Transaction Types to Add

| Type | Description | Tax Treatment |
|------|-------------|---------------|
| `Margin Buy` | Leveraged purchase | Capital gain on close |
| `Margin Sell` | Leveraged sale | Capital gain on close |
| `Liquidation` | Forced position close | Capital loss |
| `Funding Fee` | Futures funding payment | Income/Expense |
| `Realized PNL` | Futures profit/loss | Capital gain/loss |
| `Commission Rebate` | Trading fee rebate | Income |
| `BNB Vault Rewards` | BNB staking rewards | Income |
| `Launchpool` | Token farming rewards | Income |
| `Simple Earn` | Flexible savings interest | Income |
| `ETH 2.0 Staking` | ETH staking rewards | Income |
| `Auto-Invest` | DCA purchase | Standard buy |
| `Convert` | Asset conversion | Taxable trade |

## Validation Errors Found

1. **Fee Calculation Issue**
   - Binance Order History CSV does not include fee column
   - Fees must be calculated from `Filled` × commission rate OR fetched via API
   - Current parser may show $0 fees incorrectly

2. **Futures Data Inconsistency**
   - Futures PNL not properly categorized
   - Funding fees mixed with trading fees

3. **NFT Transactions**
   - Binance NFT exports have separate format
   - Not currently supported

## Recommended Updates

### Immediate (P0)
- [ ] Add fee calculation fallback when column missing
- [ ] Map `AvgTrading Price` to `Price` field
- [ ] Filter only `Filled` status orders

### Short-term (P1)
- [ ] Add `Margin Buy/Sell` transaction types
- [ ] Add `Liquidation` handling
- [ ] Add `Realized PNL` for futures

### Medium-term (P2)
- [ ] Support NFT transaction exports
- [ ] Add `Launchpool`, `Simple Earn` income types
- [ ] Support `Auto-Invest` DCA transactions

## Test Files Needed

- [ ] `binance-spot-2025.csv` - Current spot format
- [ ] `binance-futures-2025.csv` - Current futures format
- [ ] `binance-margin-2025.csv` - Current margin format
- [ ] `binance-deposits-2025.csv` - Current deposit format
- [ ] `binance-withdrawals-2025.csv` - Current withdrawal format

## References

- [Binance Export Guide](https://www.binance.com/en/support/faq)
- [Binance CSV Common Issues - Koinly](https://help.koinly.io/en/articles/5619222-binance-common-issues-with-csv)
- [CoinTracking Binance Import](https://cointracking.freshdesk.com/en/support/solutions/articles/29000037301-binance-com-com-import-overview-and-restrictions)
