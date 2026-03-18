# @taxformatter/mcp-server

MCP server for parsing crypto exchange CSVs and bank statement PDFs via the [TaxFormatter API](https://taxformatter.com).

## Setup

1. Get an API key at [taxformatter.com/dashboard/developer](https://taxformatter.com/dashboard/developer)

2. Add to your MCP config:

**Claude Code** (`~/.claude/mcp.json`):
```json
{
  "mcpServers": {
    "taxformatter": {
      "command": "npx",
      "args": ["@taxformatter/mcp-server"],
      "env": {
        "TAXFORMATTER_API_KEY": "tf_live_your_key_here"
      }
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "taxformatter": {
      "command": "npx",
      "args": ["@taxformatter/mcp-server"],
      "env": {
        "TAXFORMATTER_API_KEY": "tf_live_your_key_here"
      }
    }
  }
}
```

## Tools

### `parse_crypto_csv`
Parse a crypto exchange CSV and convert to tax software format.

- **file_path** (required): Path to the CSV file
- **exchange** (optional): Exchange name — auto-detected if omitted
- **output_format** (optional): `koinly` | `turbotax` | `coinledger` | `zenledger`

### `parse_bank_statement`
Parse a bank statement PDF and extract transactions.

- **file_path** (required): Path to the PDF file
- **bank** (optional): Bank name — auto-detected if omitted

### `list_supported_sources`
List all supported crypto exchanges and banks.

## Supported Sources

**Crypto Exchanges:** Coinbase, Binance, Kraken, Gemini, Robinhood, Crypto.com, PayPal, Cash App, Venmo, KuCoin, Bybit, FTX, Bitfinex, OKX

**Banks:** Chase, Mercury, Navy Federal, Bank of America, Wells Fargo, Citi, Capital One
