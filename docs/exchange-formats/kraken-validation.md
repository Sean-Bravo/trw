# Kraken CSV Export Format Validation

> **Last Updated:** January 2026
> **Status:** Validated against BittyTax parser, CCXT library, and official Kraken API docs

## 1. Export Path

**Location:** History → Export (Kraken Pro) or Account → History → Export (Kraken.com)

**Export Types Available:**
- **Ledgers** - Complete transaction history (recommended for tax software)
- **Trades** - Trading activity only

## 2. Ledger CSV Column Headers

### Current Format (2024-2025)

Kraken's ledger export supports multiple column configurations. The most complete format:

| Column | Type | Description |
|--------|------|-------------|
| `txid` | string | Unique transaction ID for each ledger entry |
| `refid` | string | Reference ID - links related transactions together |
| `time` | timestamp | Transaction timestamp |
| `type` | string | Transaction type (see Section 5) |
| `subtype` | string | Additional classification (e.g., spotfromstaking) |
| `aclass` | string | Asset class (usually "currency") |
| `asset` | string | Asset code (see Section 4 for naming) |
| `amount` | decimal | Transaction amount (negative = debit, positive = credit) |
| `fee` | decimal | Fee charged for transaction |
| `balance` | decimal | Account balance after transaction |

### Optional Columns (format variants)

| Column | Description |
|--------|-------------|
| `subclass` | Sub-classification field |
| `wallet` | Wallet identifier |
| `amountusd` | Amount in USD equivalent |

### Comparison with Expected Columns

**Expected:** `time, txid, refid, type, asset, amount, fee, balance`

**Actual Kraken Format:**
```
txid, refid, time, type, subtype, aclass, asset, amount, fee, balance
```

#### Discrepancies Found

| Field | Expected | Actual | Notes |
|-------|----------|--------|-------|
| Column order | time first | txid first | ⚠️ Different ordering |
| `subtype` | Not expected | Present | ✅ Additional field (optional) |
| `aclass` | Not expected | Present | ✅ Additional field (asset class) |

**Resolution:** The expected columns are all present, but Kraken includes additional columns (`subtype`, `aclass`) and uses a different column order.

## 3. Two-Row-Per-Trade Behavior

### Confirmed: Yes

Each trade generates **two separate ledger entries** with the same `refid`:

**Example: Buy 0.01 BTC for 500 USD**

| txid | refid | type | asset | amount | fee | balance |
|------|-------|------|-------|--------|-----|---------|
| L001 | T-ABC | trade | ZUSD | -500.00 | 0.50 | 1500.00 |
| L002 | T-ABC | trade | XXBT | 0.01 | 0.00 | 0.51 |

**Key behaviors:**
- Both rows share the same `refid` value
- Sold asset shows negative amount (debit)
- Bought asset shows positive amount (credit)
- Fees may appear on either row or as separate entries
- Use `refid` to match the two sides of each trade

### Trade Consolidation Logic

When processing Kraken ledgers for tax purposes:
1. Group rows by `refid`
2. Identify the sold asset (negative amount)
3. Identify the bought asset (positive amount)
4. Sum fees across both rows

## 4. Asset Naming Conventions

Kraken uses a proprietary asset naming system with prefixes:

### Prefix System

| Prefix | Meaning | Examples |
|--------|---------|----------|
| `X` | Non-fiat (crypto) | XXBT, XETH, XLTC |
| `Z` | Fiat currency | ZUSD, ZEUR, ZGBP, ZCAD, ZJPY |

### Common Asset Mappings

| Kraken Code | Standard Symbol | Notes |
|-------------|-----------------|-------|
| `XXBT` | BTC | Bitcoin (XBT is ISO code) |
| `XETH` | ETH | Ethereum |
| `XLTC` | LTC | Litecoin |
| `XXRP` | XRP | Ripple |
| `XXDG` | DOGE | Dogecoin |
| `XXLM` | XLM | Stellar |
| `ZUSD` | USD | US Dollar |
| `ZEUR` | EUR | Euro |
| `ZGBP` | GBP | British Pound |
| `ZCAD` | CAD | Canadian Dollar |

### Staking Suffixes

Staked assets use suffixes:

