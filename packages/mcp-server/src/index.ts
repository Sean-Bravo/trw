#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { TaxFormatterClient } from './client.js';
import { TOOL_DEFINITIONS, handleTool } from './tools.js';

// Re-export for programmatic usage
export { TaxFormatterClient, TaxFormatterError } from './client.js';
export type { ClientOptions } from './client.js';
export type { ParseResponse, SourcesResponse, UsageResponse } from './types.js';

const API_KEY = process.env['TAXFORMATTER_API_KEY'];

if (!API_KEY) {
  console.error(
    'Error: TAXFORMATTER_API_KEY environment variable is required.\n' +
      'Get your API key at https://taxformatter.com/dashboard/developer',
  );
  process.exit(1);
}

const client = new TaxFormatterClient(API_KEY);

const server = new McpServer({
  name: 'taxformatter',
  version: '0.1.0',
});

// Register tools — cast inputSchema to satisfy SDK's Zod type requirement
// (runtime JSON Schema works fine, SDK typing is overly strict)
for (const tool of TOOL_DEFINITIONS) {
  server.tool(
    tool.name,
    tool.description,
    tool.inputSchema as any,
    async (args: Record<string, unknown>) => {
      return handleTool(client, tool.name, args);
    },
  );
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('MCP server error:', error);
  process.exit(1);
});
