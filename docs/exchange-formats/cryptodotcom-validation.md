# Crypto.com App CSV Export Format Validation

**Last Updated:** 2025-01-07
**Source:** Web research, BittyTax parser analysis, crypto tax software documentation

---

## Export Path

**Navigation:** Accounts → Transaction History (clock icon, top right) → Export (top right)

### Export Options
1. Select wallet type: **Crypto Wallet**, Fiat Wallet, or Crypto.com Visa Card
2. Set Start and End Date (inclusive)
3. Tap "Export to CSV"
4. Download from Export History (available for 30 days)

### Limitations
- Maximum 1 year per export (some sources say up to 3 years)
- Export History shows last 30 generated reports
- Transaction history from November 1, 2022 onward available

---

## CSV Column Headers

| Column | Description |
|--------|-------------|
| `Timestamp (UTC)` | Transaction timestamp in UTC |
| `Transaction Description` | Human-readable description |
| `Currency` | Source/primary currency symbol |
| `Amount` | Transaction amount (negative = outflow) |
| `To Currency` | Destination currency (for swaps/exchanges) |
| `To Amount` | Destination amount (for swaps/exchanges) |
| `Native Currency` | User's native/local currency |
| `Native Amount` | Value in native currency |
| `Native Amount (in USD)` | Value in USD at time of transaction |
| `Transaction Kind` | Transaction type identifier |
| `Transaction Hash` | Blockchain transaction hash (if applicable) |

---

## Timestamp Format

**Format:** `YYYY-MM-DD HH:mm:ss`
**Timezone:** UTC

Example: `2024-03-15 14:30:45`

---

## Native Amount Columns

Two native amount columns are provided:
1. **`Native Amount`** - Value in user's configured native currency
2. **`Native Amount (in USD)`** - Value converted to USD

These represent the fair market value at the time of the transaction.

---

## Transaction Kind Values (Comprehensive List)

### Trading & Purchases (11 types)

| Transaction Kind | Description | Tax Treatment |
|-----------------|-------------|---------------|
| `crypto_purchase` | Direct crypto purchase with fiat | Cost basis acquisition |
| `crypto_sell` | Sell crypto for fiat | Taxable disposal |
| `crypto_exchange` | Crypto-to-crypto swap | Taxable disposal/acquisition |
| `viban_purchase` | Purchase via Virtual IBAN | Cost basis acquisition |
| `van_purchase` | Purchase via Virtual Account Number | Cost basis acquisition |
| `crypto_viban_exchange` | Exchange via Virtual IBAN | Taxable event |
| `crypto_to_van_sell_order` | Sell to Virtual Account Number | Taxable disposal |
| `trading.limit_order.fiat_wallet.sell_commit` | Limit order sell execution | Taxable disposal |
| `recurring_buy_order` | Automated recurring purchase | Cost basis acquisition |
| `dust_conversion_debited` | Small balance conversion (outflow) | Taxable disposal |
| `dust_conversion_credited` | Small balance conversion (inflow) | Cost basis acquisition |

### Deposits & Withdrawals (4 types)

| Transaction Kind | Description | Tax Treatment |
|-----------------|-------------|---------------|
| `crypto_deposit` | Incoming crypto deposit | Non-taxable (transfer) |
| `crypto_withdrawal` | Outgoing crypto withdrawal | Non-taxable (transfer) |
| `crypto_to_exchange_transfer` | Transfer to Crypto.com Exchange | Non-taxable (internal) |
| `exchange_to_crypto_transfer` | Transfer from Crypto.com Exchange | Non-taxable (internal) |

### Transfers (1 type)

| Transaction Kind | Description | Tax Treatment |
|-----------------|-------------|---------------|
| `crypto_transfer` | P2P crypto transfer | Gift sent (negative) or received (positive) |

### Earn & Interest (8 types)

