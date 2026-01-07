# OKX CSV Format Validation Report

**Last Updated:** 2026-01-07
**Status:** 🔄 Coming Soon (Q2 2026)
**Priority:** MEDIUM

## Implementation Status

OKX support is scheduled for Q2 2026. This document outlines the required format support.

## Exchange Overview

OKX (formerly OKEx) is one of the largest crypto exchanges globally, offering:
- Spot trading
- Margin trading
- Futures & perpetuals
- Options
- DeFi / Web3 wallet
- Earn products

## Expected Columns

### Spot Trading History
```csv
Order ID,Trade Time,Product,Type,Side,Price,Amount,Fee,Total
```

### Unified Account (Newer Format)
```csv
Order ID,Trade ID,Instrument ID,Instrument Type,Order Type,Side,Fill Price,Fill Size,Fee,PnL,Trade Time
```

### Deposit History
```csv
Deposit Time,Asset,Amount,Status,TXID,From Address,Chain
```

### Withdrawal History
```csv
Withdrawal Time,Asset,Amount,Fee,Status,TXID,To Address,Chain
```

### Funding History (Earn/Staking)
```csv
Time,Asset,Type,Amount,Status
```

## Column Mapping Required

| OKX Field | TaxFormatter Field | Notes |
|-----------|-------------------|-------|
| `Trade Time` | `Date` | Multiple formats |
| `Product` / `Instrument ID` | `Pair` | e.g., `BTC-USDT` |
| `Instrument Type` | - | Spot/Margin/Futures |
| `Side` | `Type` | Buy/Sell |
| `Price` / `Fill Price` | `Price` | Unit price |
| `Amount` / `Fill Size` | `Amount` | Quantity |
| `Fee` | `Fee` | Trading fee |
| `Total` | `Total` | Net amount |
| `PnL` | - | For derivatives |
| `Order ID` / `Trade ID` | `Order ID` | Reconciliation |

## Transaction Types to Support

### Spot/Margin Types
| OKX Type | TaxFormatter Type | Tax Treatment |
|----------|-------------------|---------------|
| `buy` | `BUY` | Standard buy |
| `sell` | `SELL` | Standard sell |
| `Deposit` | `DEPOSIT` | Transfer in |
| `Withdrawal` | `WITHDRAWAL` | Transfer out |

### Derivatives Types
| OKX Type | TaxFormatter Type | Tax Treatment |
|----------|-------------------|---------------|
| `Open Long` | `FUTURES_LONG` | Track position |
| `Close Long` | `CLOSE_LONG` | Capital gain/loss |
| `Open Short` | `FUTURES_SHORT` | Track position |
| `Close Short` | `CLOSE_SHORT` | Capital gain/loss |
| `Liquidation` | `LIQUIDATION` | Capital loss |
| `Settlement` | `SETTLEMENT` | Contract expiry |
| `Funding Fee` | `FUNDING_FEE` | Income/Expense |

### Earn/Staking Types
| OKX Type | TaxFormatter Type | Tax Treatment |
|----------|-------------------|---------------|
| `Simple Earn Subscribe` | `STAKING` | Non-taxable |
| `Simple Earn Redeem` | `UNSTAKING` | Non-taxable |
| `Simple Earn Interest` | `INTEREST` | Income |
| `Staking` | `STAKING` | Non-taxable |
| `Unstaking` | `UNSTAKING` | Non-taxable |
| `Staking Reward` | `STAKING_REWARD` | Income |
| `Jumpstart` | `TOKEN_SALE` | At FMV |
| `Airdrop` | `AIRDROP` | Income |

### Other Types
| OKX Type | TaxFormatter Type | Tax Treatment |
|----------|-------------------|---------------|
| `P2P Buy` | `P2P_BUY` | Standard buy |
| `P2P Sell` | `P2P_SELL` | Standard sell |
| `Convert` | `TRADE` | Taxable swap |
| `Trading Bot` | `TRADE` | Each trade taxable |
| `Loan` | `BORROW` | Non-taxable |
| `Repay` | `REPAY` | Non-taxable |
| `Interest` | `INTEREST_PAID` | May be deductible |

## Implementation Requirements

### Unified Account Handling
OKX uses a Unified Account system:
- Single account for all products
- Must parse `Instrument Type` to categorize
- `Spot`, `Margin`, `Swap`, `Futures`, `Option`

### Symbol Parsing
OKX format: `BTC-USDT`, `ETH-USDT-SWAP`, `BTC-USD-240329`
- `BTC-USDT` = Spot pair
- `ETH-USDT-SWAP` = Perpetual swap
- `BTC-USD-240329` = Futures with expiry

Must handle all formats.

### PnL Tracking for Derivatives
- Track position opens and closes
- Match by Order ID or Instrument ID
- Final PnL at close is taxable event

### Fee Currency
- Fees typically in quote currency or OKB
- Must convert to USD for reporting
- OKB fee discount complicates tracking

## Validation Checklist

### Pre-Launch Testing
- [ ] Spot trading history parsing
- [ ] Unified account format support
- [ ] Deposit/withdrawal parsing
- [ ] Symbol format handling (various types)
- [ ] Instrument type detection
- [ ] All transaction types mapped
- [ ] Fee currency conversion
- [ ] PnL calculation for derivatives
- [ ] Earn/staking tracking
- [ ] P2P transaction handling
- [ ] Convert/swap handling
- [ ] Trading bot activity parsing

### Known Considerations
1. Multiple export formats exist (old vs unified account)
2. Derivatives require position tracking
3. Symbol formats vary by product type
4. OKB fee discounts need special handling

## Test Files Needed

- [ ] `okx-spot-2025.csv` - Spot trading
- [ ] `okx-unified-2025.csv` - Unified account format
- [ ] `okx-derivatives-2025.csv` - Futures/swaps
- [ ] `okx-deposits-2025.csv` - Deposit history
- [ ] `okx-withdrawals-2025.csv` - Withdrawal history
- [ ] `okx-earn-2025.csv` - Staking/earn activity

## Notes for Implementation

### Priority Sub-Features
1. **Spot Trading** - Core functionality
2. **Deposits/Withdrawals** - Transfer tracking
3. **Convert** - Common user action
4. **Simple Earn** - Popular feature
5. **Perpetuals** - Advanced users
6. **Options** - Low priority

### Web3 Wallet Considerations
OKX has integrated Web3 wallet:
- DeFi transactions
- NFT activity
- On-chain swaps

Consider scope of support.

## References

- [OKX Export Guide](https://www.okx.com/help)
- [OKX Tax Guide - Koinly](https://koinly.io/integrations/okx/)
- [OKX Tax Reporting - CoinLedger](https://coinledger.io/integrations/okx)
