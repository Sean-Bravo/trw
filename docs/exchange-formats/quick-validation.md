# Crypto Exchange CSV Export Formats - Quick Validation Guide

> **Last Updated:** January 2025
> **Research Date:** January 7, 2026

---

## Executive Summary

| Exchange | Format | Timestamp Format | Key Concern |
|----------|--------|------------------|-------------|
| Binance | CSV | `YYYY-MM-DD HH:MM:SS` (UTC) | Trade history export removed Feb 2022; use statements |
| Coinbase | CSV | ISO-like with timezone | Wallet exports not supported via CSV |
| Kraken | CSV (zipped) | `YYYY-MM-DD HH:MM:SS` (UTC) | Margin data requires API, not CSV |
| Crypto.com | CSV | `Timestamp (UTC)` column | Multiple files needed (crypto + fiat) |
| Gemini | **XLSX** (not CSV) | Varies | Native export is XLSX, not CSV |

---

## 1. Binance

### Current Column Headers (Statement Export)
```
UTC_Time, Account, Operation, Coin, Change, Remark
```

### Example Data
```csv
UTC_Time,Account,Operation,Coin,Change,Remark
2021-04-22 01:02:47,Spot,Deposit,USDT,999.00000000,""
2021-04-22 08:52:05,Spot,Buy,USDT,-396.32256712,""
2021-04-22 08:52:05,Spot,Fee,BTC,-0.00000739,""
2021-04-22 08:52:05,Spot,Buy,BTC,0.00739100,""
```

### Timestamp Format
- **Format:** `YYYY-MM-DD HH:MM:SS`
- **Timezone:** UTC+0 (explicitly stated)
- **Column name:** `UTC_Time`

### Transaction Type Values (Operation column)
| Value | Description |
|-------|-------------|
| `Deposit` | Incoming deposits |
| `Buy` | Purchase transactions |
| `Sell` | Sale transactions |
| `Fee` | Transaction fees |
| `Transaction Related` | Related/linked transactions |
| `Large OTC trading` | OTC trades |
| `Withdraw` | Withdrawals |

### Account Types
- `Spot` - Spot wallet
- `Margin` - Margin trading
- `Futures` - Futures contracts
- `Earn` - Staking/savings

### Format Changes (Past 12 Months)

| Date | Change |
|------|--------|
| Nov 2024 | Historical trade data via API no longer available before Sept 2022 |
| Jan 2023 | New "Legacy CSV" format introduced - some importers incompatible |
| Feb 2022 | **Trade History page removed** - must use "Generate All Statements" |

### Export Limitations
- Max **10,000 data points** per export
- Max **6 months** per range (some sources say 1 year now)
- Max **5 statements per month**
- Withdrawal fees **omitted** from CSV (only in API)

### Common User Complaints
1. **Missing transactions** - "Transaction Related" and "Large OTC trading" entries skipped by importers
2. **Liquidation data missing** - Collateral liquidation details not included
3. **API/CSV mismatch** - Isolated margins not in API; mixing creates duplicates
4. **Deposit history limit** - Max 3-month chunks for deposit history export
5. **Rewards missing** - Some staking rewards not appearing in exports

### Validation Flags
- [ ] Check for `Transaction Related` entries (often skipped)
- [ ] Verify withdrawal fees are captured separately
- [ ] Confirm margin transactions present if applicable
- [ ] Watch for duplicate handling if mixing API + CSV

---

## 2. Coinbase

### Current Column Headers
```
Timestamp, Transaction Type, Asset, Quantity Transacted, Spot Price Currency,
Spot Price at Transaction, Subtotal, Total (inclusive of fees and/or spread),
Fees and/or Spread, Notes
```

### Timestamp Format
- **Format:** ISO-like with timezone info
- **Example:** `2024-01-15T14:30:00Z` or localized
- **Column name:** `Timestamp`

