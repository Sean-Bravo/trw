---
title: Supported Exchanges
description: Every exchange CSV format TaxFormatter parses, with its verification status
order: 2
---

# Supported Exchanges

This page mirrors the source registry that the API serves from `GET /v1/sources`. If an exchange isn't on this list, we don't claim to support it — the generic parser may still extract date and amount columns on a best-effort basis, but that is not support.

**What the status means**

- **Verified** — the parser is exercised against a sample export in our test suite on every change. A regression fails CI before it ships.
- **Beta** — the parser exists and works on the exports we've seen, but there is no fixture-backed test yet. Treat results with more care and check the row counts.

| Exchange | `exchange` parameter | Status |
|----------|----------------------|--------|
| **Binance** | `binance` | Verified |
| **Coinbase** | `coinbase` | Verified |
| **Kraken** | `kraken` | Verified |
| **KuCoin** | `kucoin` | Verified |
| **Bybit** | `bybit` | Verified |
| **Cash App** | `cashapp` | Verified |
| **Robinhood** | `robinhood` | Verified |
| **PayPal** | `paypal` | Verified |
| **Venmo** | `venmo` | Beta |
| **Crypto.com** | `crypto.com` | Verified |
| **Gemini** | `gemini` | Verified |
| **FTX** | `ftx` | Verified |
| **Bitfinex** | `bitfinex` | Verified |
| **OKX** | `okx` | Verified |

Pass the `exchange` parameter to skip auto-detection, or omit it and the API will fingerprint the headers. The live list, including status, is always available without an API key:

```bash
curl https://api.taxformatter.com/v1/sources
```

## Don't See Your Exchange?

If your exchange isn't listed:

1. **Email us** at support@taxformatter.com
2. **Tell us the exchange name** and export format
3. **Share a sample CSV** (anonymized)

A new exchange is added to this list only once its parser has a sample export in the test suite — we don't announce support ahead of that.

## Export Format Compatibility

All supported exchanges export data in standard formats that include:
- Transaction date
- Asset pair (BTC/USD, ETH/USDT, etc.)
- Transaction type (BUY, SELL, DEPOSIT, etc.)
- Amount and price
- Fees

TaxFormatter normalizes these different formats into a unified, tax-software-ready structure.
