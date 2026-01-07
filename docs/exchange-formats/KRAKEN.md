# Kraken CSV Format Validation Report

**Last Updated:** 2026-01-07
**Status:** ⚠️ Needs Update
**Priority:** HIGH

## Current Support Status

TaxFormatter currently supports Kraken Spot & Futures exports.

## Format Changes Detected (2024-2025)

### Breaking Changes

1. **CSV Export Types Don't Match Documentation**
   - Kraken's official documentation no longer matches actual CSV exports
   - Field names and values have changed without documentation updates
   - This causes parsing failures with tools expecting documented format

2. **Staking Rewards Misclassified**
   - Documentation says staking rewards appear as `reward`
   - Actual exports show them as `deposit` + `staking` actions
   - The `deposit` entry can incorrectly inflate holdings

3. **Margin Trade Format Changes**
   - Margin trades now appear as `margin` → `settled` with `rollover` fees
   - `margin` type not documented on Kraken website
   - Existing parsers may not handle this sequence

4. **Transfer Type Ambiguity**
   - Some operations appear as `withdrawal`/`deposit` + two `transfer` rows
   - Some implementations treat `transfer` as airdrop (incorrect)

## Current Expected Columns

### Ledgers Export (Primary Format)
```csv
txid,refid,time,type,subtype,aclass,asset,amount,fee,balance
```

### Trades Export
```csv
txid,ordertxid,pair,time,type,ordertype,price,cost,fee,vol,margin,misc,ledgers
```

### Deposit/Withdrawal Export
```csv
txid,refid,time,type,subtype,aclass,asset,amount,fee,balance
```

## Column Changes Needed

| Current Parser | Actual Export | Action Required |
|----------------|---------------|-----------------|
| `txid` | `txid` | ✅ OK |
| `time` | `time` | ✅ OK (Unix or ISO) |
| `type` | `type` | ⚠️ New values found |
| `asset` | `asset` | ⚠️ Kraken uses unique symbols |
| `amount` | `amount` | ✅ OK |
| `fee` | `fee` | ✅ OK |
| - | `subtype` | ➕ New: Parse for context |
| - | `balance` | ➕ New: Useful for reconciliation |
| - | `refid` | ➕ New: Links related transactions |

### Asset Symbol Mapping
Kraken uses non-standard symbols that need mapping:

| Kraken Symbol | Standard | Notes |
|---------------|----------|-------|
| `XXBT` | `BTC` | Bitcoin |
| `XETH` | `ETH` | Ethereum |
| `ZUSD` | `USD` | US Dollar |
| `ZEUR` | `EUR` | Euro |
| `XXRP` | `XRP` | Ripple |
| `XLTC` | `LTC` | Litecoin |
| `XXDG` | `DOGE` | Dogecoin |

## New Transaction Types to Add

| Type | Subtype | Description | Tax Treatment |
|------|---------|-------------|---------------|
| `staking` | - | Stake assets | Non-taxable |
| `unstaking` | - | Unstake assets | Non-taxable |
| `reward` | `staking` | Staking reward (documented) | Income |
| `deposit` | `staking` | Staking reward (actual) | Income - PARSE CAREFULLY |
| `margin` | - | Open margin position | Track cost basis |
| `settled` | - | Close margin position | Capital gain/loss |
| `rollover` | - | Margin funding fee | Expense |
| `transfer` | `spottostaking` | Move to staking | Non-taxable |
| `transfer` | `stakingtospot` | Move from staking | Non-taxable |
| `transfer` | `spottomargin` | Move to margin | Non-taxable |
| `earn` | - | Kraken Earn rewards | Income |
| `instant` | `buy` | Instant buy | Standard buy |
| `instant` | `sell` | Instant sell | Standard sell |
| `conversion` | - | Asset conversion | Taxable trade |

## Validation Errors Found

1. **Staking Double-Count Risk**
   - Staking rewards appear as both `deposit` and `staking` rows
   - Must deduplicate using `refid` field
   - Current parser may double-count income

2. **Margin Position Tracking**
   - Margin trades require sequence tracking: `margin` → `rollover` → `settled`
   - Each `rollover` is a fee, not a trade
   - Final PNL at `settled` is the taxable event

3. **Transfer vs Airdrop Confusion**
   - `transfer` type incorrectly treated as airdrop by some parsers
   - Must check `subtype` to determine actual transaction purpose

4. **Asset Symbol Mapping**
   - Kraken's `XXBT`, `XETH` format not standard
   - Parser must normalize symbols for reporting

## Recommended Updates

### Immediate (P0)
- [ ] Add asset symbol mapping (XXBT→BTC, etc.)
- [ ] Fix staking reward detection (`deposit` + `staking` pattern)
- [ ] Use `refid` to link related transactions
- [ ] Add `subtype` parsing

### Short-term (P1)
- [ ] Add margin trade sequence handling
- [ ] Add `rollover` fee tracking
- [ ] Add `earn` transaction type
- [ ] Add `instant` buy/sell detection

### Medium-term (P2)
- [ ] Add Kraken Futures format support
- [ ] Add `conversion` transaction handling
- [ ] Support Kraken NFT transactions

## Test Files Needed

- [ ] `kraken-ledgers-2025.csv` - Current ledger format
- [ ] `kraken-trades-2025.csv` - Current trades format
- [ ] `kraken-staking-2025.csv` - Staking rewards format
- [ ] `kraken-margin-2025.csv` - Margin trades format
- [ ] `kraken-futures-2025.csv` - Futures format

## Known Issues with Third-Party Tools

From community reports:
- CoinTaxman throws errors on `staking` type (not recognized)
- Some tools treat `transfer` as airdrop incorrectly
- Margin trades require manual adjustment in most tools

## References

- [Kraken Export Guide](https://support.kraken.com/articles/208267878-how-to-export-your-account-history)
- [Kraken Action Types Issue](https://github.com/provinzio/CoinTaxman/issues/97)
- [Kraken Tax Guide - Divly](https://divly.com/en/wallets-and-exchanges/Kraken)