### Transaction Type Values
| Value | Description |
|-------|-------------|
| `Buy` | Purchase |
| `Sell` | Sale |
| `Send` | Outgoing transfer |
| `Receive` | Incoming transfer |
| `Convert` | Crypto-to-crypto conversion |
| `Rewards Income` | Staking rewards |
| `Coinbase Earn` | Learning rewards |
| `Interest` | Interest earnings |
| `Deposit` | Fiat deposit |
| `Withdrawal` | Fiat withdrawal |
| `Fork` | Blockchain fork tokens |
| `Airdrop` | Airdrop tokens |
| `Inflation Reward` | Protocol inflation rewards |

### Format Changes (Past 12 Months)

| Date | Change |
|------|--------|
| 2023-2024 | Coinbase Pro discontinued - history only via website download |
| Ongoing | Must use "Statements" tab, NOT "Taxes" tab for full exports |

### Export Access Path
1. Click grid icon > Accounts
2. Select **Statements** (not Taxes!)
3. Generate custom statement > All assets > All transactions > Custom date range

### Common User Complaints
1. **UI confusion** - Must use regular Coinbase UI, not Advanced
2. **Wallet exports unsupported** - Coinbase Wallet has no CSV export
3. **Excel modification** - Opening in Excel alters headers/format
4. **Pro history access** - Historical Pro data harder to retrieve post-shutdown

### Validation Flags
- [ ] Verify export is from "Statements" not "Taxes"
- [ ] Check file wasn't opened in Excel before import
- [ ] Confirm all transaction types are recognized

---

## 3. Kraken

### Current Column Headers (Ledger Export)
```
txid, refid, time, type, subtype, aclass, asset, wallet, amount, fee, balance
```

### Example Data
```csv
"txid","refid","time","type","subtype","aclass","asset","wallet","amount","fee","balance"
"LFTGXD-RWVPJ-J645GJ","TA4RTP-4TUW5-G5DGTA","2024-03-19 19:43:31","trade","","currency","BTC","spot / main","-0.0012570000","0","0.0025137244"
```

### Timestamp Format
- **Format:** `YYYY-MM-DD HH:MM:SS`
- **Timezone:** UTC
- **Column name:** `time`

### Transaction Type Values
| Value | Description |
|-------|-------------|
| `trade` | Buy/sell trades |
| `deposit` | Incoming deposits |
| `withdrawal` | Outgoing withdrawals |
| `staking` | Staking rewards |
| `fee` | Fee transactions |
| `transfer` | Internal transfers |

### Asset Naming Conventions
| Kraken Code | Standard | Notes |
|-------------|----------|-------|
| `XXBT` | `BTC` | Legacy Bitcoin code |
| `XETH` | `ETH` | Legacy Ethereum code |
| `ZUSD` | `USD` | Fiat USD |
| `ZEUR` | `EUR` | Fiat EUR |

### Separate Trades CSV Format
```
txid, ordertxid, pair, time, type, ordertype, price, cost, fee, vol, margin, misc, ledgers
```

### Format Changes (Past 12 Months)
| Date | Change |
|------|--------|
| Recent | Single Ledgers file now contains all trade history (previously needed 2 files) |
| Ongoing | Order history cannot be directly exported |

### Export Access Path
1. Activity > Export History
2. Click "+ New Export"
3. Select **Ledger** as type
4. Set date range, keep "All" for Assets and Fields
5. Select **CSV** format
6. Download ZIP, extract ledgers.csv

### Common User Complaints
1. **Margin data missing from CSV** - Requires API import
2. **Legacy asset codes** - XXBT/XETH confuse importers
3. **NFT data incomplete** - Shows crypto used but not NFT metadata
4. **Futures separate** - Requires different export process

### Validation Flags
- [ ] Map legacy codes (XXBT->BTC, XETH->ETH, etc.)
- [ ] Confirm margin transactions handled if applicable
- [ ] Check for `refid` linking related transactions
- [ ] Verify staking rewards included

---

## 4. Crypto.com

