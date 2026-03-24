# Changelog

## 0.1.0 (2026-03-24)

Initial release.

- `TaxFormatter` client: parse, listSources, getUsage, health
- Accepts file path or Buffer
- Auto-retry on 429 with exponential backoff (max 3)
- Typed errors: AuthenticationError, RateLimitError, ParseError
- Zero runtime dependencies, Node 18+
