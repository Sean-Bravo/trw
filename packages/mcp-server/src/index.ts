#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { TaxFormatterClient } from './client.js';
import { handleTool } from './tools.js';

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

// Register tools with Zod schemas (required by MCP SDK v1.x)
server.tool(
  'parse_crypto_csv',
  'Parse a crypto exchange CSV file (Coinbase, Binance, Kraken, etc.) and convert to a tax software format (Koinly, TurboTax, CoinLedger, ZenLedger). Auto-detects the exchange if not specified.',
  {
    file_path: z.string().describe('Absolute or relative path to the CSV file'),
    exchange: z.string().optional().describe('Exchange name (e.g., "coinbase", "binance"). Auto-detected if omitted.'),
    output_format: z.enum(['koinly', 'turbotax', 'coinledger', 'zenledger']).optional().describe('Output format (default: koinly)'),
  },
  async (args) => handleTool(client, 'parse_crypto_csv', args),
);

server.tool(
  'parse_bank_statement',
  'Parse a bank statement PDF (Chase, Mercury, Navy Federal, etc.) and extract transactions as structured data. Auto-detects the bank.',
  {
    file_path: z.string().describe('Absolute or relative path to the PDF file'),
    bank: z.string().optional().describe('Bank name (e.g., "chase", "mercury"). Auto-detected if omitted.'),
  },
  async (args) => handleTool(client, 'parse_bank_statement', args),
);

server.tool(
  'list_supported_sources',
  'List all supported crypto exchanges and banks that can be parsed by TaxFormatter.',
  async () => handleTool(client, 'list_supported_sources', {}),
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('MCP server error:', error);
  process.exit(1);
});
