# Crypto.com CSV Format Validation Report

**Last Updated:** 2026-01-07
**Status:** 🔄 Coming Soon (Q1 2026)
**Priority:** HIGH

## Implementation Status

Crypto.com support is scheduled for Q1 2026. This document outlines the required format support.

## Format Research (2024-2025)

### Critical Change: Tax Service Deprecated

1. **Crypto.com Tax Service Discontinued (2024)**
   - Tax service deprecated in favor of Koinly partnership
   - Previously allowed direct tax report generation
   - Users now need third-party tools (like TaxFormatter)

2. **API Historical Limitations**
   - API only provides last 2 years of transactions
   - Older accounts require CSV export for historical data

3. **Export History Availability**
   - Available from November 2022 (up to 36 months)
   - Each report can contain up to 3 years of transactions
   - Download available for 30 days after generation

### User Pain Points

From community feedback:
> "For the third year in a row, reporting my Crypto.com transactions to TurboTax has been a complete nightmare"

This presents a significant opportunity for TaxFormatter.

## Expected Columns

### Crypto.com App Export
```csv
Timestamp,Transaction Description,Currency,Amount,To Currency,To Amount,Native Currency,Native Amount,Native Amount (in USD),Transaction Kind,Transaction Hash
```

### Crypto.com Exchange Export

#### Deposits/Withdrawals
```csv
Create Time,Type,Coin,Amount,Status,Transaction ID,Address,Note
```

#### Spot Trades
```csv
Trade ID,Timestamp,Instrument,Side,Price,Quantity,Fee,Fee Currency,Total
```

#### All Activity (Comprehensive)
```csv
Timestamp,Transaction Type,Currency,Amount,Native Currency Amount,Transaction Kind,Notes
```

## Column Mapping Required

| Crypto.com Field | TaxFormatter Field | Notes |
|------------------|-------------------|-------|
| `Timestamp` | `Date` | Multiple formats |
| `Transaction Description` | `Notes` | Parse for context |
| `Currency` | `Asset` | From currency |
| `Amount` | `Amount` | Quantity |
| `To Currency` | `Asset` (received) | For conversions |
| `To Amount` | `Amount` (received) | For conversions |
| `Native Amount (in USD)` | `Total` | USD value |
| `Transaction Kind` | `Type` | Map to standard types |
| `Instrument` | `Pair` | Exchange format |
| `Side` | `Type` | Buy/Sell |

## Transaction Types to Support

### App Transaction Types
| Transaction Kind | TaxFormatter Type | Tax Treatment |
|-----------------|-------------------|---------------|
| `crypto_purchase` | `BUY` | Standard buy |
| `crypto_viban_exchange` | `SELL` | Standard sell |
| `crypto_exchange` | `TRADE` | Taxable swap |
| `viban_purchase` | `BUY` | Fiat to crypto |
| `crypto_withdrawal` | `WITHDRAWAL` | Track cost basis |
| `crypto_deposit` | `DEPOSIT` | Needs cost basis |
| `referral_bonus` | `AIRDROP` | Income |
| `referral_card_cashback` | `REWARDS` | Income |
| `card_cashback_reverted` | `ADJUSTMENT` | Reduce income |
| `crypto_earn_interest_paid` | `INTEREST` | Income |
| `crypto_earn_program_created` | `STAKING` | Non-taxable |
| `crypto_earn_program_withdrawn` | `UNSTAKING` | Non-taxable |
| `lockup_lock` | `STAKING` | CRO lockup |
| `lockup_unlock` | `UNSTAKING` | CRO unlock |
| `lockup_upgrade` | `STAKING` | Tier upgrade |
| `supercharger_deposit` | `STAKING` | Supercharger entry |
| `supercharger_withdrawal` | `UNSTAKING` | Supercharger exit |
| `supercharger_reward_to_app_credited` | `REWARDS` | Income |
| `rewards_platform_deposit_credited` | `AIRDROP` | Income |
| `dust_conversion_debited` | `TRADE` | Small balance sell |
| `dust_conversion_credited` | `TRADE` | Receive CRO |

### Exchange Transaction Types
| Type | TaxFormatter Type | Tax Treatment |
|------|-------------------|---------------|
| `SPOT_TRADE` | `TRADE` | Taxable |
| `MARGIN_TRADE` | `MARGIN_TRADE` | Track position |
| `DEPOSIT` | `DEPOSIT` | Transfer in |
| `WITHDRAWAL` | `WITHDRAWAL` | Transfer out |
| `FEE` | - | Deductible expense |
| `REFERRAL` | `AIRDROP` | Income |
| `INTEREST` | `INTEREST` | Income |

## Implementation Requirements

### File Detection
Multiple export formats exist:
1. **App Export** - Personal wallet + card transactions
2. **Exchange Export** - Trading activity
3. **Tax Export (deprecated)** - May still exist in user files

Parser must detect and handle all three.

### Multi-File Import
Users need to import multiple files:
- `crypto_transactions_record.csv` (App)
- `DEPOSIT.csv` (Exchange)
- `WITHDRAWALS.csv` (Exchange)
- `SPOT_TRADES.csv` (Exchange)

Consider supporting ZIP upload or batch import.

### Date Format Handling
```
2025-01-15 14:30:00 UTC
2025-01-15T14:30:00.000Z
01/15/2025 2:30 PM
```

### Currency Conversion Handling
- Swap transactions have `Currency`, `Amount`, `To Currency`, `To Amount`
- Both sides must be recorded for accurate cost basis
- Native USD amount provided but should be verified

## Validation Checklist

### Pre-Launch Testing
- [ ] App export format parsing
- [ ] Exchange SPOT_TRADES parsing
- [ ] Exchange DEPOSIT parsing
- [ ] Exchange WITHDRAWAL parsing
- [ ] Multi-file deduplication
- [ ] All transaction types mapped
- [ ] Date format normalization
- [ ] Currency swap handling
- [ ] CRO staking/lockup tracking
- [ ] Crypto Earn interest tracking
- [ ] Card cashback handling
- [ ] Dust conversion handling

### Known Issues to Address
1. Crypto.com CSV headers vary between app versions
2. Transaction descriptions can be verbose/inconsistent
3. Timestamp timezone handling critical
4. Native USD amounts may not match market price

## Test Files Needed

- [ ] `crypto-com-app-2025.csv` - App export
- [ ] `crypto-com-exchange-deposits-2025.csv`
- [ ] `crypto-com-exchange-withdrawals-2025.csv`
- [ ] `crypto-com-exchange-trades-2025.csv`
- [ ] `crypto-com-earn-2025.csv` - Earn interest
- [ ] `crypto-com-card-2025.csv` - Card transactions

## References

- [Crypto.com App Export](https://help.crypto.com/en/articles/3438579-how-do-i-export-my-transaction-history-app)
- [Crypto.com Exchange Export](https://help.crypto.com/en/articles/4837927-how-do-i-export-my-transaction-history-exchange)
- [Crypto.com Koinly Integration](https://support.koinly.io/en/articles/9490008-crypto-com)
- [Community Issues - TurboTax](https://ttlc.intuit.com/community/taxes/discussion/crypto-com-csv-problems/00/3452690)
