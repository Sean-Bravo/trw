import { z } from 'zod';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import type { TaxFormatterClient } from './client.js';

export const TOOL_DEFINITIONS = [
  {
    name: 'parse_crypto_csv',
    description:
      'Parse a crypto exchange CSV file (Coinbase, Binance, Kraken, etc.) and convert to a tax software format (Koinly, TurboTax, CoinLedger, ZenLedger). Auto-detects the exchange if not specified.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        file_path: {
          type: 'string',
          description: 'Absolute or relative path to the CSV file',
        },
        exchange: {
          type: 'string',
          description:
            'Exchange name (e.g., "coinbase", "binance"). Auto-detected if omitted.',
        },
        output_format: {
          type: 'string',
          enum: ['koinly', 'turbotax', 'coinledger', 'zenledger'],
          description: 'Output format (default: koinly)',
        },
      },
      required: ['file_path'],
    },
  },
  {
    name: 'parse_bank_statement',
    description:
      'Parse a bank statement PDF (Chase, Mercury, Navy Federal, etc.) and extract transactions as structured data. Auto-detects the bank.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        file_path: {
          type: 'string',
          description: 'Absolute or relative path to the PDF file',
        },
        bank: {
          type: 'string',
          description:
            'Bank name (e.g., "chase", "mercury"). Auto-detected if omitted.',
        },
      },
      required: ['file_path'],
    },
  },
  {
    name: 'list_supported_sources',
    description:
      'List all supported crypto exchanges and banks that can be parsed by TaxFormatter.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
] as const;

const ParseCryptoInput = z.object({
  file_path: z.string(),
  exchange: z.string().optional(),
  output_format: z.enum(['koinly', 'turbotax', 'coinledger', 'zenledger']).optional(),
});

const ParseBankInput = z.object({
  file_path: z.string(),
  bank: z.string().optional(),
});

export async function handleTool(
  client: TaxFormatterClient,
  name: string,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  switch (name) {
    case 'parse_crypto_csv': {
      const input = ParseCryptoInput.parse(args);
      const filePath = resolve(input.file_path);
      const fileBuffer = await readFile(filePath);
      const filename = filePath.split('/').pop() || 'file.csv';

      const result = await client.parse(fileBuffer, filename, {
        exchange: input.exchange,
        output_format: input.output_format,
      });

      if (result.status === 'error') {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${result.message}${result.suggestion ? `\n\nSuggestion: ${result.suggestion}` : ''}`,
            },
          ],
        };
      }

      const summary = result.summary || `Parsed ${result.metadata?.transaction_count || 0} transactions`;
      const txPreview = result.transactions?.slice(0, 5) || [];

      return {
        content: [
          {
            type: 'text',
            text: [
              summary,
              `Exchange: ${result.detected_source}`,
              `Format: ${result.output_format}`,
              `Transactions: ${result.metadata?.transaction_count}`,
              result.warnings?.length ? `\nWarnings:\n${result.warnings.join('\n')}` : '',
              `\nFirst ${txPreview.length} transactions:\n${JSON.stringify(txPreview, null, 2)}`,
            ]
              .filter(Boolean)
              .join('\n'),
          },
        ],
      };
    }

    case 'parse_bank_statement': {
      const input = ParseBankInput.parse(args);
      const filePath = resolve(input.file_path);
      const fileBuffer = await readFile(filePath);
      const filename = filePath.split('/').pop() || 'file.pdf';

      const result = await client.parse(fileBuffer, filename, {
        bank: input.bank,
      });

      if (result.status === 'error') {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${result.message}${result.suggestion ? `\n\nSuggestion: ${result.suggestion}` : ''}`,
            },
          ],
        };
      }

      const summary = result.summary || `Parsed ${result.metadata?.transaction_count || 0} transactions`;
      const txPreview = result.transactions?.slice(0, 5) || [];

      return {
        content: [
          {
            type: 'text',
            text: [
              summary,
              `Bank: ${result.detected_source}`,
              `Transactions: ${result.metadata?.transaction_count}`,
              result.warnings?.length ? `\nWarnings:\n${result.warnings.join('\n')}` : '',
              `\nFirst ${txPreview.length} transactions:\n${JSON.stringify(txPreview, null, 2)}`,
            ]
              .filter(Boolean)
              .join('\n'),
          },
        ],
      };
    }

    case 'list_supported_sources': {
      const result = await client.listSources();

      return {
        content: [
          {
            type: 'text',
            text: [
              '## Supported Crypto Exchanges',
              ...result.crypto_exchanges.map((e) => `- ${e.name}`),
              '',
              '## Supported Banks',
              ...result.banks.map((b) => `- ${b.name}`),
              '',
              `Crypto output formats: ${result.output_formats.crypto.join(', ')}`,
              `Bank output formats: ${result.output_formats.bank.join(', ')}`,
            ].join('\n'),
          },
        ],
      };
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      };
  }
}
