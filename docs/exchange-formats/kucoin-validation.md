# KuCoin Spot Trading CSV Format Validation

**Research Date:** 2026-01-07
**Status:** Validated
**Exchange:** KuCoin
**Export Type:** Spot Trading History

---

## 1. Official Export Path

**Location:** Orders > Spot Trade History > Trade History > Export to CSV

**Alternative Path:** Account > Download CSV (via Order Center > Export More)

**Direct Access:** [KuCoin Export Guide](https://www.kucoin.com/support/14047696578841)

### Export Steps:
1. Navigate to **Orders** in the top navbar
2. Select **Spot Trade History** > **Trade History**
3. Click **Export to CSV**
4. Select timeframe and click **Confirm**
5. Download from Recent Exports when status shows "Completed"

### File Naming:
- Exported files come in `.zip` format
- Trade history files start with prefix `TRADE`
- Available in both `.csv` and `.xlsx` formats

---

## 2. CSV Column Headers (Confirmed)

KuCoin's spot trading CSV export uses the following columns:

| Column | Description | Example |
|--------|-------------|---------|
| `user_id` | KuCoin user identifier | `12345678` |
| `trade_id` | Unique trade identifier | `5c35c02709e4f67d5266954e` |
| `symbol` | Trading pair | `BTC-USDT` |
| `order_type` | Order type | `limit`, `market` |
| `deal_price` | Execution price | `42500.00` |
| `amount` | Trade quantity | `0.5` |
| `direction` | Trade side | `buy`, `sell` |
| `funds` | Total value (price * amount) | `21250.00` |
| `fee_currency` | Currency fee was paid in | `USDT`, `BTC` |
| `fee` | Fee amount | `21.25` |
| `created_at` | Unix timestamp (ms) | `1629020492837` |
| `created_date` | Human-readable date | `2025-01-15 14:30:00` |

### Raw Header Row:
```
user_id,trade_id,symbol,order_type,deal_price,amount,direction,funds,fee_currency,fee,created_at,created_date
```

---

## 3. Trading Pair Format

**Format:** `BTC-USDT` (hyphen-separated)

**Structure:** `{BASE}-{QUOTE}`

### Examples:
- `BTC-USDT` (Bitcoin to Tether)
- `ETH-USDT` (Ethereum to Tether)
- `KCS-BTC` (KuCoin Token to Bitcoin)
- `SOL-USDC` (Solana to USD Coin)

### Key Points:
- KuCoin uses **hyphen (`-`)** as separator
- Base currency comes first, quote currency second
- Consistent across API and CSV exports
- Different from Binance (`BTCUSDT`) and Coinbase (`BTC-USD`)

---

## 4. Recent Format Changes

### Current Status (2025-2026):
- No major format changes identified in recent announcements
- Format has been stable since December 2020 update

### Historical Changes:
| Date | Change |
|------|--------|
| **Dec 2020** | API updated to allow full trade history access |
| **Feb 2019** | New CSV/API system implemented |
| **Pre-2019** | Legacy format (must contact support for old data) |

### Important Notes:
- Trades before **2019-02-18** require manual CSV request from KuCoin support
- Maximum export span: **1 year** per request
- Export limit: **100 days** for deposit/withdrawal history
- Daily export limit: **5 exports per day**
- Download link valid for **30 days**

---

## 5. Fee Currency Inclusion

**Fee Currency Included:** Yes

The CSV includes both:
- `fee` - The fee amount charged
- `fee_currency` - The currency in which the fee was paid

### Fee Payment Logic:
| Trade Type | Fee Currency |
|------------|--------------|
| Buy BTC-USDT | Usually `BTC` (receiving asset) |
| Sell BTC-USDT | Usually `USDT` (quote asset) |
| With KCS discount | May be `KCS` |

### API Fee Fields (for reference):
- `fee` - Actual fee amount
- `feeRate` - Fee percentage (e.g., `0.001` = 0.1%)
- `feeCurrency` - Currency of fee payment
- `takerFeeRate` / `makerFeeRate` - Taker/maker rates

---

## 6. Comparison Against Expected Columns

### Expected Columns:
| Expected | KuCoin Actual | Match | Notes |
|----------|---------------|-------|-------|
| Time | `created_at`, `created_date` | Partial | KuCoin uses two fields |
| Trade Pair | `symbol` | Yes | Same concept, different name |
| Side | `direction` | Yes | Same concept, different name |
| Price | `deal_price` | Yes | Same concept, different name |
| Amount | `amount` | Yes | Exact match |
| Fee | `fee` | Yes | Exact match |
| Fee Currency | `fee_currency` | Yes | Exact match |

### Discrepancies Flagged:

#### 1. Column Naming Differences
| Expected Name | KuCoin Name | Action Required |
|---------------|-------------|-----------------|
| `Time` | `created_at` / `created_date` | Map column name |
| `Trade Pair` | `symbol` | Map column name |
| `Side` | `direction` | Map column name |
| `Price` | `deal_price` | Map column name |

#### 2. Additional KuCoin Columns (Not Expected)
These columns are present in KuCoin CSV but not in expected format:
- `user_id` - User identifier
- `trade_id` - Trade identifier
- `order_type` - Order type (limit/market)
- `funds` - Total trade value

#### 3. Time Format
- KuCoin provides **two** time columns vs expected **one**
- `created_at`: Unix timestamp in milliseconds
- `created_date`: Human-readable datetime string
- **Recommendation:** Use `created_date` for compatibility

#### 4. Side/Direction Values
| Expected | KuCoin |
|----------|--------|
| `BUY` / `SELL` | `buy` / `sell` |
- **Note:** Lowercase in KuCoin format
- **Action:** Normalize to uppercase during processing

---

## 7. Data Limitations

### What's NOT Included in Trade History CSV:
- Fiat purchases (USD/EUR to crypto)
- Income transactions (airdrops, staking rewards, mining)
- Deposit/withdrawal records (separate export)
- Futures/margin trades (separate export)

### Separate Export Required For:
| Data Type | Export Location |
|-----------|-----------------|
| Deposits/Withdrawals | Account > Deposit/Withdraw History |
| Futures | Orders > Futures Orders |
| Margin | Orders > Margin Orders |
| Convert | Orders > Convert History |

---

## 8. Recommended Column Mapping

For processing KuCoin CSVs, use this mapping:

```javascript
const KUCOIN_COLUMN_MAP = {
  'created_date': 'Time',        // or use created_at for timestamp
  'symbol': 'Trade Pair',
  'direction': 'Side',
  'deal_price': 'Price',
  'amount': 'Amount',
  'fee': 'Fee',
  'fee_currency': 'Fee Currency'
};
```

### Value Transformations:
```javascript
const transformations = {
  direction: (val) => val.toUpperCase(), // buy -> BUY
  symbol: (val) => val,                   // BTC-USDT (no change needed)
  created_at: (val) => new Date(parseInt(val)).toISOString()
};
```

---

## 9. Sample Data Row

```csv
user_id,trade_id,symbol,order_type,deal_price,amount,direction,funds,fee_currency,fee,created_at,created_date
12345678,5c35c02709e4f67d5266954e,BTC-USDT,limit,42500.00,0.5,buy,21250.00,BTC,0.0005,1705329000000,2025-01-15 14:30:00
```

---

## 10. Sources

- [KuCoin Export Trade History Guide](https://www.kucoin.com/support/14047696578841)
- [KuCoin CSV Export Announcement](https://www.kucoin.com/announcement/en-trade-history-now-available-in-csv-export)
- [KuCoin API Documentation - Spot Trading](https://www.kucoin.com/docs/rest/spot-trading/orders/place-order)
- [KuCoin API - Get Trade History](https://www.kucoin.com/docs-new/rest/margin-trading/orders/get-trade-history)
- [Python KuCoin SDK Documentation](https://python-kucoin.readthedocs.io/en/latest/trading.html)
- [CoinTracker KuCoin Converters](https://github.com/troyxmccall/cointracker-converters)

---

## Summary

| Check | Status | Details |
|-------|--------|---------|
| Export path found | Pass | Orders > Spot Trade History > Export |
| Column headers documented | Pass | 12 columns identified |
| Trading pair format | Pass | Hyphen-separated (`BTC-USDT`) |
| Recent format changes | Pass | Stable since 2020 |
| Fee currency included | Pass | Both `fee` and `fee_currency` present |
| Mapping to expected | Partial | Name differences require column mapping |

### Action Items for Implementation:
1. Implement column name mapping (see Section 8)
2. Normalize `direction` values to uppercase
3. Handle dual timestamp columns (`created_at` vs `created_date`)
4. Account for additional columns (`user_id`, `trade_id`, etc.)
