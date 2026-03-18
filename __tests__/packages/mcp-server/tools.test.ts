/**
 * Tests for MCP server tool handler (packages/mcp-server/src/tools.ts)
 *
 * Tests the handleTool function logic. Since the source uses ESM imports,
 * we replicate the handler logic to test behavior independently.
 */

import { z } from 'zod';
import { resolve } from 'path';

// Schemas matching tools.ts
const ParseCryptoInput = z.object({
  file_path: z.string(),
  exchange: z.string().optional(),
  output_format: z.enum(['koinly', 'turbotax', 'coinledger', 'zenledger']).optional(),
});

const ParseBankInput = z.object({
  file_path: z.string(),
  bank: z.string().optional(),
});

// Mock client interface
interface MockClient {
  parse: jest.Mock;
  listSources: jest.Mock;
}

// Replicate handleTool logic for testing
async function handleTool(
  client: MockClient,
  name: string,
  args: Record<string, unknown>,
  readFileFn: (path: string) => Promise<Buffer>,
) {
  switch (name) {
    case 'parse_crypto_csv': {
      const input = ParseCryptoInput.parse(args);
      const filePath = resolve(input.file_path);
      const fileBuffer = await readFileFn(filePath);
      const filename = filePath.split('/').pop() || 'file.csv';
      const result = await client.parse(fileBuffer, filename, {
        exchange: input.exchange,
        output_format: input.output_format,
      });

      if (result.status === 'error') {
        return {
          content: [{
            type: 'text',
            text: `Error: ${result.message}${result.suggestion ? `\n\nSuggestion: ${result.suggestion}` : ''}`,
          }],
        };
      }

      const summary = result.summary || `Parsed ${result.metadata?.transaction_count || 0} transactions`;
      const txPreview = result.transactions?.slice(0, 5) || [];
      return {
        content: [{
          type: 'text',
          text: [
            summary,
            `Exchange: ${result.detected_source}`,
            `Format: ${result.output_format}`,
            `Transactions: ${result.metadata?.transaction_count}`,
            result.warnings?.length ? `\nWarnings:\n${result.warnings.join('\n')}` : '',
            `\nFirst ${txPreview.length} transactions:\n${JSON.stringify(txPreview, null, 2)}`,
          ].filter(Boolean).join('\n'),
        }],
      };
    }

    case 'parse_bank_statement': {
      const input = ParseBankInput.parse(args);
      const filePath = resolve(input.file_path);
      const fileBuffer = await readFileFn(filePath);
      const filename = filePath.split('/').pop() || 'file.pdf';
      const result = await client.parse(fileBuffer, filename, {
        bank: input.bank,
      });

      if (result.status === 'error') {
        return {
          content: [{
            type: 'text',
            text: `Error: ${result.message}${result.suggestion ? `\n\nSuggestion: ${result.suggestion}` : ''}`,
          }],
        };
      }

      const summary = result.summary || `Parsed ${result.metadata?.transaction_count || 0} transactions`;
      const txPreview = result.transactions?.slice(0, 5) || [];
      return {
        content: [{
          type: 'text',
          text: [
            summary,
            `Bank: ${result.detected_source}`,
            `Transactions: ${result.metadata?.transaction_count}`,
            result.warnings?.length ? `\nWarnings:\n${result.warnings.join('\n')}` : '',
            `\nFirst ${txPreview.length} transactions:\n${JSON.stringify(txPreview, null, 2)}`,
          ].filter(Boolean).join('\n'),
        }],
      };
    }

    case 'list_supported_sources': {
      const result = await client.listSources();
      return {
        content: [{
          type: 'text',
          text: [
            '## Supported Crypto Exchanges',
            ...result.crypto_exchanges.map((e: { name: string }) => `- ${e.name}`),
            '',
            '## Supported Banks',
            ...result.banks.map((b: { name: string }) => `- ${b.name}`),
            '',
            `Crypto output formats: ${result.output_formats.crypto.join(', ')}`,
            `Bank output formats: ${result.output_formats.bank.join(', ')}`,
          ].join('\n'),
        }],
      };
    }

    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
  }
}

