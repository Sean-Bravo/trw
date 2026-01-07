# Gemini CSV Format Validation Report

**Last Updated:** 2026-01-07
**Status:** 🔄 Coming Soon (Q1 2026)
**Priority:** MEDIUM

## Implementation Status

Gemini support is scheduled for Q1 2026. This document outlines the required format support.

## Format Research (2024-2025)

### Regulatory Changes

1. **Form 1099-DA Requirement (Starting 2025)**
   - Gemini required to report sales/trades to IRS on Form 1099-DA
   - First forms issued February 2026 for 2025 tax year
   - Cost basis reporting starts January 1, 2026

2. **Accounting Method Selection**
   - Gemini requesting customer accounting method preference (FIFO, HIFO, etc.)
   - Default is FIFO if not selected
   - Affects cost basis calculations

3. **Continued 1099-MISC**
   - Staking income and referral bonuses still reported on 1099-MISC
   - $600 threshold applies

## Expected Columns

### Transaction History Export (XLSX → CSV)
```csv
Date,Time,Type,Symbol,Specification,Liquidity Indicator,Trading Fee Currency,Trading Fee Amount,Fill Size,Fill Price,Total,USD Amount,Trade ID,Order ID,Order Date,Order Time,Client Order ID,API Session,Tx Hash,Deposit Destination,Withdrawal Destination
```

### Trade History Export
```csv
Trade ID,Order ID,Time,Type,Symbol,Price,Amount,Fee,Total,USD Value
```

### Transfer History Export
```csv
Date,Time,Type,Symbol,Amount,Fee,Destination,Tx Hash,Status
```

### Earn History Export
```csv
Date,Time,Type,Symbol,Amount,APY,Status
```

## Column Mapping Required

| Gemini Field | TaxFormatter Field | Notes |
|--------------|-------------------|-------|
| `Date` + `Time` | `Date` | Combine fields |
| `Type` | `Type` | Map to standard |
| `Symbol` | `Asset` / `Pair` | e.g., `BTC`, `BTCUSD` |
| `Fill Size` / `Amount` | `Amount` | Quantity |
| `Fill Price` / `Price` | `Price` | Unit price |
| `Trading Fee Amount` / `Fee` | `Fee` | In fee currency |
| `Total` | `Total` | Net amount |
| `USD Amount` / `USD Value` | - | Use for verification |
| `Trade ID` | `Order ID` | For reconciliation |
| `Tx Hash` | - | Blockchain reference |

## Transaction Types to Support

| Gemini Type | TaxFormatter Type | Tax Treatment |
|-------------|-------------------|---------------|
| `Buy` | `BUY` | Standard buy |
| `Sell` | `SELL` | Standard sell |
| `Credit` | `DEPOSIT` | Transfer in |
| `Debit` | `WITHDRAWAL` | Transfer out |
| `Transfer` | `TRANSFER` | Internal move |
| `Earn Deposit` | `STAKING` | Lock for earn |
| `Earn Withdrawal` | `UNSTAKING` | Unlock from earn |
| `Earn Interest` | `INTEREST` | Income |
| `Administrative Credit` | `AIRDROP` | Bonus/promo |
| `Refer-a-Friend Bonus` | `REFERRAL` | Income |
| `Conversion` | `TRADE` | Taxable swap |
| `Fee Credit` | `FEE_REBATE` | Reduce fees |
| `ActiveTrader Rebate` | `FEE_REBATE` | Trading rebate |
| `Custody Fee` | `FEE` | Expense |
| `Staking Reward` | `STAKING_REWARD` | Income |

## Implementation Requirements

### File Format Handling
- Gemini exports as XLSX by default
- Must handle XLSX or require CSV conversion
- Or: Accept both formats with auto-detection

### Symbol Parsing
Gemini uses concatenated symbols:
- `BTCUSD` → `BTC/USD`
- `ETHUSD` → `ETH/USD`
- `BTC` alone for transfers

Must parse correctly for pair detection.

### Specification Field
Contains additional details:
- `Limit` / `Market` for order type
- `Maker` / `Taker` for liquidity
- May affect fee interpretation

### Liquidity Indicator
- `Maker` = fee rebate possible
- `Taker` = standard fee
- ActiveTrader program affects rates

### Date/Time Combination
Two separate columns must be combined:
```
Date: 2025-01-15
Time: 14:30:00.000
→ 2025-01-15 14:30:00
```

## Gemini Earn Complexity

Gemini Earn has specific handling requirements:

1. **Deposit to Earn**
   - Not a taxable event
   - Track original cost basis

2. **Interest Earned**
   - Taxable as income when received
   - Fair market value at time of receipt

3. **Withdrawal from Earn**
   - Not taxable (return of principal + earned interest)
   - Interest already taxed when received

4. **In-Kind Interest**
   - Interest paid in same asset as deposited
   - Cost basis = FMV at time of receipt

## Validation Checklist

### Pre-Launch Testing
- [ ] XLSX file handling (or conversion instructions)
- [ ] Trade history parsing
- [ ] Transfer history parsing
- [ ] Earn history parsing
- [ ] Symbol parsing (BTCUSD → BTC/USD)
- [ ] Date + Time field combination
- [ ] All transaction types mapped
- [ ] Fee currency handling
- [ ] Liquidity indicator tracking
- [ ] Earn deposit/withdrawal/interest flow
- [ ] Staking reward handling

### Known Considerations
1. Gemini exports XLSX, not CSV by default
2. Multiple export sections may need combining
3. ActiveTrader fee rebates must be tracked
4. Earn interest compounds and must be tracked

## Test Files Needed

- [ ] `gemini-trades-2025.xlsx` - Trade history
- [ ] `gemini-transfers-2025.xlsx` - Deposit/withdrawal
- [ ] `gemini-earn-2025.xlsx` - Earn activity
- [ ] `gemini-comprehensive-2025.xlsx` - Full export

## Gemini Tax Center Integration

Gemini provides a Tax Center with:
- Cost basis reports
- Gain/loss calculations
- Accounting method selection

Consider whether to:
1. Parse raw transactions (more flexible)
2. Accept Tax Center reports (pre-calculated)
3. Support both

## References

- [Gemini Tax Reporting](https://www.gemini.com/blog/prepare-now-for-new-tax-reporting-rules-for-digital-assets-in-2025)
- [Gemini Koinly Integration](https://koinly.io/integrations/gemini/)
- [Gemini Taxes - CoinLedger](https://coinledger.io/integrations/gemini)
- [Gemini Tax Guide - Divly](https://divly.com/en/wallets-and-exchanges/Gemini)
