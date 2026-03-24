# Changelog

## 0.1.0 (2026-03-24)

Initial release.

- MCP tools: `parse_crypto_csv`, `parse_bank_statement`, `list_supported_sources`
- 14 crypto exchanges, 7 banks supported
- Configurable base URL via `TAXFORMATTER_API_URL` env var
- Fetch timeout (30s default) with `AbortController`
- `TaxFormatterError` with code, statusCode, suggestion
- Programmatic export: `TaxFormatterClient`, types
