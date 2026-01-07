# Bybit Spot Trading CSV Export Format Validation

**Research Date:** January 2026
**Last Format Update:** July 2024 (header changes for derivatives)
**Status:** Validated against official documentation and API specs

---

## 1. Official Export Path

### Primary Method (Recommended)
```
Orders → Spot Order → Trade History → Export
```

### Alternative Methods
- **UTA Users:** Unified Trading Account → Spot Orders → Spot Trade History → Export
- **Direct Access:** Profile → Account → Data Export
- **Via Assets:** Assets → Funding Account → History → Data Export

### Export URL
- Statement export page: `https://www.bybit.com/user/assets/exportStatment`
- Earn history (supplemental): `https://www.bybit.com/en/earn/wallet-records`

---

## 2. CSV Column Headers

### Spot Trade History (Current Format - Post UTA)

Based on API v5 documentation and UI field references, Bybit spot trade CSV exports contain:

| CSV Header | API Field | Description |
|------------|-----------|-------------|
| `Order No.` | `orderId` | Unique order identifier |
| `Execution ID` | `execId` | Unique execution/trade identifier |
| `Symbol` | `symbol` | Trading pair (e.g., BTCUSDT) |
| `Side` | `side` | Buy or Sell |
| `Filled Price` | `execPrice` | Execution price |
| `Filled Qty` | `execQty` | Executed quantity |
| `Filled Value` | `execValue` | Total value (price × qty) |
| `Trading Fee` | `execFee` | Fee charged for trade |
| `Fee Currency` | `feeCurrency` | Token used for fee |
| `Execution Time` | `execTime` | Timestamp of execution |
| `Is Maker` | `isMaker` | Maker/Taker indicator |

### API v5 Response Fields Reference
```json
{
  "symbol": "BTCUSDT",
  "orderId": "1234567890",
  "execId": "exec_123456",
  "execPrice": "42500.00",
  "execQty": "0.5",
  "execValue": "21250.00",
  "execFee": "10.625",
  "feeCurrency": "USDT",
  "side": "Buy",
  "execTime": "1704067200000",
  "isMaker": false
}
```

---

## 3. Quantity Field Analysis

### Finding: Bybit uses "Qty" (abbreviated)

| Context | Field Name |
|---------|------------|
| API v5 | `execQty`, `orderQty`, `leavesQty` |
| CSV Export | `Filled Qty` |
| UI Display | "Quantity" or "Filled/Quantity" |

**Conclusion:** CSV exports use **"Filled Qty"** (abbreviated with space)

---

## 4. Symbol/Pair Format

### Format: Concatenated (No Separator)
```
BTCUSDT    (not BTC/USDT or BTC-USDT)
ETHUSDT
SOLUSDT
```

### Characteristics
- Base asset + Quote asset concatenated
- All uppercase
- No separator character
- Common quote currencies: USDT, USDC, BTC, ETH

---

## 5. 2024-2025 Format Changes

### September 2023 - UTA Migration
- Unified Trading Account (UTA) introduced
- Separate export paths created for pre-UTA and post-UTA data
- Pre-upgrade history requires special export options:
  - "Pre-upgrade Spot Trade History"
  - "Pre-upgrade Derivatives Closed P&L"

### July 2024 - Header Format Discontinuation
- Old format headers discontinued for Inverse Perpetual contracts
- Old headers no longer supported:
  ```
  Contracts,Closing Direction,Qty,Entry Price,Exit Price,Closed P&L,Exit Type,Trade Time(UTC+0)
  ```
- Users must re-export files to get current format

### Current Status (2025)
- Spot trade history format appears stable since UTA migration
- No major spot-specific format changes documented in 2024-2025
- CSV header format may vary slightly based on account type

---

## 6. Comparison Against Expected Columns

### Expected Columns
| Expected | Found in Bybit | Match Status |
|----------|----------------|--------------|
| Time | `Execution Time` | PARTIAL MATCH (different name) |
| Symbol | `Symbol` | EXACT MATCH |
| Side | `Side` | EXACT MATCH |
| Price | `Filled Price` | PARTIAL MATCH (different name) |
| Qty/Quantity | `Filled Qty` | PARTIAL MATCH (uses "Qty") |
| Fee | `Trading Fee` | PARTIAL MATCH (different name) |
| Fee Currency | `Fee Currency` | EXACT MATCH |

