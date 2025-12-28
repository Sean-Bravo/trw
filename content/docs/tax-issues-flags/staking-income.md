---
title: Staking Income
description: Understanding staking rewards and tax implications
order: 2
---

# Staking Income Explained

Staking rewards are taxable income. Here's everything you need to know about reporting them correctly.

## What is Staking?

Staking is locking up cryptocurrency to validate blockchain transactions and earn rewards.

**Examples:**
- Ethereum staking (2-6% APY)
- Solana staking (4-8% APY)
- Cardano staking (4-7% APY)
- Polygon staking (5-10% APY)

## Tax Treatment

Staking rewards count as **ordinary income** in the year you receive them.

### When Income is Recognized

**Received date:** The moment the reward hits your wallet  
**Fair Market Value:** Price of the token at receipt time  
**Reportable Amount:** Number of tokens × Price at receipt

### Simple Example

```
Date: March 15, 2025
Staking reward: 1 ETH
ETH price: $2,500
Income: $2,500

Tax impact: $2,500 is ordinary income in 2025
Your cost basis in that 1 ETH: $2,500 (starting point)
```

## Different From Capital Gains

**Important distinction:**

| | Staking Reward | Capital Gain |
|---|---|---|
| Type | Ordinary Income | Capital Gain |
| Rate | Your tax bracket (10%-37%) | Long-term (0-20%) or short-term |
| Timing | When received | When sold |
| Cost Basis | FMV at receipt | Your adjusted basis |

Staking rewards are MORE heavily taxed than capital gains.

## How TaxFormatter Detects Staking

We flag transactions marked as:
- "Staking Reward"
- "Earn"
- "Rewards"
- "Stake"
- "APY/APR Income"

We record:
- Date received
- Token received
- Quantity
- FMV at receipt (estimated from price history)

## Example: Full Staking Lifecycle

```
March 15: Receive 1 ETH staking reward (price $2,500)
  → Income: $2,500 (taxed at ordinary rate)
  → Cost basis in that 1 ETH: $2,500

May 20: Receive another 1 ETH staking reward (price $2,800)
  → Income: $2,800 (taxed at ordinary rate)
  → Cost basis: $2,800

July 10: Sell both ETH at $3,000
  → Gain on first ETH: $3,000 - $2,500 = $500 (capital gain)
  → Gain on second ETH: $3,000 - $2,800 = $200 (capital gain)
  → Total: $2,500 + $2,800 income + $700 capital gains
```

## Reporting to the IRS

### Form 1040, Schedule 1

Report staking income under "Other Income":
- Total staking rewards received in 2025
- Line 8z: "Cryptocurrency staking income: $5,300"

### Form 8949

When you sell staked tokens:
- Use your cost basis from receipt date
- Report the capital gain/loss normally
- Note "Staked token" in description if helpful

### Schedule D

Report all capital gains/losses from selling staked tokens.

## Pro Tier Features

TaxFormatter Pro automatically:

1. **Identifies all staking transactions**
2. **Calculates FMV at receipt** using historical price data
3. **Assigns cost basis** to each staking reward
4. **Tracks through sale** to calculate gain/loss
5. **Annotates your CSV** with income details

Example Pro annotation:
```
Date: March 15, 2025
Type: STAKING
Amount: 1 ETH
FMV at Receipt: $2,500
Note: "Staking income - $2,500 ordinary income. Cost basis $2,500. Sold 7/10/25 at $3,000 for $500 capital gain."
```

## Common Staking Issues

### Issue: Different Staking Service Prices

```
Exchange 1 shows ETH staking reward at $2,450
Exchange 2 shows ETH at $2,500 same day
Which is correct?
```

**Solution:** Use the median market price or the price on your preferred exchange. TaxFormatter uses CoinGecko historical data (conservative estimate).

### Issue: Fractional Rewards

Many staking services give fractional rewards:

```
March 15: Receive 0.0234 ETH at $2,500 = $58.50 income
March 22: Receive 0.0189 ETH at $2,510 = $47.44 income
```

**Solution:** TaxFormatter aggregates these automatically. List total income per token per month.

### Issue: Multiple Staking Services

If you stake on multiple platforms:

```
Lido (liquid staking): 2 ETH rewards
Coinbase (exchange staking): 0.5 ETH rewards
Kraken (exchange staking): 0.3 ETH rewards
Total: 2.8 ETH = ordinary income
```

**Solution:** Combine all staking income in one line. TaxFormatter handles this.

## Strategies to Minimize Tax

### 1. Time Staking Decisions (Long-term)
```
Stake in Jan, hold staking rewards 1+ year
If you sell after 1 year, gains are long-term (lower rate)
```

### 2. Harvest Losses
```
If staked token drops, sell to realize loss
Offsets other staking income tax
Example: Receive $5,000 staking income, sell at $4,200 loss = net $800 income
```

### 3. Donate Staking Rewards (If Qualified)
Donating cryptocurrency to qualified charities can be deductible at FMV without capital gains tax.

## Pro Tier Benefits for Stakers

✅ Automatic staking income detection  
✅ Historical price lookup for cost basis  
✅ Integrated tracking through sale  
✅ Exported directly to Schedule 1  
✅ Multi-year reconciliation  

## Key Takeaways

✓ Staking rewards = ordinary income (taxed higher than gains)  
✓ Income recognized when received (not when sold)  
✓ Use FMV at receipt as cost basis  
✓ Track through sale for capital gains calculation  
✓ Report on Schedule 1 and Schedule D  
✓ TaxFormatter Pro handles all calculations automatically