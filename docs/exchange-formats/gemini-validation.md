# Gemini CSV Export Format Validation

**Research Date:** January 2026
**Status:** Gemini is in "Coming Soon" (Q1 2026) - see `/content/docs/getting-started/supported-exchanges.md`

## Export Path

1. Sign in to Gemini
2. Click **Account** (top right corner)
3. Click **Settings** in dropdown
4. Scroll down → Click **Statements and history** in sidebar
5. Click **Transaction History** tab
6. Click the **download icon** next to "Exchange Transaction History"
7. Set date range → Click **Download .xlsx**

**Important:** Gemini exports as **XLSX**, not CSV. Users must convert to CSV before uploading.

---

## Column Structure

### Native XLSX Export (Observed from Third-Party Tools)

Based on analysis of tools that parse Gemini exports (gemini-turbotax, BittyTax, cryptoTax):

| Column | Description | Example Values |
|--------|-------------|----------------|
| **Date** | Transaction timestamp (NY EST) | 2025-01-15 14:30:00 |
| **Type** | Transaction type | Buy, Sell, Credit, Debit |
| **Symbol** | Trading pair | BTCUSD, ETHUSD, GUSD |
| **Price** | Unit price | 42500.00 |
| **Amount** | Quantity traded | 0.5 |
| **Fee** | Trading fee amount | 10.75 |
| **Total** | Total transaction value | 21262.75 |

### API Export Format (gemini-exports CLI Tool)

When using the Gemini API directly, columns are:

```
time,base-asset,quote-asset,type,description,price,quantity,total,fee,fee-currency,trade-id
```

Example row:
```
2022-04-20 04:20:00,GUSD,USD,Buy,,1.0,9001.0,9001.0,0.0,USD,900142424242
```

---

## Multi-Currency Column Structure

### Expected Format (User-Reported)
```
Date, Time, Type, Symbol, USD Amount, BTC Amount, ETH Amount, Trading Fee (USD)
```

### Actual Format

**DISCREPANCY FLAGGED:** Multi-currency columns like `BTC Amount`, `ETH Amount` were **NOT confirmed** in research.

Gemini appears to use a **single Amount column** with the **Symbol** column indicating the asset. This is a **per-row** structure, not a **per-asset column** structure.

Evidence:
- gemini-turbotax only processes rows where Symbol ends in "USD"
- gemini-exports uses `base-asset` and `quote-asset` columns
- No documentation found showing asset-specific amount columns

**Recommendation:** Confirm with actual export sample. The expected multi-currency format may be from:
- An older Gemini export format
- A specific account type (ActiveTrader vs Web)
- Confusion with another exchange's format

---

## Transaction Types

### Confirmed Types

| Type | Description | Tax Category |
|------|-------------|--------------|
| **Buy** | Purchase of cryptocurrency | Trade |
| **Sell** | Sale of cryptocurrency | Trade |
| **Credit** | Funds added (deposit, reward) | Deposit/Income |
| **Debit** | Funds removed (withdrawal) | Withdrawal |

### Transfer Types (Observed in BittyTax Issue #220)

| Type | Description |
|------|-------------|
| **Withdrawal** | Crypto withdrawal |
| **Withdrawal (Wire Transfer)** | Fiat withdrawal to bank |

### Possible Additional Types (Unconfirmed)

Based on Gemini features, these types may exist but were not confirmed:

| Possible Type | Source Feature |
|--------------|----------------|
| Interest | Gemini Earn (discontinued) |
| Staking Reward | Gemini Staking |
| Reward | Credit Card cashback |
| Trade | Generic trade label |

---

## Fee Column Naming

### Expected
- `Trading Fee (USD)`
- `Fee (USD)`

### Observed

| Source | Fee Column(s) |
|--------|---------------|
| API Export | `fee`, `fee-currency` (separate columns) |
| XLSX Export | `Fee` (single column, likely in USD) |

**DISCREPANCY:** Fee column naming varies between API and UI exports. The parenthetical `(USD)` notation was not confirmed in XLSX exports.

Fees are charged in the **quote currency** (second currency in pair). For BTC/USD, fees are in USD.

---

## Gemini Earn / Staking Rewards

### Gemini Earn Program

**Status:** DISCONTINUED (January 2023)

- Program halted after partner Genesis filed for bankruptcy
- SEC charged Gemini over the Earn program
- Settlement in February 2024 - $1.1 billion returned to customers
- Distributions now available in Gemini accounts

**Export Note:** Historical Earn transactions may appear as:
- `Credit` type with description indicating interest
- Separate "Grow" transaction history file (not supported by most tools)

### Gemini Staking (Current)

- Currently supports: Ethereum (ETH), Solana (SOL), Polygon (MATIC)
- Rewards distributed daily
- Gemini takes 15-30% of staking rewards as fee

**Staking Transaction Types:** Not confirmed in export research. May appear as:
- `Credit` with staking description
- Dedicated staking reward type

---

## Format Discrepancies Summary

| Expected | Actual | Severity |
|----------|--------|----------|
| CSV format | XLSX format | Medium - requires conversion |
| Multi-currency columns (BTC Amount, ETH Amount) | Single Amount column per row | High - structural difference |
| Trading Fee (USD) | Fee (separate column) | Low - naming only |
| Date, Time (separate) | Combined timestamp | Low - can be parsed |

---

## Recommendations for Implementation

1. **Accept XLSX files** - Add XLSX-to-CSV conversion or accept XLSX directly

2. **Handle per-row structure** - Parse Symbol column to determine asset type

3. **Map transaction types:**
   ```
   Buy → BUY
   Sell → SELL
   Credit → DEPOSIT (or INCOME if description contains "reward/interest")
   Debit → WITHDRAWAL
   ```

4. **Fee handling:** Extract fee from single `Fee` column, assume USD for USD pairs

5. **Validate with real export:** Request sample Gemini XLSX from user before finalizing parser

---

## Sources

- [Gemini Support - How can I view my transaction history?](https://support.gemini.com/hc/en-us/articles/209113526-How-can-I-view-my-transaction-history)
- [gemini-turbotax - GitHub](https://github.com/impredicative/gemini-turbotax)
- [gemini-exports - Hackage](https://hackage.haskell.org/package/gemini-exports)
- [BittyTax Issue #220 - Gemini support request](https://github.com/BittyTax/BittyTax/issues/220)
- [Gemini Fee Schedules](https://www.gemini.com/fees)
- [Gemini Staking](https://www.gemini.com/staking)
- [Gemini Earn Updates](https://www.gemini.com/earn)
