---
title: Timestamp Mismatches
description: Identifying and fixing timestamp issues
order: 5
---

# Timestamp Mismatches

Timestamp issues can affect your tax reporting. Here's how to identify and fix them.

## What is a Timestamp Mismatch?

Your CSV shows a trade at one time, but:
- Exchange records show a different time
- Blockchain confirms a different time
- Multiple sources show different times

**Example:**
```
Your CSV: 2025-03-15 14:30:00 UTC
Exchange: 2025-03-15 14:32:15 UTC
Difference: 2 minutes 15 seconds
```

## Why It Matters

Timestamps affect:
- **Date of sale** - Which tax year it belongs in
- **Cost basis** - Price at sale time
- **Gain/loss calculation** - Even minutes matter for volatile assets

**Real example:**
```
Sell ETH at 11:59 PM: $3,000 (Dec 31, 2024)
Price drops to $2,500 at 12:01 AM (Jan 1, 2025)
2-minute difference = $500 per ETH difference
```

## Common Causes

### Cause 1: Timezone Differences

```
Exchange: EST (UTC-5)
Your CSV: UTC
Your clock: PST (UTC-8)

Same transaction shown at 3 different times
```

**Fix:** Convert all to UTC and verify alignment

### Cause 2: Server Delays

```
You place order: 14:30:00
Order confirmed: 14:30:05
Settlement: 14:30:30

Which time is correct?
```

**Answer:** The fill time (when order matched), not submission time.

### Cause 3: API Export Delays

Some exchange APIs have 5-15 second delays:

```
Blockchain timestamp: 14:30:00
Exchange API shows: 14:30:12
Your export shows: 14:30:20

Multiple timestamps for same transaction
```

### Cause 4: Daylight Saving Time

```
Spring forward: March 12, 2:00 AM → 3:00 AM
Fall back: November 5, 2:00 AM → 1:00 AM

Transactions near DST changes shift 1 hour
```

## How TaxFormatter Detects Mismatches

We flag timestamps when:

1. **Off by > 1 minute** from the mode (most common time)
2. **Timezone inconsistency** detected
3. **Out of order** (later transaction appears before earlier one)
4. **Price inconsistency** (timestamp price doesn't match your stated price)

Example TaxFormatter flag:
```
Date: 2025-03-15
Your CSV: 14:30:00
Market data: 14:32:15 (ETH $3,000)
Price mismatch: You show $2,995
Flag: "Timestamp may be off. Price at 14:30 was $3,010. Verify."
```

## When Mismatches Matter

### Critical (Affects Tax Year)
```
Transaction on Dec 31 at 11:59 PM
But actually happened Jan 1 at 12:01 AM
→ Changes tax year by 1 year
```

**Fix immediately:** Verify blockchain date.

### Important (> 5 minutes, volatile asset)
```
Sell BTC on volatile day
5-minute difference = 1-5% price swing
→ Could affect gain/loss by thousands
```

**Verify:** Check exchange confirmation.

### Minor (< 5 minutes, stable asset)
```
Sell USDC
3-minute difference
→ Price changed <$0.001
```

**Accept:** Usually negligible.

## How to Verify Timestamps

### Step 1: Check Exchange Records

Log into your exchange:
- Coinbase: Account → Statements → Details (shows exact timestamp)
- Binance: Account → Trade History → Click trade (shows fill time)
- Kraken: History → Trades → Click transaction (shows settlement time)
- Koinly: Has own history (cross-reference)

### Step 2: Check Blockchain

Advanced: Look up transaction on blockchain explorer:
- Ethereum: Etherscan.io
- Bitcoin: Blockchain.com
- Solana: Solscan.io

Search your address and transaction, note the timestamp.

### Step 3: Compare to Your CSV

```
CSV shows: 2025-03-15 14:30:00
Exchange shows: 2025-03-15 14:30:00 ✓
Blockchain shows: 2025-03-15 14:30:00 ✓
Match = Good
```

vs

```
CSV shows: 2025-03-15 14:30:00
Exchange shows: 2025-03-15 14:32:15 ✗
Blockchain shows: 2025-03-15 14:32:15 ✓
Mismatch = Use blockchain time
```

## Fixing Timestamp Mismatches

### Option 1: Re-export from Exchange

Sometimes re-exporting gives different timestamps:

```
1. Delete your export
2. Export again with same parameters
3. Check timestamps
4. Upload new file
```

Why it helps: Some exchanges update historical data.

### Option 2: Manual Correction

For 1-2 transactions:

1. Note the correct timestamp
2. Edit CSV directly
3. Change the date/time column
4. Save and re-upload

**Format:** YYYY-MM-DD HH:MM:SS

### Option 3: Accept Minor Mismatches

If < 5 minutes and price stable, it's usually fine. TaxFormatter accepts ±5 minute tolerance.

## Pro Tier Timestamp Handling

TaxFormatter Pro:

1. **Flags all mismatches** - Shows discrepancies
2. **Looks up prices** at both times
3. **Calculates impact** on gain/loss
4. **Suggests corrections** based on blockchain
5. **Notes in CSV** for tax pro review

Example Pro flag:
```
Date: 2025-03-15
CSV Time: 14:30:00 (ETH $3,000)
Exchange: 14:32:15 (ETH $3,010)
Blockchain: 14:32:15 (ETH $3,010)
Impact: $10 per ETH difference
Recommendation: Use 14:32:15, price $3,010
Note: "Timestamp corrected to match exchange/blockchain. Price adjusted +$10/ETH"
```

## Timestamp and Volatile Markets

**More critical in volatile markets:**

```
Normal day: $100 bitcoin move = 0.3% swing
Volatile day: $2,000 bitcoin move = 6% swing

Same 5-minute difference has 20x more impact
```

**Pro strategy:** If volatile day, get timestamp accuracy from blockchain (immutable record).

## IRS Position on Timestamps

The IRS expects:
- "Contemporaneous records" showing date/time of transactions
- If conflicting, use the most reliable source (blockchain)
- Document your methodology for which timestamp used

**Best practice:** Keep copies of:
- Exchange confirmation emails (timestamped)
- Blockchain explorer screenshots
- Your export files
- Any corrections you made

## Special Cases

### Case 1: Transactions from Before 2010

Some exchanges don't have historical timestamps. Use the price on that date:

```
2008 trade: No exact timestamp
Use: First available timestamp for that asset + date
Document: "Timestamp estimated to [date] based on price on that date"
```

### Case 2: Transactions Spanning Multiple Days

If a transaction spans multiple days (rare):

```
Order placed: Jan 31 11:59 PM
Filled/settled: Feb 1 12:05 AM
Use: Settlement date (Feb 1) per tax law
```

### Case 3: Clock Synchronization

Your computer's clock was wrong (off by hours):

```
Transaction actually happened at 14:30 UTC
Your computer showed 13:20 UTC (1 hour behind)
CSV: 13:20 (incorrect)
Fix: Change to 14:30 (correct)
```

## Key Takeaways

✓ Timestamps matter for tax year determination  
✓ More critical for volatile assets  
✓ Check exchange + blockchain records  
✓ Accept ±5 minute tolerance usually  
✓ Document discrepancies for tax pro  
✓ Use blockchain as authoritative source  
✓ Keep exchange confirmations  
✓ TaxFormatter Pro flags and suggests corrections