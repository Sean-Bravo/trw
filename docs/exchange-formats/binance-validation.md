# Binance Spot Trading CSV Export Format Validation

**Research Date:** January 7, 2026
**Last Updated:** January 7, 2026

## 1. Official Export Path

### Binance.com (Global)
Navigate to: **Profile Icon → Orders → Spot Order → Trade History → Export**

Alternative paths:
- Wallet → Transaction History → Export Transaction Records
- Orders → Spot Order History → Export complete trade history

### Binance US
Navigate to: **Orders → Trade History** or **Wallet → Transaction History → Export**

## 2. Current CSV Column Headers

### Binance.com Spot Trade History Export

Based on research from multiple sources, the current Binance spot trade history export includes:

| Column | Description |
|--------|-------------|
| **Date(UTC)** | Timestamp of trade execution in UTC |
| **Pair** | Trading pair (e.g., BTCUSDT, ETHBTC) |
| **Side** | BUY or SELL |
| **Price** | Execution price per unit |
| **Executed** | Quantity of base asset traded |
| **Amount** | Total value in quote currency |
| **Fee** | Trading fee charged |
| **Fee Coin** | Asset used to pay the fee (often BNB) |

### Binance Order History Export (Alternative Format)

| Column | Description |
|--------|-------------|
| **Date(UTC)** | Order timestamp |
| **Pair** | Trading pair |
| **Type** | Order type (LIMIT, MARKET, etc.) |
| **Side** | BUY or SELL |
| **Order Price** | Requested price |
| **Order Amount** | Requested quantity |
| **Average** | Average fill price |
| **Executed** | Filled quantity |
| **Total** | Total value |
| **Trigger Conditions** | Stop-loss/take-profit conditions |
| **Status** | Order status (Filled, Canceled, etc.) |

### Third-Party Tool Format (binance-exports)

Tools like `binance-exports` generate CSVs with a modified format:
```
time,base-asset,quote-asset,type,price,quantity,total,fee,fee-currency,trade-id
```

Example row:
```
2022-03-01 21:20:44,SOL,USD,BUY,42.2424,0.42,42.90010000,0.0009001,BNB,9001
```

## 3. Format Changes (Past 12 Months)

### Major Changes Timeline

| Date | Change |
|------|--------|
| **February 2022** | Binance removed Trade History page and direct trade export capability |
| **January 2023** | New "Legacy CSV format" introduced - not backward compatible with many third-party tools |
| **November 2024** | API no longer provides historical trade data before September 2022 |
| **October 2025** | COIN-M file download feature discontinued |

### Key Format Changes

1. **Trade History Page Removal (Feb 2022)**: Direct trade export was discontinued. Order History export remains but is more difficult to parse.

2. **Legacy Format (Jan 2023)**: New format introduced that broke compatibility with many crypto tax tools. CoinTracking and similar services recommend using newer API & CSV import methods.

3. **Export Duration Extension**: Exports now support up to 1 year of data per file (previously limited to 3 months).

4. **API Historical Data Cutoff (Nov 2024)**: Historical trade data via API is no longer available before September 2022. Users must rely on CSV exports for older data.

## 4. Regional Variations

### Binance.com (Global) vs Binance US

| Aspect | Binance.com | Binance US |
|--------|-------------|------------|
| **Entity** | Binance Holdings Ltd. | BAM Trading Services Inc. |
| **Export Types** | 8 types (Deposit/Withdraw Crypto/Fiat, Order/Trade History, Buy/Sell Crypto) | Simplified transaction history + tax report |
| **Column Headers** | May differ slightly | May differ slightly |
| **Trading Pairs** | Extensive | Limited selection |
| **Fee Reporting** | Fee + Fee Coin columns | Similar structure |
| **Tax Documents** | No 1099-B issued | No 1099-B issued |

### Key Differences

1. **Platform Separation**: Completely separate backends and databases
2. **Export Navigation**: Similar paths but UI may differ
3. **Transaction Types**: Binance US has fewer transaction type filters (Spot Trading, Buy/Sell/Convert, Deposits/Withdrawals, Distributions, OTC, Pay, Crypto Box)
4. **Terminology**: "Base Asset" (first in pair), "Quote Asset" (second in pair) terminology consistent

### Binance US Export Options
- All transactions
- Spot Trading (Advanced Trading)
- Buy, Sell & Convert
- Deposits & Withdraw
- Distributions (Airdrops, Staking rewards)
- OTC
- Pay
- Crypto Box