| Transaction Kind | Description | Tax Treatment |
|-----------------|-------------|---------------|
| `crypto_earn_interest_paid` | Crypto Earn interest payment | Income |
| `crypto_earn_extra_interest_paid` | Bonus interest from Earn | Income |
| `mco_stake_reward` | MCO/CRO staking rewards | Income |
| `supercharger_reward_to_app_credited` | Supercharger program rewards | Income |
| `finance.lockup.dpos_compound_interest.crypto_wallet` | Compound interest from locked staking | Income |
| `finance.dpos.non_compound_interest.crypto_wallet` | Simple interest from DPoS staking | Income |
| `finance.dpos.compound_interest.crypto_wallet` | Compound interest from DPoS | Income |
| `finance.dpos.staking.crypto_wallet` | Coins locked for staking | Non-taxable (lockup) |

### Bonuses & Rewards (7 types)

| Transaction Kind | Description | Tax Treatment |
|-----------------|-------------|---------------|
| `referral_bonus` | Referral program bonus | Income |
| `referral_gift` | Gift from referral program | Income |
| `referral_card_cashback` | Referral-related card cashback | Income/Rebate |
| `transfer_cashback` | Cashback from transfers | Income |
| `reimbursement` | Subscription/fee reimbursement | Income |
| `rewards_platform_deposit_credited` | Platform rewards deposit | Income |
| `campaign_reward` | Marketing campaign reward | Income |

### Card Transactions (4 types)

| Transaction Kind | Description | Tax Treatment |
|-----------------|-------------|---------------|
| `card_top_up` | Crypto used to top up card | Taxable disposal |
| `card_cashback_reverted` | Cashback clawback | Negative income |
| `reimbursement_reverted` | Reimbursement clawback | Negative income |
| `crypto_payment` | Pay for goods/services | Taxable disposal |

### Other Credits (2 types)

| Transaction Kind | Description | Tax Treatment |
|-----------------|-------------|---------------|
| `gift_card_reward` | Reward from gift card purchase | Income |
| `admin_wallet_credited` | Administrative credit | Income |

### Non-Taxable/Internal Events (Ignored)

These transaction kinds represent internal movements and do not trigger taxable events:

| Transaction Kind | Description |
|-----------------|-------------|
| `crypto_earn_program_created` | Earn position opened |
| `crypto_earn_program_withdrawn` | Earn position closed |
| `lockup_lock` | Tokens locked for staking |
| `lockup_unlock` | Tokens unlocked from staking |
| `lockup_upgrade` | Staking tier upgrade |
| `lockup_swap_debited` | Lockup swap outflow |
| `lockup_swap_credited` | Lockup swap inflow |
| `dynamic_coin_swap_debited` | Dynamic swap outflow |
| `dynamic_coin_swap_credited` | Dynamic swap inflow |
| `dynamic_coin_swap_bonus_exchange_deposit` | Swap bonus deposit |
| `interest_swap_debited` | Interest swap outflow |
| `interest_swap_credited` | Interest swap inflow |
| `crypto_wallet_swap_debited` | Wallet swap outflow |
| `crypto_wallet_swap_credited` | Wallet swap inflow |
| `supercharger_deposit` | Supercharger stake deposit |
| `supercharger_withdrawal` | Supercharger stake withdrawal |
| `council_node_deposit_created` | Council node stake |
| `trading.limit_order.fiat_wallet.buy/sell` | Limit order placements |
| `finance.dpos.staking.crypto_wallet` | Staking position creation |
| `finance.dpos.unstaking.crypto_wallet` | Unstaking initiation |

---

## New Transaction Kinds (2024-2025)

The following transaction kinds have been added or identified in 2024-2025:

| Transaction Kind | Added | Source |
|-----------------|-------|--------|
| `finance.dpos.unstaking.crypto_wallet` | 2024 | BittyTax v0.6.0 |
| `finance.dpos.compound_interest.crypto_wallet` | 2024 | BittyTax v0.6.0 |
| `recurring_buy_order` | 2024 | BittyTax v0.6.0 |
| `finance.lockup.dpos_lock.crypto_wallet` | 2024 | BittyTax v0.6.0 |

---

## Discrepancy Report

