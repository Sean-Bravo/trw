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

## Configuration

| Env var | Description | Default |
|---------|-------------|---------|
| `TAXFORMATTER_API_KEY` | Your API key (required) | — |
| `TAXFORMATTER_API_URL` | API base URL | `https://api.taxformatter.com` |

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

## Programmatic Usage

```typescript
import { TaxFormatterClient, TaxFormatterError } from '@taxformatter/mcp-server';

const client = new TaxFormatterClient('tf_live_xxx', {
  baseUrl: 'https://api.taxformatter.com', // optional
  timeout: 30_000, // optional, ms
});

// Parse a file
const result = await client.parse(fileBuffer, 'coinbase_2025.csv', {
  output_format: 'turbotax',
});

// List sources
const sources = await client.listSources();

// Get usage
const usage = await client.getUsage();
```

## Error Handling

```typescript
import { TaxFormatterError } from '@taxformatter/mcp-server';

try {
  await client.parse(buffer, 'file.csv');
} catch (err) {
  if (err instanceof TaxFormatterError) {
    console.error(err.code);       // e.g. "rate_limited"
    console.error(err.statusCode); // e.g. 429
    console.error(err.suggestion); // e.g. "Upgrade your tier..."
  }
}
```

## Supported Sources

**Crypto Exchanges:** Coinbase, Binance, Kraken, Gemini, Robinhood, Crypto.com, PayPal, Cash App, Venmo, KuCoin, Bybit, FTX, Bitfinex, OKX

**Banks:** Chase, Mercury, Navy Federal, Bank of America, Wells Fargo, Citi, Capital One

## License

MIT