### Current Column Headers (App Export)
```
Timestamp (UTC), Transaction Description, Currency, Amount, To Currency,
To Amount, Native Currency, Native Amount, Native Amount (in USD), Transaction Kind
```

### Timestamp Format
- **Format:** UTC timestamp
- **Timezone:** UTC (explicit in column name)
- **Column name:** `Timestamp (UTC)`
- **Date portion:** `YYYY-MM-DD`

### Transaction Kind Values
| Value | Description |
|-------|-------------|
| `crypto_purchase` | Buying crypto |
| `crypto_viban_exchange` | Crypto to fiat exchange |
| `crypto_payment` | Merchant payment |
| `crypto_payment_refund` | Merchant refund |
| `crypto_transfer` | User-to-user transfer |
| `transfer_cashback` | Cashback reward |
| `pay_checkout_reward` | Pay rewards |
| `viban_purchase` | Fiat purchase |
| `card_cashback_reverted` | Reverted cashback |
| `supercharger_deposit` | Supercharger staking |
| `supercharger_reward_to_app_credited` | Supercharger reward |

### Exchange CSV Columns (Different from App)
```
Instrument, Margin Order, ... (additional trade fields)
```
- `Instrument` column: "Spot" or "Derivatives"
- `Margin Order` column: "True" = Margin, "false" = Spot

### Export Types Required
| File | Contents |
|------|----------|
| `crypto_transaction_record` | Crypto wallet activity |
| `fiat_transaction_record` | Fiat wallet activity |
| `card_transaction_record` | Optional (covered by above) |

### Format Changes (Past 12 Months)
| Date | Change |
|------|--------|
| Nov 2022+ | Monthly summary auto-generation (7 days after month end) |
| Recent | Derivatives export now supports up to 6 months |

### Export Limitations
- Max **1 year** per export
- Last **30 reports** retained
- Download available for **30 days** only
- Derivatives: 6 months order/trade, 1 month wallet

### Common User Complaints
1. **TurboTax nightmare** - "Third year in a row" importing issues (Apr 2025)
2. **Multiple files required** - Must upload crypto + fiat together
3. **Missing transaction types** - Direct card purchases, fee payments excluded
4. **Cashback complexity** - Reverted cashbacks create confusion

### Validation Flags
- [ ] Ensure both crypto + fiat files imported together
- [ ] Watch for `card_cashback_reverted` entries
- [ ] Verify `Transaction Kind` values all recognized
- [ ] Check Supercharger transactions if applicable

---

## 5. Gemini

### Native Export Format
**XLSX (Excel)** - NOT CSV

### Column Headers (XLSX Export)
```
Date, Time, Type, Symbol, Specification, Liquidity Indicator,
Trading Fee Rate, Quantity, Price, Fee, Total
```

### Timestamp Format
- **Separate columns:** `Date` and `Time`
- **Timezone:** Typically NY EST or UTC (varies)

### Transaction Type Values
| Value | Supported | Notes |
|-------|-----------|-------|
| `Buy` | Yes | Standard purchase |
| `Sell` | Yes | Standard sale |
| `Credit` | No* | Often skipped by importers |
| `Debit` | No* | Often skipped by importers |

*Tax tools may not recognize Credit/Debit types

### Symbol Format
- Format: `{ASSET}USD` (e.g., `BTCUSD`, `ETHUSD`)
- Only USD pairs commonly supported by tax tools

### Third-Party CSV Format (via tools like gemini-exports)
```
time, base-asset, quote-asset, type, description, price, quantity, total, fee, fee-currency, trade-id
```

### Format Changes (Past 12 Months)
| Date | Change |
|------|--------|
| Ongoing | Export remains XLSX format (no native CSV) |
| Ongoing | Grow transaction history not included in standard export |

### Export Access Path (Web)
1. Account > Balances
2. Transaction History > Date Range
3. Download XLSX

### Export Access Path (Mobile)
1. Portfolio tab
2. Scroll to Transaction History
3. Download

