---
title: DeFi Token Classification
description: Understanding DeFi transactions and their tax treatment
order: 4
---

# DeFi Token Classification

DeFi (Decentralized Finance) transactions can have complex tax implications. Here's how to classify and report them.

## Common DeFi Transactions

DeFi includes:
- Swaps (DEX trading)
- Yield farming (LP rewards)
- Lending/Borrowing
- Staking in protocols
- Smart contract interactions

## Transaction Classification

Different DeFi actions have different tax treatments:

### 1. Token Swaps

**What:** Exchange one token for another (e.g., ETH → DAI)

**Tax treatment:** Capital gain/loss
- Sale of original token
- Purchase of new token
- Report on Schedule D

**Example:**
```
Swap 1 ETH (cost basis $2,000) for 2,000 DAI at $3,000
= $1,000 capital gain
```

### 2. Liquidity Pool (LP) Deposits

**What:** Deposit tokens into a DEX liquidity pool

**Tax treatment:** Not immediately taxable
- You still own the tokens (in LP form)
- Tax event when you withdraw or sell LP tokens

**Example:**
```
Deposit 1 ETH + 2,000 DAI into Uniswap
= No tax event yet
You receive LP tokens representing your share
```

### 3. LP Rewards

**What:** Earn trading fees from providing liquidity

**Tax treatment:** Ordinary income
- Recognized when earned
- Report on Schedule 1 as "Other Income"

**Example:**
```
Provide liquidity
Earn 0.5 ETH in trading fees over month
= $1,500 ordinary income when earned
```

### 4. Yield Farming

**What:** Earn governance tokens or rewards from protocols

**Tax treatment:** Ordinary income
- Recognized when received
- Report on Schedule 1

**Example:**
```
Farm 100 UNI tokens by providing liquidity
UNI price: $6.00 = $600 ordinary income
```

### 5. Smart Contract Interactions

**What:** Calling functions that auto-execute transactions

**Tax treatment:** Depends on the action
- Swap: Capital gain/loss
- Claim rewards: Ordinary income
- Unstake: Capital gain/loss

## Real-World DeFi Example

Let's trace a complete DeFi experience:

```
Step 1: Swap (Capital Event)
- Sell 1 BTC (basis $40,000) for 20 ETH at $50,000
- Capital gain: $10,000

Step 2: Provide Liquidity (No immediate tax)
- Deposit 10 ETH + 200,000 USDC into Uniswap
- Receive LP tokens
- No tax event

Step 3: Earn Fees (Income Event)
- Earn 0.2 ETH in trading fees = $600 ordinary income

Step 4: Yield Farm (Income Event)
- Earn 50 UNI tokens at $5.50 = $275 ordinary income

Step 5: Withdraw Liquidity (Capital Event)
- Withdraw 10.2 ETH + 202,000 USDC
- LP tokens no longer exist
- Calculate gain/loss based on:
  * Deposit value vs withdrawal value
  * Impermanent loss (if any)

Step 6: Sell Everything (Capital Event)
- Sell 10.2 ETH at $48,000 = -$960 loss
- Sell 202,000 USDC at par = $0 gain
- Report losses
```

## Impermanent Loss

**What:** Loss from price changes while providing liquidity

```
Deposit: 1 ETH ($3,000) + 3,000 DAI
ETH price drops to $2,000
When you withdraw: 1.5 ETH + 2,000 DAI
You have less DAI but more ETH
= Impermanent loss if you sold at lower ETH price
```

**Tax treatment:** 
- Generally **not deductible** per IRS guidance
- But may affect your capital gain/loss calculation

**TaxFormatter approach:**
- We flag impermanent loss
- We note it in your CSV
- We calculate your actual gain/loss on withdrawal
- You can consult a tax pro on deductibility

## Flash Loans

**What:** Borrow tokens with no collateral for 1 transaction

**Tax treatment:** Generally not taxable
- You borrow and repay in same block
- If you profit from arb: capital gain
- If you lose: capital loss

**Example:**
```
Flash borrow 1,000 USDC
Use in arbitrage: Sell USDC, buy token, sell for profit
Repay 1,000 USDC + fee
= Capital gain from the arbitrage

vs

Flash borrow, arbitrage fails, repay with loss
= Capital loss
```

## Smart Contract Migration

**What:** Protocol asks users to migrate to new contract

```
Old: Have 1,000 oldToken
New: Migrate to 1,000 newToken
oldToken removed from wallet, newToken added
```

**Tax treatment:** Generally NOT a taxable event
- Same token, new contract
- No economic event occurred
- TaxFormatter flags to exclude from trades

## Wrapped Tokens

**What:** Original token bridged to another chain with wrapper

```
Have 1 BTC on Ethereum (WBTC)
Bridge to Bitcoin blockchain (1:1)
WBTC → BTC
```

**Tax treatment:** Generally NOT a taxable event
- Same asset, different form
- Not a "sale" of one for another
- TaxFormatter normalizes to single asset

## Pro Tier DeFi Features

TaxFormatter Pro handles:

1. **Transaction classification** - Identifies swap vs LP vs farming
2. **LP tracking** - Monitors deposits, fees, withdrawals
3. **Reward aggregation** - Sums all earning events
4. **Impermanent loss flagging** - Notes for your tax pro
5. **Chain normalization** - Treats same token across chains as one asset
6. **Bridge transactions** - Excludes from taxable events

Example Pro annotation:
```
Type: DEFI_SWAP
Pair: ETH/USDC
Amount: 10 ETH
Date: 2025-03-15
Cost Basis: $20,000
Sale Price: $32,000
Capital Gain: $12,000
Note: "Uniswap V3 swap. Cost basis $2,000/ETH, sold at $3,200/ETH"

Type: DEFI_LP_REWARD
Token: UNI
Amount: 50
Date: 2025-03-20
FMV: $6.00
Income: $300
Note: "Yield farm reward from Aave. Ordinary income $300."

Type: DEFI_LP_WITHDRAWAL
Value Deposited: $30,000 (10 ETH + 200k USDC)
Value Withdrawn: $29,500
Impermanent Loss: $500
Note: "LP withdrawal. $500 impermanent loss. Consult tax pro on deductibility."
```

## Common DeFi Tax Mistakes

❌ **Mistake 1:** Counting LP fees as part of LP deposit value  
✅ **Fix:** LP fees are separate ordinary income

❌ **Mistake 2:** Ignoring impermanent loss entirely  
✅ **Fix:** Flag it; consult tax pro on deductibility

❌ **Mistake 3:** Not tracking wrapped/bridged tokens  
✅ **Fix:** Normalize to single asset across chains

❌ **Mistake 4:** Forgetting yield farm rewards  
✅ **Fix:** All rewards = ordinary income when earned

## Key Takeaways

✓ Swaps = capital gains/losses  
✓ Rewards and fees = ordinary income  
✓ LP deposits = no tax event  
✓ LP withdrawals = calculate gain/loss  
✓ Track all income from farming  
✓ Impermanent loss needs tax pro guidance  
✓ Wrapped tokens = same asset  
✓ TaxFormatter Pro classifies automatically