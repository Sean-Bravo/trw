# Changelog

## 0.1.1 (2026-04-24)

- Add `mcpName` field (`io.github.Sean-Bravo/taxformatter`) to package.json so the official MCP registry (`registry.modelcontextprotocol.io`) can verify ownership. Required by `mcp-publisher publish`.
- No runtime changes — tools, transport, env vars unchanged from 0.1.0.

## 0.1.0 (2026-03-24)

Initial release.

- MCP tools: `parse_crypto_csv`, `parse_bank_statement`, `list_supported_sources`
- 14 crypto exchanges, 7 banks supported
- Configurable base URL via `TAXFORMATTER_API_URL` env var
- Fetch timeout (30s default) with `AbortController`
- `TaxFormatterError` with code, statusCode, suggestion
- Programmatic export: `TaxFormatterClient`, types
