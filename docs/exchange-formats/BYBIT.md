# Bybit CSV Format Validation Report

**Last Updated:** 2026-01-07
**Status:** ✅ Current (Minor Updates Needed)
**Priority:** MEDIUM

## Current Support Status

TaxFormatter currently supports Bybit Spot & Perpetual exports.

## Format Changes Detected (2024-2025)

### Upcoming Changes

1. **Form 1099-DA Requirement (2026)**
   - Starting 2026, Bybit will issue Form 1099-DA
   - Reports crypto transactions from 2025 tax year to IRS
   - May affect CSV export columns for compliance

2. **Cost Basis for Transfers**
   - Assets transferred onto Bybit lack accurate cost basis
   - Users must provide historical cost basis manually
   - Recommendation: Connect prior exchange data first

### Current Limitations

| Limitation | Impact | Workaround |
|------------|--------|------------|
| No cost basis for transfers | Inaccurate gains | Import original purchase data |
| Limited historical API access | Missing old data | Use CSV for history |
| Unified account complexity | Mixed derivatives/spot | Parse `Account Type` field |

## Current Expected Columns

### Spot Trade History
```csv
No,Account Type,Order ID,Trade ID,Symbol,Side,Order Type,Avg. Filled Price,Filled Qty,Filled Value,Fee Rate,Trading Fee,Fee Coin,Order Time
```

### Unified Trading Account
```csv
No,Order ID,Trade ID,Symbol,Side,Order Type,Avg. Filled Price,Order Qty,Exec Qty,Exec Value,Fee Rate,Exec Fee,Order Time,Category
```

### Deposit History
```csv
Coin,Chain,Amount,Status,Updated Time,TxID,Tag,Deposit Address
```

### Withdrawal History
```csv
Coin,Chain,Amount,Fee,Status,Updated Time,TxID,Tag,Withdrawal Address
```

### P&L History (Derivatives)
```csv
Symbol,Order ID,Side,Qty,Order Price,Closed PnL,Avg Entry Price,Avg Exit Price,Position Value,Order Type,Exec Type,Created Time
```

## Column Changes Needed

| Current Parser | Actual Export | Action Required |
|----------------|---------------|-----------------|
| `Order Time` | `Order Time` | ✅ OK |
| `Symbol` | `Symbol` | ✅ OK |
| `Side` | `Side` | ✅ OK (Buy/Sell) |
| `Amount` | `Filled Qty` / `Exec Qty` | ⚠️ Multiple names |
| `Price` | `Avg. Filled Price` | ✅ OK |
| `Fee` | `Trading Fee` / `Exec Fee` | ⚠️ Multiple names |
| - | `Fee Coin` | ➕ New: Track fee currency |
| - | `Category` | ➕ New: Distinguish spot/derivatives |
| - | `Closed PnL` | ➕ New: Derivatives gains |

## New Transaction Types to Add

| Type | Description | Tax Treatment |
|------|-------------|---------------|
| `SPOT_BUY` | Spot purchase | Standard buy |
| `SPOT_SELL` | Spot sale | Standard sell |
| `PERP_LONG` | Perpetual long position | Track for PNL |
| `PERP_SHORT` | Perpetual short position | Track for PNL |
| `CLOSE_LONG` | Close long position | Capital gain/loss |
| `CLOSE_SHORT` | Close short position | Capital gain/loss |
| `FUNDING_RECEIVED` | Funding fee received | Income |
| `FUNDING_PAID` | Funding fee paid | Expense |
| `LIQUIDATION` | Forced position close | Capital loss |
| `ADL` | Auto-deleveraging | Capital gain/loss |
| `LAUNCHPOOL` | Token farming | Income |
| `STAKING_REWARD` | Staking returns | Income |
| `SAVINGS_INTEREST` | Flexible savings | Income |
| `DUAL_ASSET` | Dual asset product | Complex (see rules) |
| `P2P_BUY` | P2P purchase | Standard buy |
| `P2P_SELL` | P2P sale | Standard sell |

## Validation Errors Found

1. **Unified Account Complexity**
   - Single export mixes spot and derivatives
   - Must parse `Category` or `Account Type` to differentiate
   - Tax treatment differs significantly

2. **Perpetual Position Tracking**
   - Multiple trades may open/close same position
   - Must aggregate to determine net PNL
   - Funding fees separate from trade fees

3. **Fee Currency Variation**
   - Fees can be in different currencies (BYB, USDT, etc.)
   - Must convert to USD for reporting
   - `Fee Coin` column essential

4. **Transfer Cost Basis Missing**
   - Transfers from other exchanges show no cost basis
   - Users must import original purchase data
   - Creates "unknown cost basis" scenarios

## Recommended Updates

### Immediate (P0)
- [ ] Handle both `Filled Qty`/`Exec Qty` column names
- [ ] Handle both `Trading Fee`/`Exec Fee` column names
- [ ] Add `Category` parsing for spot/derivatives
- [ ] Add `Fee Coin` handling

### Short-term (P1)
- [ ] Add perpetual position tracking
- [ ] Add `FUNDING_RECEIVED`/`FUNDING_PAID` types
- [ ] Add `LIQUIDATION` handling
- [ ] Parse `Closed PnL` from derivatives exports

### Medium-term (P2)
- [ ] Add `LAUNCHPOOL`, `STAKING_REWARD` types
- [ ] Add P2P trading support
- [ ] Prepare for 1099-DA format changes (2026)
- [ ] Add Dual Asset product handling

## Test Files Needed

- [ ] `bybit-spot-2025.csv` - Current spot format
- [ ] `bybit-unified-2025.csv` - Unified account format
- [ ] `bybit-derivatives-2025.csv` - Perpetual/futures format
- [ ] `bybit-pnl-2025.csv` - P&L history format
- [ ] `bybit-deposits-2025.csv` - Deposit format
- [ ] `bybit-withdrawals-2025.csv` - Withdrawal format

## Export Instructions for Users

1. Log in to Bybit website
2. Go to Assets → Spot Account → Order History
3. Click Export and select date range
4. Choose CSV format
5. Repeat for:
   - Unified Trading Account (if applicable)
   - Derivatives Account
   - Deposit/Withdrawal History

## References

- [Bybit Crypto Taxes](https://www.bybit.com/en/tax-api/)
- [Bybit Tax Guide - Summ](https://summ.com/integrations/bybit-tax)
- [Bybit Integration - Koinly](https://koinly.io/integrations/bybit/)
