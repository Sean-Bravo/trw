import { readFile, access } from 'fs/promises';
import { resolve, basename } from 'path';
import type { TaxFormatterClient } from './client.js';

export async function handleTool(
  client: TaxFormatterClient,
  name: string,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  switch (name) {
    case 'parse_crypto_csv': {
      const input = args as { file_path: string; exchange?: string; output_format?: string };
      const filePath = resolve(input.file_path);
      await access(filePath).catch(() => {
        throw new Error(`File not found: ${filePath}`);
      });
      const fileBuffer = await readFile(filePath);
      const filename = basename(filePath);

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
      const input = args as { file_path: string; bank?: string };
      const filePath = resolve(input.file_path);
      await access(filePath).catch(() => {
        throw new Error(`File not found: ${filePath}`);
      });
      const fileBuffer = await readFile(filePath);
      const filename = basename(filePath);

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
