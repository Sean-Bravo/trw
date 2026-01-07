# Cash App & Robinhood Crypto CSV Export Format Validation

**Research Date:** January 2026
**Status:** Validated with discrepancies noted

---

## Cash App

### Export Path
1. **Desktop (Primary):** Log in to [cash.app/account](https://cash.app/account)
2. Navigate to **Statements** (top right corner)
3. Click **Export CSV**
4. For Bitcoin transactions: Use search bar to filter "Bitcoin" and set date range

**Alternative Path:**
- Profile → Documents → Statements → Export CSV
- Activity → Download (for transaction history)

### Bitcoin Transaction CSV Columns

#### Expected Format (per requirements):
| Column | Description |
|--------|-------------|
| Date | Transaction timestamp |
| Transaction Type | e.g., "Bitcoin Sale", "Bitcoin Buy" |
| Asset Type | e.g., "BTC", "Bitcoin" |
| Asset Amount | Quantity of crypto |
| Currency | Fiat currency (USD) |
| Amount | Fiat value |

#### Actual Format (researched):

**General Activity Export:**
| Column | Description |
|--------|-------------|
| Date | Transaction date |
| Title / Note | Transaction description |
| Amount | Dollar value (positive/negative) |

**Bitcoin/Tax Export (1099-B related):**
- Cash App provides Form 1099-B for Bitcoin sales
- Gain/Loss CSV available for tax years
- Format varies by year and report type

### Discrepancies Flagged

| Issue | Details |
|-------|---------|
| Column naming differs | Actual exports use "Title/Note" instead of "Transaction Type" |
| Asset columns unclear | "Asset Type" and "Asset Amount" not confirmed as separate columns |
| Multiple export types | Different formats for general vs. Bitcoin-specific exports |
| Cost basis gaps | 1099-B often has blank Cost Basis fields for transferred BTC |

### Transaction Type Naming Conventions
Based on research, transaction types appear in the Title/Note field as:
- "Bitcoin" (general Bitcoin activity)
- Sales and purchases identified contextually
- Exact naming conventions (e.g., "Bitcoin Sale", "Bitcoin Buy") **not confirmed**

### Format Changes
- Tax year 2022+: CSV files available through tax services
- Format appears to have changed over time (BittyTax added "new export format" parser)
- Bitcoin-specific exports separate from regular P2P payment history

---

## Robinhood

### Export Path
1. Log in to Robinhood app or web
2. **Account** → **History**
3. Click **Export All** (right side)
4. Select date range → **Export**

**For Tax/Crypto 1099:**
1. Account → Tax Documents
2. Hover over "(Year) - Robinhood Crypto 1099"
3. Select **Download CSV** (not PDF)

**Custom Reports:**
- Account → Reports → Customize your report
- Select account type, date range
- Reports generate in 2-24 hours

### Crypto CSV Columns

#### Expected Format (per requirements):
| Column | Description |
|--------|-------------|
| Activity Date | Transaction timestamp |
| Type | Transaction type |
| Token | Cryptocurrency symbol |
| Quantity Transacted | Amount of crypto |
| Price | Per-unit price |
| Amount | Total fiat value |

#### Actual Format (researched):

**Account Activity Export:**
| Column | Description |
|--------|-------------|
| symbol | Cryptocurrency symbol (e.g., "BTC", "ETH") |
| date | ISO 8601 timestamp |
| order_type | Type of order |
| side | "buy" or "sell" |
| fees | Transaction fees (note: typically $0 - see spread note) |
| quantity | Amount of cryptocurrency |
| average_price | Price per unit |

**Third-Party Tools Report:**
| Column | Description |
|--------|-------------|
| date | Transaction date |
| type | Transaction type |
| symbol | Crypto symbol |
| action | Buy/Sell |
| quantity | Amount |
| price | Unit price |
| amount | Total value |
| fees | Fees charged |
| details | Additional info |

### Discrepancies Flagged

| Issue | Details |
|-------|---------|
| "Activity Date" vs "date" | Column may be named "date" not "Activity Date" |
| "Token" vs "symbol" | Column named "symbol" not "Token" |
| "Quantity Transacted" vs "quantity" | Simpler naming used |
| Fee representation | Fees column exists but typically shows $0 |

### Fee Structure Note
**Robinhood hides fees in spread** - This is confirmed. Robinhood's crypto trading has no explicit commission fees, but costs are embedded in the bid-ask spread. The "fees" column in CSV exports typically shows $0 or minimal values, as the actual cost is in the execution price difference.

### Activity Date Format
- **Format:** ISO 8601 with microseconds
- **Pattern:** `YYYY-MM-DDTHH:MM:SS.ffffffZ`
- **Example:** `2015-08-20T12:21:48.833890Z`
- **Timezone:** UTC (Z suffix)

### Format Changes
- **2025 Tax Year:** New Form 1099-DA for digital assets (replacing 1099-B for crypto)
- CSV transaction files available after Consolidated 1099s are generated
- Historical data limited to ~1 year in standard exports

---

## Comparison Summary

| Feature | Cash App | Robinhood |
|---------|----------|-----------|
| Export location | Statements → Export CSV | Account → History → Export All |
| Date format | Standard date | ISO 8601 with microseconds |
| Fee visibility | Included in transactions | Hidden in spread ($0 shown) |
| Asset identifier | In description/note | Dedicated "symbol" column |
| Historical data | Via tax documents | ~1 year rolling |
| New 2025 forms | 1099-B | 1099-DA (new) |

---

## Validation Status

### Cash App
- **Export Path:** Confirmed (Profile → Documents → Statements alternate path NOT verified)
- **Columns:** Partial match - exact Bitcoin-specific column names need sample file verification
- **Transaction Types:** Naming convention **not confirmed** - requires sample export

### Robinhood
- **Export Path:** Confirmed (Account → History → Crypto path should work via Export All)
- **Columns:** Close match with naming variations (symbol vs Token, etc.)
- **Fee Handling:** Confirmed - spread-based fees, $0 in CSV
- **Date Format:** Confirmed - ISO 8601

---

## Recommendations

1. **Obtain sample exports** from both platforms to verify exact column headers
2. **Handle column name variations** in parser:
   - Cash App: Accept both "Transaction Type" and "Title"/"Note"
   - Robinhood: Map "symbol" to "Token", "quantity" to "Quantity Transacted"
3. **Date parsing:**
   - Cash App: Standard date parser
   - Robinhood: ISO 8601 parser with timezone handling
4. **Fee calculations for Robinhood:** Consider spread impact when computing actual costs

---

## Sources

- [Cash App Bitcoin Taxes](https://cash.app/help/us/en-us/3104-bitcoin-taxes)
- [Accessing Cash App Gain Loss CSV](https://cash.app/help/31042-accessing-your-cash-app-gain-loss-csv)
- [Robinhood Finding Reports and Statements](https://robinhood.com/us/en/support/articles/finding-your-reports-and-statements/)
- [Robinhood Taxes and Forms](https://robinhood.com/us/en/support/articles/taxes-and-forms/)
- [BittyTax Cash App Parser](https://github.com/BittyTax/BittyTax)
- [robin_stocks Python Library](https://robin-stocks.readthedocs.io/)
