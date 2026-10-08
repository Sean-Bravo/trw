---
title: FAQ
description: Common questions about TaxFormatter
order: 5
---

# Frequently Asked Questions

## Can you adjust my cost basis?

TaxFormatter flags issues and explains them, but doesn't automatically adjust cost basis. You control all adjustments. We annotate what needs changing and you decide.

## Is this tax advice?

No. TaxFormatter is a data tool, not tax advice. We identify issues and explain them clearly. Always consult a tax professional for personalized guidance.

## What about gains I missed?

TaxFormatter processes the CSV you provide. If you have missing trades, add them to your CSV and re-upload.

## Why does my platform show different numbers?

Different tax software calculates gains differently based on cost basis methodology (FIFO, LIFO, specific ID, etc.). TaxFormatter flags these differences so you can reconcile.

## Can I process the same file twice?

Yes, but only the latest upload counts. Previous uploads are not saved.

## What file formats do you support?

Currently CSV only. Convert Excel files to CSV before uploading.

## How secure is my data?

Everything you send us is deleted within 30 days — uploaded files, outputs, and parsed data. Delete it sooner anytime from your dashboard. We keep your account, usage counts, and anonymized processing metadata (source detected, row count, timing, error type). We never train on your data, and neither do our AI providers.

## Do you support international exchanges?

We support Binance, Coinbase, Kraken, KuCoin, and Bybit. Email us for others.

## Can you integrate with my tax software directly?

Pro tier supports direct integrations with TurboTax, Koinly, CoinLedger, and ZenLedger.

## Is the AI-generated text watermarked?

The explanations and flags produced by the AI insights layer come from third-party models and may carry a provider's statistical watermark in the generated text. This applies only to the explanation text. It has no effect on your transaction data, amounts, dates, or the structure of the CSV we return — all of which come from the deterministic parser, not the model.

## Do you ever need my exchange or bank login or API keys?

No. TaxFormatter never asks for exchange API keys, bank credentials, wallet access, or seed phrases — not even read-only. You upload the export your exchange or bank already gives you. The only credential involved is the TaxFormatter developer key we issue to you, which is shown once at creation and stored only as a SHA-256 hash.
