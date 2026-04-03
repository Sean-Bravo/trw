# MCP Server Fix — Zod Schema Migration

## Problem

The MCP server tools (`parse_crypto_csv`, `parse_bank_statement`, `list_supported_sources`) were registering with **empty input schemas** when used through Claude Code or any MCP client. Tool calls would fail because the client had no knowledge of required parameters like `file_path`.

## Root Cause

MCP SDK v1.27 requires **Zod schemas** for tool registration, not plain JSON Schema objects. The old code passed raw JSON Schema via a `TOOL_DEFINITIONS` array and cast `inputSchema as any` to bypass TypeScript. The SDK accepted this silently but routed the schema into `annotations` instead of `inputSchema`, resulting in tools with no visible parameters.

## Fix

- **`index.ts`**: Replaced the generic `for...of` loop with explicit `server.tool()` calls using inline Zod schemas (`z.string()`, `z.enum()`, etc.).
- **`tools.ts`**: Removed the `TOOL_DEFINITIONS` array and redundant Zod validation objects. The `handleTool` function now uses simple type assertions since the SDK handles validation via the Zod schemas registered in `index.ts`.

## Verification

After building (`npm run build`), tested via raw JSON-RPC over stdio:

1. `initialize` — server responds with protocol version and tool capabilities.
2. `tools/list` — all three tools return full `inputSchema` with `properties`, `required`, and `type` fields populated correctly.

## Files Changed

- `packages/mcp-server/src/index.ts`
- `packages/mcp-server/src/tools.ts`
