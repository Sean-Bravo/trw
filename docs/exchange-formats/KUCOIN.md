# KuCoin CSV Format Validation Report

**Last Updated:** 2026-01-07
**Status:** ⚠️ Needs Update
**Priority:** MEDIUM

## Current Support Status

TaxFormatter currently supports KuCoin Spot Trading exports.

## Format Changes Detected (2024-2025)

### Breaking Changes

1. **Export Time Limits**
   - Deposit/withdrawal history limited to 100 days per export
   - Must export multiple times for full history
   - Maximum 5 exports per day limit

2. **Pre-2019 History Unavailable**
   - Users trading before 2019 must request CSV from support
   - Not available via website or API
   - May cause incomplete tax records

3. **API Data Limitations**
   - API only provides last 1 year of most transaction types
   - Historical data before 1 year requires CSV import
   - Some transaction types have even shorter windows

4. **EU Reporting Requirements (2026)**
   - Starting January 1, 2026, KuCoin must report to EU tax authorities
   - May affect CSV format for compliance

### Data Discrepancy Issues

| Account Type | Issue | Impact |
|--------------|-------|--------|
| Margin Account | Snapshots exclude borrowed assets | Incorrect balance |
| Margin Account | Lent assets included in snapshots | May confuse holdings |
| Futures Account | Unrealized PNL not in snapshots | Incomplete picture |

## Current Expected Columns

### Spot Trade History
```csv
UID,Account Type,Order ID,Symbol,Side,Order Type,Order Price,Avg. Filled Price,Order Size,Filled Size,Filled Amount(USDT),Fee,Fee Currency,Status,Order Time
```

### Deposit History
```csv
Time,Coin,Network,Amount,Type,Wallet,Remark,Status
```

### Withdrawal History
```csv
Time,Coin,Network,Amount,Type,Wallet Address,Memo,Fee,Status
```

### All-in-One Statement
```csv
uid,time,type,symbol,direction,tradeId,orderId,amount,fee,feeCurrency,size,filledAmount,realizedPnl
```

## Column Changes Needed

| Current Parser | Actual Export | Action Required |
|----------------|---------------|-----------------|
| `Time` | `Order Time` / `Time` | ⚠️ Multiple formats |
| `Symbol` | `Symbol` | ✅ OK |
| `Side` | `Side` | ✅ OK (BUY/SELL) |
| `Amount` | `Order Size` / `Filled Size` | ⚠️ Use `Filled Size` |
| `Price` | `Avg. Filled Price` | ⚠️ Was `Order Price` |
| `Fee` | `Fee` | ✅ OK |
| - | `Fee Currency` | ➕ New: Track fee asset |
| - | `Filled Amount(USDT)` | ➕ New: USD value |
| - | `Status` | ➕ Filter by `deal` status |

## New Transaction Types to Add

| Type | Description | Tax Treatment |
|------|-------------|---------------|
| `MARGIN_TRADE` | Margin trading | Capital gain on close |
| `LENDING` | Crypto lending | Income (interest) |
| `REDEMPTION` | Lending redemption | Return of principal |
| `FUTURES_TRADE` | Futures trading | Capital gain/loss |
| `FUNDING_FEE` | Futures funding | Income/Expense |
| `REALIZED_PNL` | Futures profit/loss | Capital gain/loss |
| `POOL-X` | Staking via Pool-X | Income |
| `SOFT_STAKING` | Flexible staking rewards | Income |
| `KCS_BONUS` | KCS holding bonus | Income |
| `SPOTLIGHT` | Token sale participation | Standard buy |
| `DUST_CONVERSION` | Small balance conversion | Taxable trade |
| `GRID_TRADING` | Grid bot profits | Capital gain |
| `DCA` | Auto-invest purchase | Standard buy |

## Validation Errors Found

1. **Export Fragmentation**
   - 100-day limit forces multiple exports
   - Risk of gaps or overlaps in data
   - Must handle duplicate detection

2. **Pre-2019 Data Gap**
   - Early users may have incomplete records
   - No automated way to retrieve old data
   - Must warn users about limitations

3. **Margin Data Accuracy**
   - Borrowed assets not reflected in CSV
   - May show misleading cost basis
   - Interest payments may be missing

4. **Fee Currency Handling**
   - Fees paid in different currencies (KCS, trade asset)
   - Must convert to USD for reporting
   - KCS discount complicates fee calculation

## Recommended Updates

### Immediate (P0)
- [ ] Use `Filled Size` and `Avg. Filled Price` (not order values)
- [ ] Filter by `Status = deal` (completed orders only)
- [ ] Add duplicate detection for multi-export imports
- [ ] Add warning for pre-2019 accounts

### Short-term (P1)
- [ ] Add `Fee Currency` handling and conversion
- [ ] Add `LENDING` / `REDEMPTION` types
- [ ] Add `POOL-X` staking support
- [ ] Add `KCS_BONUS` income detection

### Medium-term (P2)
- [ ] Add Futures trading support
- [ ] Add Grid Trading bot support
- [ ] Add margin interest tracking
- [ ] Prepare for 2026 EU reporting requirements

## Test Files Needed

- [ ] `kucoin-spot-2025.csv` - Current spot format
- [ ] `kucoin-deposits-2025.csv` - Deposit format
- [ ] `kucoin-withdrawals-2025.csv` - Withdrawal format
- [ ] `kucoin-lending-2025.csv` - Lending history
- [ ] `kucoin-futures-2025.csv` - Futures format

## Export Instructions for Users

1. Log in to KuCoin website (not app)
2. Go to Orders → Spot Orders → Trade History
3. Select date range (max 100 days for deposits/withdrawals)
4. Choose CSV format (not XLSX)
5. Repeat for each 100-day period as needed

**Note:** For accounts created before 2019, contact KuCoin support for historical data.

## References

- [KuCoin Export Guide](https://www.kucoin.com/support/14047696578841)
- [KuCoin Tax Reporting - Koinly](https://koinly.io/integrations/kucoin/)
- [KuCoin CSV Guide - TaxBit](https://help.taxbit.com/hc/en-us/articles/4416469705239-KuCoin-CSV-Guide)
