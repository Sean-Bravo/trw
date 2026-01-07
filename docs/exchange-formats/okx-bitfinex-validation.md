# OKX and Bitfinex CSV Export Format Validation

**Research Date:** 2026-01-07
**Status:** Validated against BittyTax parsers and official documentation

---

## OKX Exchange

### Export Path
`Assets → Order Center → Trading History → Download`

Alternative paths:
- `Assets → Bills → Export` (for funding/ledger data)
- `Assets → Order Center → Funding History → Download`

### Instrument/Pair Format
OKX uses **dash-separated pairs**: `BTC-USDT`, `ETH-USDT`, `BTC-USD`

### CSV Column Headers

#### OKX Trades v2 (Current Format)
| Column | Description |
|--------|-------------|
| `id` | Trade identifier (may have BOM: `\ufeff id`) |
| `Order id` | Associated order ID |
| `Time` | Timestamp of trade |
| `Trade Type` | Type of trade |
| `Instrument` | Trading pair (e.g., BTC-USDT) |
| `Type` | Buy/Sell |
| `Amount` | Trade amount |
| `Unit` | Currency unit |
| `PL` | Profit/Loss |
| `Fee` | Fee charged |
| `Position Change` | Position delta |
| `Position Balance` | Current position |
| `Balance Change` | Balance delta |
| `Balance` | Current balance |

#### OKX Trades v1 (Legacy Format)
| Column | Description |
|--------|-------------|
| `time` | Timestamp (lowercase) |
| `type` | Transaction type |
| `size` | Trade size |
| `balance` | Account balance |
| `fee` | Fee charged |
| `currency` | Currency |

#### OKX Funding Export
| Column | Description |
|--------|-------------|
| `id` | Entry identifier (may have BOM) |
| `Time` | Timestamp |
| `Type` | Transaction type |
| `Amount` | Amount |
| `Before Balance` | Balance before transaction |
| `After Balance` | Balance after transaction |
| `Fee` | Fee charged |
| `Symbol` | Currency symbol |

### Fill Price Column Analysis

**DISCREPANCY FLAGGED:**
- **Expected:** `Fill Price`, `avg_fill_price`
- **Actual:** Neither `Fill Price` nor `avg_fill_price` columns exist in OKX CSV exports
- **Finding:** OKX uses `Amount` and trade values rather than explicit fill price columns
- **API Fields:** The OKX API uses `fillPx` (fill price) and `avgPx` (average price), but CSV exports use different column naming

### Export Limitations
- Maximum 3 months via API
- Maximum 1 year via web export
- Files are delivered as ZIP archives
- Data available from February 2021 onwards

---

## Bitfinex Exchange

### Export Path
`Reports → My History → [Select Report Type] → Export CSV`

Direct URL: `https://report.bitfinex.com/`

### Pair Format
Bitfinex uses **prefix notation**: `tBTCUSD`, `tETHUSD`, `tLTCBTC`
- `t` prefix = trading pair
- `f` prefix = funding currency (e.g., `fUSD`)

### CSV Column Headers

#### Bitfinex Trades
| Column | Description |
|--------|-------------|
| `#` | Row/entry number |
| `PAIR` | Trading pair (e.g., tBTCUSD) |
| `AMOUNT` | Trade amount |
| `PRICE` | Trade price |
| `FEE` | Fee amount |
| `FEE PERC` | Fee percentage (may contain `-`) |
| `FEE CURRENCY` | Fee currency |
| `DATE` | Trade date |
| `ORDER ID` | Associated order ID |

#### Bitfinex Deposits/Withdrawals (Movements)
| Column | Description |
|--------|-------------|
| `#` | Row/entry number |
| `DATE` | Transaction date |
| `CURRENCY` | Currency |
| `STATUS` | Transaction status |
| `AMOUNT` | Amount |
| `FEES` | Fees charged |
| `DESCRIPTION` | Transaction description |
| `TRANSACTION ID` | Blockchain/internal TX ID |
| `NOTE` | Additional notes |

#### Bitfinex Ledger
| Column | Description |
|--------|-------------|
| `#` | Row/entry number |
| `DESCRIPTION` | Entry description |
| `CURRENCY` | Currency |
| `AMOUNT` | Amount |
| `BALANCE` | Account balance |
| `DATE` | Entry date |
| `WALLET` | Wallet type |

### The `#` Column
**CONFIRMED:** The `#` column is present in all Bitfinex export types and represents the row/entry number.

### Export Configuration
- Date format options: `DD-MM-YY`, `MM-DD-YY`, `YY-MM-DD`
- Recommended: `DD-MM-YY` (default)
- Option to display milliseconds (recommended: OFF for most use cases)
- Reports sent to linked email in CSV format

### Known Issues
- Date export format may be broken intermittently
- Recommended workaround: Try `DD-MM-YY` first, then `YY-MM-DD` if incorrect

---

## Discrepancy Analysis

### OKX: Expected vs Actual

| Expected Column | Actual Column | Status |
|-----------------|---------------|--------|
| `Time` | `Time` | **MATCH** |
| `Instrument` | `Instrument` | **MATCH** |
| `Side` | `Type` | **PARTIAL** - Column named `Type` not `Side` |
| `Fill Price` | N/A | **MISSING** - No explicit fill price column |
| `Fill Size` | `Amount` | **PARTIAL** - Column named `Amount` not `Fill Size` |
| `Fee` | `Fee` | **MATCH** |
| `Fee Currency` | `Unit` | **PARTIAL** - Uses `Unit` column |

**Key Findings:**
1. No `fill_price` or `avg_fill_price` columns in CSV exports
2. Column naming differs between API (`fillPx`, `fillSz`) and CSV exports (`Amount`, `Fee`)
3. `Side` is called `Type` in exports

### Bitfinex: Expected vs Actual

| Expected Column | Actual Column | Status |
|-----------------|---------------|--------|
| `#` | `#` | **MATCH** |
| `Currency` | `CURRENCY` | **MATCH** (uppercase in exports) |
| `Pair` | `PAIR` | **MATCH** (uppercase, trades only) |
| `Amount` | `AMOUNT` | **MATCH** (uppercase) |
| `Balance` | `BALANCE` | **MATCH** (uppercase, ledger only) |
| `Description` | `DESCRIPTION` | **MATCH** (uppercase) |
| `Date` | `DATE` | **MATCH** (uppercase) |

**Key Findings:**
1. All expected columns present
2. Column names are UPPERCASE in exports
3. `Pair` column uses `tBTCUSD` format with `t` prefix
4. `#` column confirmed present in all export types

---

## API Reference Fields

### OKX API v5 Trade Fields
```
instId, side, fillPx, fillSz, fee, feeCcy, execType, ts, tradeId, ordId
```

### Bitfinex API v2 Trade Fields
```
ID, PAIR, MTS_CREATE, ORDER_ID, EXEC_AMOUNT, EXEC_PRICE, ORDER_TYPE, ORDER_PRICE, MAKER, FEE, FEE_CURRENCY
```

---

## Sources

- [OKX API Documentation](https://www.okx.com/docs-v5/en/)
- [OKX Help - Download Statements](https://www.okx.com/en-us/help/how-do-i-download-my-statements)
- [Bitfinex API Documentation](https://docs.bitfinex.com/reference/rest-auth-ledgers)
- [Bitfinex Help - Trades Reports](https://support.bitfinex.com/hc/en-us/articles/115003361173-What-are-my-Trades-Reports)
- [BittyTax Exchange Parsers](https://github.com/BittyTax/BittyTax) - Validated column structures
- [CoinTracking Import Guides](https://cointracking.info/import/)