### Common User Complaints
1. **XLSX not CSV** - Requires conversion for most tax tools
2. **Credit/Debit skipped** - Importers only handle Buy/Sell
3. **Grow history separate** - Not in standard transaction export
4. **Limited type support** - Many transaction types unrecognized

### Validation Flags
- [ ] Convert XLSX to CSV before import
- [ ] Handle Credit/Debit transactions manually
- [ ] Verify Symbol ends in USD for supported pairs
- [ ] Check for Grow transactions separately

---

## Cross-Exchange Validation Matrix

### Timestamp Standardization

| Exchange | Raw Format | Timezone | Standard ISO 8601 |
|----------|------------|----------|-------------------|
| Binance | `2024-01-15 14:30:00` | UTC | `2024-01-15T14:30:00Z` |
| Coinbase | Varies | With TZ | Usually compliant |
| Kraken | `2024-01-15 14:30:00` | UTC | `2024-01-15T14:30:00Z` |
| Crypto.com | UTC timestamp | UTC | Needs T separator |
| Gemini | Separate Date/Time | EST/UTC | Requires combination |

### Transaction Type Mapping

| Action | Binance | Coinbase | Kraken | Crypto.com | Gemini |
|--------|---------|----------|--------|------------|--------|
| Buy | `Buy` | `Buy` | `trade` (positive) | `crypto_purchase` | `Buy` |
| Sell | `Sell` | `Sell` | `trade` (negative) | `crypto_viban_exchange` | `Sell` |
| Deposit | `Deposit` | `Receive` | `deposit` | `crypto_transfer` | `Credit` |
| Withdrawal | `Withdraw` | `Send` | `withdrawal` | `crypto_transfer` | `Debit` |
| Fee | `Fee` | In `Fees and/or Spread` | `fee` | In transaction | `Fee` column |
| Staking | Operation varies | `Rewards Income` | `staking` | `supercharger_reward_*` | N/A |

---

## Known Import Issues by Tax Software

### Koinly
- **Binance:** "Transaction Related" entries skipped; don't mix API + CSV
- **Kraken:** Margin requires API import
- **Crypto.com:** Requires both crypto + fiat files

### CoinTracker
- **Gemini:** XLSX must be converted
- **Binance:** May need separate deposit history XLSX

### TurboTax
- **Crypto.com:** Persistent import issues reported
- **Gemini:** Requires third-party conversion tools

---

## Recommendations

### For Parser Implementation

1. **Normalize timestamps** to ISO 8601 with Z suffix (`YYYY-MM-DDTHH:MM:SSZ`)
2. **Map transaction types** to standardized internal values
3. **Handle negative amounts** (Kraken uses negatives for sells/fees)
4. **Support legacy codes** (Kraken's XXBT, XETH, etc.)
5. **Expect XLSX from Gemini** - build in conversion
6. **Multi-file support for Crypto.com** - link crypto + fiat records

### Pre-Import Checklist

- [ ] File not opened/modified in Excel
- [ ] Correct date range selected
- [ ] All required files exported (Crypto.com)
- [ ] Converted from XLSX if needed (Gemini)
- [ ] Timezone confirmed as UTC

---

## Sources

- [Binance Export FAQ](https://www.binance.com/en/support/faq/detail/e4ff64f2533f4d23a0b3f8f17f510eab)
- [Coinbase Transaction Reporting](https://help.coinbase.com/en/commerce/managing-account/transaction-reporting)
- [Kraken Export Guide](https://support.kraken.com/articles/208267878-how-to-export-your-account-history)
- [Crypto.com App Export](https://help.crypto.com/en/articles/3438579-how-do-i-export-my-transaction-history-app)
- [Gemini Transaction History](https://support.gemini.com/hc/en-us/articles/209113526-How-can-I-view-my-transaction-history)
- [Koinly Binance Issues](https://support.koinly.io/en/articles/9490005-binance-common-issues-with-csv)
- [CoinLedger Kraken Guide](https://help.coinledger.io/en/articles/5338231-kraken-ledgers-file-import-guide)
