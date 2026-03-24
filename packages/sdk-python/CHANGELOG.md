# Changelog

## 0.1.0 (2026-03-24)

Initial release.

- `TaxFormatter` client: parse, list_sources, get_usage, health
- Accepts file path, Path, or bytes
- Auto-retry on 429 with exponential backoff (max 3)
- Typed errors: AuthenticationError, RateLimitError, ParseError
- TypedDict response types
- Python 3.8+, single dependency: requests
