---
title: Airdrop Handling
description: Understanding airdrops and their tax treatment
order: 3
---

# Airdrops Explained

An airdrop is receiving free cryptocurrency. The IRS treats it as taxable income. Here's what you need to know.

## What is an Airdrop?

Airdrops are free tokens sent to cryptocurrency holders, usually as:
- Network upgrades (free new token)
- Marketing campaigns
- Community rewards
- Governance tokens
- Token replacements

**Common examples:**
- Uniswap (UNI) airdrop - $1,300 per eligible wallet
- Ethereum Classic (ETC) - free distribution
- Aptos (APT) - foundation rewards
- Arbitrum (ARB) - DAO distribution

## Tax Treatment

An airdrop counts as **ordinary income** in the year you receive it.

### When Recognized

**Receipt date:** When tokens appear in your wallet  
**Fair Market Value:** Token price at receipt time  
**Reportable amount:** Number of tokens × Price at receipt

### Simple Example

```
Date: August 10, 2025
Airdrop received: 1,000 UNI tokens
UNI price: $5.50
Income: 1,000 × $5.50 = $5,500

Tax impact: $5,500 ordinary income in 2025
Cost basis: $5,500 per token (starting point)
```

## Income vs Capital Gain

This is different from earning through trading:

| | Airdrop | Capital Gain |
|---|---|---|
| Type | Ordinary Income | Capital Gain |
| Recognition | When received | When sold |
| Rate | Your tax bracket | Long-term (0-20%) |
| IRS Form | Schedule 1 | Schedule D |

**Critical:** You owe tax when you receive the airdrop, even if you don't sell it.

## Reporting Airdrops

### Form 1040, Schedule 1

Report under "Other Income":
- Total airdrops received
- Line 8z: "Cryptocurrency airdrops: $12,500"

### Form 8949 (If You Sold)

If you later sell airdropped tokens:
- Use FMV at receipt as cost basis
- Report capital gain/loss when sold
- Note "Airdrop token" in description

## How TaxFormatter Detects Airdrops

We flag transactions marked as:
- "Airdrop"
- "Free token"
- "Bonus"
- "Claim"
- "Distribution"

We record:
- Date received
- Token received
- Quantity
- FMV at receipt

## Example: Full Airdrop Lifecycle

```
Aug 10: Receive 1,000 UNI airdrop (price $5.50)
  → Income: $5,500
  → Cost basis per token: $5.50

Nov 15: Receive another 500 UNI airdrop (price $6.25)
  → Income: $3,125
  → Cost basis per token: $6.25

Jan 20 (next year): Sell all 1,500 UNI at $8.00
  → Gain on first batch: (1,000 × $8.00) - (1,000 × $5.50) = $2,500
  → Gain on second batch: (500 × $8.00) - (500 × $6.25) = $875
  → Total: $5,500 + $3,125 income + $3,375 capital gains
```

## Special Cases

### Case 1: Fork Airdrops

When a blockchain forks (like Bitcoin/Bitcoin Cash split):

```
Own 1 BTC before fork
After fork: 1 BTC + 1 BCH (free)
```

**Tax treatment:** Same as airdrop - BCH is ordinary income at FMV on fork date.

### Case 2: Staking Airdrops

Some airdrop programs give rewards over time:

```
Week 1: Receive 100 tokens (free airdrop)
Week 2: Receive 50 tokens (bonus for holding)
Week 3: Receive 50 tokens (staking-like rewards)
```

**Tax treatment:** All are ordinary income when received.

### Case 3: Claiming Airdrops

Some airdrops require actions to claim:

```
Jan 10: Eligible to receive airdrop (but don't know yet)
Feb 5: Discover airdrop exists
Feb 20: Claim and receive tokens
```

**Tax treatment:** Income recognized on **claim date** (Feb 20), not eligibility date.

## IRS Guidance

The IRS has stated:
- "Receipt of virtual currency constitutes taxable income"
- "Airdropped cryptocurrency = ordinary income at FMV on receipt date"
- "Report on Schedule 1 as 'Other Income'"

**Important:** There's no exemption for small airdrops. Even $1 worth must be reported.

## Pro Tier Features

TaxFormatter Pro automatically:

1. **Identifies airdrop transactions**
2. **Looks up FMV at receipt** from historical data
3. **Assigns cost basis** to each airdrop token
4. **Tracks through sale** for gain/loss
5. **Exports for Schedule 1** reporting

Example Pro annotation:
```
Date: Aug 10, 2025
Type: AIRDROP
Amount: 1,000 UNI
FMV at Receipt: $5,500
Note: "Airdrop income - $5,500 ordinary income. Cost basis $5.50/token."
```

## Common Airdrop Issues

### Issue: Missing Airdrop Price

```
May 15: Receive rare airdrop token
Price unknown - no market data
What's the FMV?
```

**Solution:** Use the first price it traded for. TaxFormatter uses CoinGecko historical data (conservative estimate).

### Issue: Delayed Airdrops

```
Announced: Jan 15
Received: March 1
When is income recognized?
```

**Answer:** March 1 (when you control the tokens). Not the announcement date.

### Issue: Conditional Airdrops

```
"Receive tokens IF you hold for 30 days"
Day 15: Receive tokens
Day 30: Vesting complete
```

**Tax treatment:** Income at **receipt date** (Day 15), even though vesting continues.

## Strategies for Airdrop Handling

### Strategy 1: Harvest Losses
If airdropped token drops in value:
```
Received: 1,000 tokens at $5.50 = $5,500 income
Current: 1,000 tokens at $3.00 = $3,000 value
Sell now: $5,500 income - $2,500 loss (partial offset)
```

### Strategy 2: Hold for Long-term Gains
```
Receive airdrop (ordinary income tax)
Hold 1+ year
Sell (long-term capital gain rate)
Overall: Pay ordinary rate on airdrop, but gains taxed at lower rate
```

### Strategy 3: Donate Airdrops
If qualified charity:
```
Receive $10,000 airdrop
Donate directly to charity
Deductible at FMV ($10,000)
No capital gains tax
Pay ordinary income tax ONLY
```

## Key Takeaways

✓ Airdrops = ordinary income at receipt  
✓ Income recognized when tokens hit your wallet  
✓ Use FMV at receipt as cost basis  
✓ Report on Schedule 1  
✓ All airdrops must be reported (no minimum threshold)  
✓ No airdrop exception exists for small amounts  
✓ TaxFormatter Pro handles detection and valuation  

## What About Unclaimed Airdrops?

**Q:** Do I owe tax if I don't claim an airdrop?  
**A:** No. Income only when you claim and control the tokens.

**Q:** If an airdrop expires, is it still taxable?  
**A:** No. If you never claimed it, it's not income.