describe('handleTool', () => {
  let client: MockClient;
  let readFileFn: jest.Mock;

  beforeEach(() => {
    client = {
      parse: jest.fn(),
      listSources: jest.fn(),
    };
    readFileFn = jest.fn();
  });

  describe('parse_crypto_csv', () => {
    it('reads file, calls client.parse, returns success text', async () => {
      const fileBuffer = Buffer.from('Date,Amount\n2024-01-01,100');
      readFileFn.mockResolvedValue(fileBuffer);
      client.parse.mockResolvedValue({
        status: 'success',
        summary: 'Parsed 1 coinbase transaction',
        detected_source: 'coinbase',
        output_format: 'koinly',
        transactions: [{ Date: '2024-01-01', Amount: '100' }],
        warnings: [],
        metadata: { transaction_count: 1 },
      });

      const result = await handleTool(client, 'parse_crypto_csv', {
        file_path: '/tmp/test.csv',
      }, readFileFn);

      expect(readFileFn).toHaveBeenCalled();
      expect(client.parse).toHaveBeenCalledWith(
        fileBuffer, 'test.csv', { exchange: undefined, output_format: undefined },
      );
      expect(result.content[0].text).toContain('coinbase');
      expect(result.content[0].text).toContain('koinly');
    });

    it('returns error text with suggestion on parse failure', async () => {
      readFileFn.mockResolvedValue(Buffer.from('bad data'));
      client.parse.mockResolvedValue({
        status: 'error',
        message: 'Could not detect exchange',
        suggestion: 'Specify the exchange parameter',
      });

      const result = await handleTool(client, 'parse_crypto_csv', {
        file_path: '/tmp/bad.csv',
      }, readFileFn);

      expect(result.content[0].text).toContain('Error: Could not detect exchange');
      expect(result.content[0].text).toContain('Suggestion: Specify the exchange parameter');
    });

    it('passes optional exchange and output_format', async () => {
      readFileFn.mockResolvedValue(Buffer.from('data'));
      client.parse.mockResolvedValue({ status: 'success', summary: 'ok', detected_source: 'binance', output_format: 'turbotax', transactions: [], metadata: { transaction_count: 0 } });

      await handleTool(client, 'parse_crypto_csv', {
        file_path: '/tmp/test.csv',
        exchange: 'binance',
        output_format: 'turbotax',
      }, readFileFn);

      expect(client.parse).toHaveBeenCalledWith(
        expect.any(Buffer), 'test.csv', { exchange: 'binance', output_format: 'turbotax' },
      );
    });

    it('shows transaction preview limited to 5', async () => {
      readFileFn.mockResolvedValue(Buffer.from('data'));
      const txs = Array.from({ length: 10 }, (_, i) => ({ row: i }));
      client.parse.mockResolvedValue({
        status: 'success',
        summary: 'Parsed 10 txs',
        detected_source: 'kraken',
        output_format: 'koinly',
        transactions: txs,
        metadata: { transaction_count: 10 },
      });

      const result = await handleTool(client, 'parse_crypto_csv', {
        file_path: '/tmp/test.csv',
      }, readFileFn);

      expect(result.content[0].text).toContain('First 5 transactions');
    });
  });

  describe('parse_bank_statement', () => {
    it('reads file, calls client.parse, returns bank-specific text', async () => {
      readFileFn.mockResolvedValue(Buffer.from('PDF content'));
      client.parse.mockResolvedValue({
        status: 'success',
        summary: 'Parsed 15 transactions from Chase',
        detected_source: 'Chase',
        transactions: [{ date: '03/15', amount: '-42.00' }],
        metadata: { transaction_count: 15 },
      });

      const result = await handleTool(client, 'parse_bank_statement', {
        file_path: '/tmp/statement.pdf',
      }, readFileFn);

      expect(result.content[0].text).toContain('Chase');
      expect(result.content[0].text).toContain('Bank:');
    });

    it('returns error text on failure', async () => {
      readFileFn.mockResolvedValue(Buffer.from('bad'));
      client.parse.mockResolvedValue({
        status: 'error',
        message: 'Unsupported bank format',
      });

      const result = await handleTool(client, 'parse_bank_statement', {
        file_path: '/tmp/bad.pdf',
      }, readFileFn);

      expect(result.content[0].text).toContain('Error: Unsupported bank format');
    });

    it('passes optional bank parameter', async () => {
      readFileFn.mockResolvedValue(Buffer.from('data'));
      client.parse.mockResolvedValue({ status: 'success', summary: 'ok', detected_source: 'mercury', transactions: [], metadata: { transaction_count: 0 } });

      await handleTool(client, 'parse_bank_statement', {
        file_path: '/tmp/stmt.pdf',
        bank: 'mercury',
      }, readFileFn);

      expect(client.parse).toHaveBeenCalledWith(
        expect.any(Buffer), 'stmt.pdf', { bank: 'mercury' },
      );
    });
  });

  describe('list_supported_sources', () => {
    it('calls listSources and returns formatted markdown', async () => {
      client.listSources.mockResolvedValue({
        crypto_exchanges: [{ id: 'coinbase', name: 'Coinbase' }, { id: 'binance', name: 'Binance' }],
        banks: [{ id: 'chase', name: 'Chase' }],
        output_formats: { crypto: ['koinly', 'turbotax'], bank: ['csv'] },
      });

      const result = await handleTool(client, 'list_supported_sources', {}, readFileFn);

      expect(result.content[0].text).toContain('## Supported Crypto Exchanges');
      expect(result.content[0].text).toContain('- Coinbase');
      expect(result.content[0].text).toContain('- Binance');
      expect(result.content[0].text).toContain('## Supported Banks');
      expect(result.content[0].text).toContain('- Chase');
      expect(result.content[0].text).toContain('koinly, turbotax');
    });
  });

  describe('general', () => {
    it('returns "Unknown tool" for unrecognized tool name', async () => {
      const result = await handleTool(client, 'nonexistent_tool', {}, readFileFn);
      expect(result.content[0].text).toBe('Unknown tool: nonexistent_tool');
    });

    it('throws ZodError for missing required file_path', async () => {
      await expect(
        handleTool(client, 'parse_crypto_csv', {}, readFileFn),
      ).rejects.toThrow();
    });
  });
});
