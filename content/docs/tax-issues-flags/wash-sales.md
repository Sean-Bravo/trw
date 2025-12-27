---
title: Wash Sales
description: Complete guide to wash sales and how TaxFormatter detects them
order: 1
---

# Wash Sales Explained

A **wash sale** happens when you sell an asset at a loss and buy the same or substantially identical asset within 30 days (before or after the sale).

## Simple Example

```
Jan 15: Buy 1 BTC at $40,000
Jan 20: Sell 1 BTC at $35,000 (Loss: $5,000)
Jan 25: Buy 1 BTC at $36,000 ← WASH SALE

The $5,000 loss is disallowed.
```

## Why The IRS Cares

The wash sale rule prevents tax loss harvesting abuse. Without it, you could:
- Sell at a loss to claim a deduction
- Buy back immediately to recover your position
- Repeat indefinitely for unlimited deductions

## 30-Day Window

The rule covers trades within **30 days before to 30 days after** the sale:

```
Day 1:  Buy BTC
Day 16: Sell BTC at loss ← SALE DATE
        Days -30 to +30 matter

Day 20: Buy BTC ← WASH SALE (within 30-day window)
Day 46: Buy BTC ← OK (outside 30-day window)
```

## How TaxFormatter Detects Them

When you upload your CSV, we:

1. Find all sales where you lost money
2. Check ±30 days for matching asset purchases
3. Flag the pairs showing which transactions create wash sales
4. Calculate impact on your cost basis

## Strategies to Avoid Wash Sales

### Strategy 1: Wait 31 Days
```
Day 16: Sell BTC at loss
Day 47: Buy BTC ← No wash sale (outside 30-day window)
```

### Strategy 2: Buy Different Asset
```
Day 16: Sell BTC at loss
Day 20: Buy ETH instead ← No wash sale (different asset)
```

## What TaxFormatter Shows You

In your **Pro CSV**, we annotate:

```
Date,Asset,Type,Amount,Notes
2025-01-16,BTC,SELL,1,"Loss: $5,000 — WASH SALE"
2025-01-20,BTC,BUY,1,"Wash sale partner (Jan 16 sale)"
```

And provide the **adjusted cost basis** for proper reporting.

## Reporting Wash Sales to the IRS

Report all sales on **Form 8949** (Sales of Capital Assets). In the description column, note:
```
"BTC wash sale (see wash sale disallowance)"
```

Carry totals to **Schedule D** (Capital Gains and Losses).