## 5. User Complaints (Reddit/Twitter/Forums)

### Common Issues Reported

#### Export Limitations
- **3-Month Chunks**: Large accounts may need to break exports into 3-month segments
- **10,000 Line Limit**: Single files limited to 10,000 lines
- **5 Statements/Month**: Limited to 5 statement generations per month
- **7-Day Link Expiration**: Download links expire after 7 days

#### Data Completeness Issues
- **Missing Withdrawal Fees**: CSV exports omit withdrawal fees (only available via API)
- **Missing Historical Data**: API no longer provides data before September 2022
- **Deposit History**: Limited to 6 months with 7-day max range per query

#### Format/Compatibility Issues
- **Legacy Format Incompatibility**: January 2023 format change broke many third-party integrations
- **xlsx vs CSV**: Some services don't read xlsx files correctly
- **Parser Confusion**: Multiple export types with different formats cause import failures

#### Tax Reporting Challenges
- **No 1099-B**: Platform doesn't issue tax forms
- **Internal Transfer Complexity**: Transfers between internal wallets complicate cost basis tracking
- **Third-Party Tools Required**: Most users need external tools to organize tax data

#### Customer Support
- Long response times reported
- Account lock issues with delayed resolution

### Sources of Complaints
- Reddit: r/binance, r/CryptoCurrency
- Koinly Support Forums
- CoinTracker Feedback
- Binance Developer Community Forum

## 6. Comparison Against Expected Columns

### Expected Columns
```
Date(UTC), Pair, Side, Amount, Price, Fee, Fee Coin
```

### Actual Binance Export Columns
```
Date(UTC), Pair, Side, Price, Executed, Amount, Fee, Fee Coin
```

### Discrepancy Analysis

| Expected | Actual | Status | Notes |
|----------|--------|--------|-------|
| Date(UTC) | Date(UTC) | MATCH | Timestamp in UTC |
| Pair | Pair | MATCH | Trading pair symbol |
| Side | Side | MATCH | BUY/SELL |
| Amount | Executed | **PARTIAL** | "Executed" = quantity of base asset |
| Price | Price | MATCH | Execution price |
| Fee | Fee | MATCH | Fee amount |
| Fee Coin | Fee Coin | MATCH | Fee currency |
| - | Amount | **EXTRA** | Total value (price × executed) |

### Key Discrepancies

1. **Column Naming**: Expected "Amount" maps to Binance's "Executed" column
2. **Additional Column**: Binance includes "Amount" as total value (not in expected list)
3. **Column Order**: Binance uses `Price, Executed, Amount` vs expected `Amount, Price`

### Recommendations

1. **Map "Executed" to "Amount"**: When parsing, treat "Executed" as the quantity field
2. **Handle "Amount" as "Total"**: The "Amount" column represents total trade value
3. **Support Both Formats**: Account for Order History vs Trade History export variations
4. **Validate Headers Dynamically**: Due to format changes, validate actual headers on import

## 7. Export Limitations Summary

| Limitation | Value |
|------------|-------|
| Max data per file | 1 year |
| Max lines per file | 10,000 |
| Statements per month | 5 |
| Download link validity | 7 days |
| Historical data via API | September 2022 onwards |
| Deposit history API | 6 months, 7-day range |

## 8. Documentation Gap

**Critical Finding**: Binance does not publish official documentation for CSV column specifications. Developers have repeatedly requested this documentation on the Binance Developer Community Forum without resolution.

This lack of documentation means:
- Third-party tools must reverse-engineer formats
- Format changes can break integrations without warning
- Regional variations are not officially documented

## Sources

- [Binance Support - How to Download Spot Trading Transaction History](https://www.binance.com/en/support/faq/how-to-download-spot-trading-transaction-history-statement-e4ff64f2533f4d23a0b3f8f17f510eab)
- [Binance US Help Center - Transaction History/Tax Report](https://support.binance.us/en/articles/9842967-how-to-download-your-transaction-history-or-tax-report)
- [Binance Developer Forum - Transaction History CSV Documentation Request](https://dev.binance.vision/t/docs-for-transaction-history-csv-files/9777)
- [GitHub - prikhi/binance-exports](https://github.com/prikhi/binance-exports)
- [GitHub - larsklitzke/tradingconv](https://github.com/larsklitzke/tradingconv)
- [Koinly - Binance Common CSV Issues](https://help.koinly.io/en/articles/5619222-binance-common-issues-with-csv)
- [CoinTracking - Binance Legacy Import](https://cointracking.info/import/binance/index.php)