| Suffix | Meaning |
|--------|---------|
| `.S` | Standard staking |
| `.M` | Margin variant |
| `.P` | Parachain variant |
| `.HOLD` | Hold/lock variant |
| `XX.S` | Numbered staking variants (03.S through 28.S) |

**Examples:**
- `ETH.S` → Staked ETH
- `DOT.S` → Staked Polkadot
- `ETH2.S` → ETH 2.0 staking

### Normalization Algorithm

```
1. Check ALT_ASSETS mapping (XXBT → XBT, ZUSD → USD)
2. Convert XBT → BTC
3. Strip staking suffixes (.S, .M, .P, .HOLD)
```

## 5. Timestamp Format

### Format: ISO 8601 DateTime String

**CSV Export:** `YYYY-MM-DD HH:MM:SS` (e.g., `2025-01-15 14:30:45`)

**API Response:** Unix timestamp in seconds with fractional precision (e.g., `1520103488.314`)

**Timezone:** UTC

### Important Notes
- CSV exports use human-readable ISO format
- API responses use Unix timestamps (seconds, not milliseconds)
- All times are in UTC - no timezone offset included

## 6. Transaction Types

| Type | Description |
|------|-------------|
| `deposit` | Funds deposited to account |
| `withdrawal` | Funds withdrawn from account |
| `trade` | Buy/sell transaction (generates 2 rows) |
| `margin` | Margin trading activity |
| `staking` | Staking rewards |
| `earn` | Earn program rewards |
| `transfer` | Internal transfers (spotfromstaking, stakingfromspot) |
| `adjustment` | Account adjustments, airdrops |
| `settled` | Futures settlement |

### Subtypes

Common `subtype` values:
- `spotfromstaking` - Unstake to spot
- `stakingfromspot` - Stake from spot
- `spottofutures` - Spot to futures
- `reward` - Earn reward
- `migration` - Asset migration
- `allocation` - Earn allocation

## 7. Format Changes (2024-2025)

### July 2024
- New export format introduced
- Trading pairs now use `/` separator (e.g., `BTC/USD` instead of `XBTUSD`)

### April 2024
- `adjustment` transaction type added
- Fees now appear as negative numbers in new format
- Trading pair separator changed from concatenated to `/` format

### 2025 Updates
- Additional column configurations supported
- New staking suffixes for additional assets

## 8. Sample Data

### Ledger Export Sample

```csv
"txid","refid","time","type","subtype","aclass","asset","amount","fee","balance"
"LXXXXX-XXXXX-XXXXXX","TYYYYY-YYYYY-YYYYYY","2025-01-15 10:30:00","trade","","currency","ZUSD","-500.25","0.50","4500.00"
"LXXXXX-XXXXX-XXXXXY","TYYYYY-YYYYY-YYYYYY","2025-01-15 10:30:00","trade","","currency","XXBT","0.01","0.00","0.51"
"LXXXXX-XXXXX-XXXXYZ","RZZZZZ-ZZZZZ-ZZZZZZ","2025-01-16 08:00:00","staking","","currency","ETH.S","0.001","0.00","2.501"
"LXXXXX-XXXXX-XXXXXW","","2025-01-17 12:00:00","deposit","","currency","ZUSD","1000.00","0.00","5500.00"
```

### ID Format

- **txid:** `LXXXXX-XXXXX-XXXXXX` (ledger entry ID)
- **refid:** `TYYYYY-YYYYY-YYYYYY` (trade reference) or `RZZZZZ...` (other)
- Pattern: Letter prefix + 5 chars + hyphen + 5 chars + hyphen + 6 chars

## 9. Validation Checklist

When validating Kraken CSV imports:

- [ ] Verify column headers match expected format
- [ ] Handle both old and new column orders
- [ ] Parse asset codes with X/Z prefix handling
- [ ] Strip staking suffixes for base asset identification
- [ ] Group trades by `refid` to consolidate two-row entries
- [ ] Handle negative amounts for fees in new format
- [ ] Parse ISO 8601 timestamps (UTC)
- [ ] Recognize all transaction types including `adjustment`

## 10. Sources

- BittyTax Kraken Parser (GitHub)
- CCXT Kraken Implementation (GitHub)
- Kraken REST API Documentation
- Community tax software implementations

---

*This document should be updated when Kraken announces format changes.*