### Transaction Kinds in Expected List vs. Documented

| Expected | Status | Notes |
|----------|--------|-------|
| `crypto_purchase` | CONFIRMED | Active |
| `crypto_sell` | CONFIRMED | Active (may appear as `crypto_to_van_sell_order`) |
| `crypto_exchange` | CONFIRMED | Active |
| `crypto_deposit` | CONFIRMED | Active |
| `crypto_withdrawal` | CONFIRMED | Active |
| `crypto_earn_interest_paid` | CONFIRMED | Active |
| `referral_card_cashback` | CONFIRMED | Active |
| `rewards_platform_deposit_credited` | CONFIRMED | Active |
| `reimbursement` | CONFIRMED | Active |
| `referral_bonus` | CONFIRMED | Active |
| `supercharger_reward_to_app_credited` | CONFIRMED | Active |

### Additional Transaction Kinds NOT in Expected List

The following 25+ transaction kinds exist but were NOT in the provided expected list:

**Trading/Purchase variants:**
- `viban_purchase`
- `van_purchase`
- `crypto_viban_exchange`
- `crypto_to_van_sell_order`
- `trading.limit_order.fiat_wallet.sell_commit`
- `recurring_buy_order`
- `dust_conversion_debited`
- `dust_conversion_credited`

**Transfer variants:**
- `crypto_transfer`
- `crypto_to_exchange_transfer`
- `exchange_to_crypto_transfer`

**Earn/Staking variants:**
- `crypto_earn_extra_interest_paid`
- `mco_stake_reward`
- `finance.lockup.dpos_compound_interest.crypto_wallet`
- `finance.dpos.non_compound_interest.crypto_wallet`
- `finance.dpos.compound_interest.crypto_wallet`
- `finance.dpos.staking.crypto_wallet`
- `finance.dpos.unstaking.crypto_wallet`

**Bonus/Reward variants:**
- `referral_gift`
- `transfer_cashback`
- `campaign_reward`
- `gift_card_reward`
- `admin_wallet_credited`

**Card variants:**
- `card_top_up`
- `card_cashback_reverted`
- `reimbursement_reverted`
- `crypto_payment`

---

## File Types Generated

When exporting, Crypto.com generates multiple CSV files:

| File | Contents |
|------|----------|
| `crypto_transactions_record_*.csv` | Crypto wallet transactions |
| `fiat_transactions_record_*.csv` | Fiat wallet transactions |
| `card_transactions_record_*.csv` | Visa card transactions |

**Important:** Upload `crypto_transactions_record` and `fiat_transactions_record` together. The `card_transactions_record` is already covered by the other two files.

### Known Duplicate Issue

Some transactions (e.g., `viban_purchases`) appear in BOTH `fiat_transactions_record` and `crypto_transactions_record` with slightly different timestamps. Manual deduplication may be required.

---

## Unsupported in CSV Export

The following are NOT included in CSV exports:
- Fiat deposits on direct credit card purchases
- Fee payments (rolled into transaction amounts)
- USD Bundle conversions
- Dust conversions (pre-2023)
- NFT transactions (limited support)

---

## Sources

- [Crypto.com Help Center - Export Transaction History](https://help.crypto.com/en/articles/3438579-how-do-i-export-my-transaction-history-app)
- [BittyTax GitHub - cryptocom.py parser](https://github.com/BittyTax/BittyTax)
- [BittyTax CHANGELOG](https://github.com/BittyTax/BittyTax/blob/master/CHANGELOG.md)
- [Blockpit - Crypto.com CSV Import](https://help.blockpit.io/hc/en-us/articles/7697384508700-How-to-import-data-via-Crypto-com-App-CSV-file)
- [Koinly - Crypto.com Integration](https://koinly.io/integrations/crypto-com/)

---

## Total Transaction Kind Count

**Taxable/Income Events:** 37 types
**Non-Taxable/Internal Events:** 20+ types
**Total Documented:** 57+ transaction kinds

This exceeds the expected 25+ mentioned in the research request.
