# taxformatter

Official Python SDK for the [TaxFormatter API](https://taxformatter.com) — parse crypto exchange CSVs and bank statement PDFs programmatically.

## Install

```bash
pip install taxformatter
```

## Quick Start

```python
from taxformatter import TaxFormatter

tf = TaxFormatter("tf_live_xxx")

# Parse a file by path
result = tf.parse("./coinbase_2025.csv")

# Parse bytes with options
result = tf.parse(raw_bytes, filename="coinbase.csv", output_format="turbotax")

# List supported sources
sources = tf.list_sources()

# Check usage
usage = tf.get_usage()
```

## Configuration

```python
tf = TaxFormatter(
    "tf_live_xxx",
    base_url="https://api.taxformatter.com",  # default
    timeout=30,    # seconds, default
    max_retries=3, # auto-retry on 429, default
)
```

## Error Handling

```python
from taxformatter import TaxFormatter, AuthenticationError, RateLimitError, ParseError

try:
    result = tf.parse("./file.csv")
except AuthenticationError:
    # 401 — invalid or missing API key
    pass
except RateLimitError as e:
    # 429 — rate limited (auto-retried 3 times before raising)
    print(e.retry_after)
except ParseError as e:
    # 422 — file could not be parsed
    print(e.suggestion)
```

## API

### `tf.parse(input, filename=None, output_format=None, exchange=None, bank=None)`
Parse a crypto CSV or bank statement PDF.

- **input**: File path (`str`/`Path`) or `bytes`
- **filename**: Required when passing bytes
- **output_format**: `"koinly"`, `"turbotax"`, `"coinledger"`, or `"zenledger"`
- **exchange**: Force exchange detection (e.g., `"coinbase"`)
- **bank**: Force bank detection (e.g., `"chase"`)

### `tf.list_sources()`
List all supported crypto exchanges and banks.

### `tf.get_usage()`
Get current month's API usage.

### `tf.health()`
Check API health status.

## License

MIT
