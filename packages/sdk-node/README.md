# @taxformatter/sdk

Official Node.js SDK for the [TaxFormatter API](https://taxformatter.com) — parse crypto exchange CSVs and bank statement PDFs programmatically.

## Install

```bash
npm install @taxformatter/sdk
```

## Quick Start

```typescript
import { TaxFormatter } from '@taxformatter/sdk';

const tf = new TaxFormatter('tf_live_xxx');

// Parse a file by path
const result = await tf.parse('./coinbase_2025.csv');

// Parse a buffer with options
const result = await tf.parse(buffer, 'coinbase.csv', {
  outputFormat: 'turbotax',
});

// List supported sources
const sources = await tf.listSources();

// Check usage
const usage = await tf.getUsage();
```

## Configuration

```typescript
const tf = new TaxFormatter('tf_live_xxx', {
  baseUrl: 'https://api.taxformatter.com', // default
  timeout: 30_000,  // 30s default
  maxRetries: 3,    // auto-retry on 429
});
```

## Error Handling

```typescript
import { TaxFormatter, AuthenticationError, RateLimitError, ParseError } from '@taxformatter/sdk';

try {
  await tf.parse('./file.csv');
} catch (err) {
  if (err instanceof AuthenticationError) {
    // 401 — invalid or missing API key
  } else if (err instanceof RateLimitError) {
    // 429 — rate limited (auto-retried 3 times before throwing)
    console.log(err.retryAfterSeconds);
  } else if (err instanceof ParseError) {
    // 422 — file could not be parsed
    console.log(err.suggestion);
  }
}
```

## API

### `tf.parse(input, filename?, options?)`
Parse a crypto CSV or bank statement PDF.

- **input**: File path (`string`) or `Buffer`
- **filename**: Required when passing a Buffer
- **options.exchange**: Force exchange detection
- **options.bank**: Force bank detection
- **options.outputFormat**: `'koinly'` | `'turbotax'` | `'coinledger'` | `'zenledger'`

### `tf.listSources()`
List all supported crypto exchanges and banks.

### `tf.getUsage()`
Get current month's API usage.

### `tf.health()`
Check API health status.

## License

MIT
