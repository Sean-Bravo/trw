---
title: Reading Your Formatted CSV
description: Understanding your formatted CSV structure and columns
order: 2
---

# Reading Your Formatted CSV

After TaxFormatter processes your data, you'll download a cleaned and normalized CSV. Here's what each column means and how to use it.

## CSV Structure Overview

Your formatted CSV includes these standard columns:

```
Date,Pair,Type,Amount,Price,Fee,Total,Cost Basis,Notes
2025-01-15,BTC/USD,BUY,0.5,42500,12.75,21262.75,21262.75,
2025-01-16,ETH/USD,SELL,5,2250,25.00,11225.00,10000.00,WASH SALE
```

## Column Definitions

### Date
**Format:** YYYY-MM-DD HH:MM:SS  
**Example:** 2025-01-15 14:30:00

Normalized across all transactions. We convert different date formats to ISO 8601 standard.

### Pair
**Format:** ASSET/QUOTE  
**Example:** BTC/USD, ETH/USDT

Standardized asset symbols. We normalize variations like BTC-USD → BTC/USD.

### Type
**Format:** BUY, SELL, DEPOSIT, WITHDRAWAL, STAKING, AIRDROP, etc.

Cleaned transaction types. We standardize exchange variations.

### Amount
**Format:** Numerical quantity  
**Example:** 0.5, 5, 1000

The quantity of the asset involved in the transaction. Always positive.

### Price
**Format:** USD equivalent per unit  
**Example:** 42500, 2250

Unit price at time of transaction. Used for cost basis calculations.

### Fee
**Format:** USD amount  
**Example:** 12.75, 25.00

Transaction fees. Deductible for tax purposes.

### Total
**Format:** Amount × Price + Fee  
**Example:** 21262.75

Total transaction value including fees.

### Cost Basis
**Format:** Per-unit cost  
**Example:** 21262.75 (for buy), 10000.00 (for sell)

For buys: how much you paid per unit (relevant for wash sales)  
For sells: original cost per unit (used for gains calculation)

### Notes
**Format:** Free text  
**Example:** WASH SALE, Flagged: Timestamp issue

Annotations for transactions requiring special handling. Pro tier includes detailed notes.

## Reading Your Data

### For a Buy Transaction

```
2025-01-15,BTC/USD,BUY,0.5,42500,12.75,21262.75,42525.50,
```

You bought 0.5 BTC at $42,500/unit, paid $12.75 fee.  
Your cost basis per unit was $42,525.50 (includes fee).

### For a Sell Transaction

```
2025-01-16,BTC/USD,SELL,0.5,45000,22.50,22477.50,42525.50,
```

You sold 0.5 BTC at $45,000/unit, paid $22.50 fee.  
Your original cost basis was $42,525.50/unit.  
Your gain: ($45,000 - $42,525.50) × 0.5 = $1,237.25 (minus fee).

### For a Flagged Transaction

```
2025-01-20,BTC/USD,BUY,0.5,38000,10.00,19010.00,38020.00,WASH SALE - paired with Jan 15 sale
```

This transaction has a flag in the Notes column. Read the note carefully to understand the issue.

## Pro Tier Enhancements

In Pro tier, you also get:

### Adjusted Cost Basis
Automatically adjusted for wash sales:

```
2025-01-20,BTC/USD,BUY,0.5,38000,10.00,19010.00,43275.00,WASH SALE - cost basis adjusted +$5,255
```

The cost basis includes the disallowed loss from the wash sale.

### Detailed Annotations
More context on flagged items:

```
Notes: WASH SALE - Paired with 2025-01-15 SELL. Disallowed loss: $2,237.50. Cost basis increased to $43,275.00.
```

## Importing to Tax Software

### Format Compatibility

Your CSV is compatible with:
- **TurboTax** - Import directly to Schedule D
- **Koinly** - Paste into bulk import
- **CoinLedger** - Upload as custom CSV
- **ZenLedger** - Drag and drop import

### Import Tips

1. Don't modify the CSV (maintain structure)
2. Double-check date range matches your tax year
3. Verify transaction count matches TaxFormatter report
4. Review any flagged items before final submission

## Common Questions

**Q: Why are my amounts positive on sells?**  
A: TaxFormatter shows quantity sold as positive. Your tax software will handle the math.

**Q: Should I include fees in my cost basis?**  
A: Yes. TaxFormatter includes them automatically. Don't double-count.

**Q: What if my cost basis seems wrong?**  
A: Compare to your original exchange records. If you bought at different prices, let us know for manual review.

**Q: Can I edit the CSV before importing?**  
A: You can edit notes/annotations, but don't change amounts, dates, or pairs without verifying.