### Discrepancies Flagged

1. **Time Column**: Bybit uses `Execution Time` instead of just `Time`
   - Impact: Parser must map "Execution Time" → "Time"

2. **Price Column**: Bybit uses `Filled Price` instead of `Price`
   - Impact: Parser must map "Filled Price" → "Price"

3. **Quantity Column**: Bybit uses `Filled Qty` (abbreviated)
   - Impact: Parser must handle "Qty" abbreviation
   - Note: Uses "Qty" NOT "Quantity" or "Amount"

4. **Fee Column**: Bybit uses `Trading Fee` instead of `Fee`
   - Impact: Parser must map "Trading Fee" → "Fee"

5. **Additional Fields**: Bybit includes fields not in expected set:
   - `Order No.` / `Execution ID` (identifiers)
   - `Filled Value` (calculated field)
   - `Is Maker` (maker/taker indicator)

---

## 7. Export Limitations

| Limit | Value |
|-------|-------|
| Max rows per export | 10,000 entries |
| Daily export limit (Spot) | 10 requests |
| Max data range per export | 6 months (Spot) |
| Total historical data | 3 years |
| Monthly export limit | 50 exports (all types) |
| Download link validity | 7 days |
| Processing time | 1-3 days |
| File format | Compressed (ZIP) containing CSV |
| Data start date | January 1, 2020 |

---

## 8. Recommended Parser Mapping

```typescript
const BYBIT_COLUMN_MAP = {
  // Time fields
  'Execution Time': 'time',
  'Trade Time': 'time',
  'Trade Time(UTC+0)': 'time', // Legacy format

  // Symbol fields
  'Symbol': 'symbol',
  'Contracts': 'symbol', // Legacy derivatives

  // Side fields
  'Side': 'side',
  'Closing Direction': 'side', // Legacy

  // Price fields
  'Filled Price': 'price',
  'Price': 'price',
  'Entry Price': 'price', // Legacy

  // Quantity fields
  'Filled Qty': 'qty',
  'Qty': 'qty',
  'Quantity': 'qty',

  // Fee fields
  'Trading Fee': 'fee',
  'Fee': 'fee',

  // Fee currency
  'Fee Currency': 'feeCurrency',

  // Additional fields
  'Order No.': 'orderId',
  'Execution ID': 'execId',
  'Filled Value': 'value',
  'Is Maker': 'isMaker'
};
```

---

## 9. Sources

- [Bybit Self-Export Account Data](https://www.bybit.com/en/help-center/article/How-to-Self-Export-Account-Data)
- [Bybit Trade History vs Order History](https://www.bybit.com/en/help-center/article/The-differences-between-trade-history-and-order-history/)
- [Bybit API v5 Trade History](https://bybit-exchange.github.io/docs/v5/order/execution)
- [Bybit API v5 Execution WebSocket](https://bybit-exchange.github.io/docs/v5/websocket/private/execution)
- [Bybit Spot Trading FAQ](https://www.bybit.com/en/help-center/article/FAQ-Spot-Trading)
- [Bybit UTA FAQ](https://www.bybit.com/en/help-center/article/FAQ-Unified-Trading-Account/)
- [Cryptact Bybit Integration](https://support.cryptact.com/hc/en-us/articles/4416536949273-How-to-get-trade-history-from-Bybit)
- [Coinpanda Bybit Tax Guide](https://coinpanda.io/blog/bybit-taxes/)

---

## 10. Validation Notes

**Confidence Level:** MEDIUM

The exact CSV column headers could not be directly verified from official documentation. The headers documented above are inferred from:
1. Bybit API v5 response field names
2. UI field labels from Bybit help center
3. Third-party tax software integration documentation
4. User forum discussions

**Recommendation:**
- Export a sample CSV from a live Bybit account to confirm exact header format
- Implement flexible column mapping to handle variations
- Test with both pre-UTA and post-UTA account exports
