/**
 * Smoke tests for the handleTool dispatcher.
 *
 * Validates each tool name actually shipped in src/tools.ts:
 *   - parse_crypto_csv
 *   - parse_bank_statement
 *   - list_supported_sources
 *   - unknown tool fallthrough
 *
 * Mocks: TaxFormatterClient (no real network); fs/promises for file reads.
 */

import { handleTool } from '../src/tools';
import type { TaxFormatterClient } from '../src/client';
import { writeFile, mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

function makeMockClient(overrides: Partial<TaxFormatterClient>): TaxFormatterClient {
  return overrides as unknown as TaxFormatterClient;
}

describe('handleTool', () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'mcp-server-test-'));
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe('parse_crypto_csv', () => {
    it('reads file from disk, calls client.parse, formats summary text', async () => {
      const filePath = join(tmpDir, 'coinbase_2024.csv');
      await writeFile(filePath, 'Date,Amount\n2024-01-01,100');

      const parseFn = jest.fn().mockResolvedValue({
        status: 'success',
        summary: 'Parsed 147 Coinbase transactions',
        detected_source: 'coinbase',
        output_format: 'koinly',
        transactions: [{ date: '2024-01-01', amount: 100 }],
        warnings: [],
        metadata: { transaction_count: 147 },
      });
      const client = makeMockClient({ parse: parseFn });

      const result = await handleTool(client, 'parse_crypto_csv', {
        file_path: filePath,
        exchange: 'coinbase',
      });

      expect(parseFn).toHaveBeenCalledWith(
        expect.any(Buffer),
        'coinbase_2024.csv',
        expect.objectContaining({ exchange: 'coinbase' }),
      );
      expect(result.content[0].text).toContain('Parsed 147 Coinbase transactions');
      expect(result.content[0].text).toContain('Exchange: coinbase');
      expect(result.content[0].text).toContain('Transactions: 147');
    });

    it('throws when the file does not exist', async () => {
      const client = makeMockClient({ parse: jest.fn() });
      await expect(
        handleTool(client, 'parse_crypto_csv', {
          file_path: join(tmpDir, 'does-not-exist.csv'),
        }),
      ).rejects.toThrow(/File not found/);
    });

    it('returns the API error message when parse responds with status=error', async () => {
      const filePath = join(tmpDir, 'bad.csv');
      await writeFile(filePath, 'garbage');

      const parseFn = jest.fn().mockResolvedValue({
        status: 'error',
        message: 'Could not auto-detect exchange.',
        suggestion: 'Pass exchange explicitly.',
      });
      const client = makeMockClient({ parse: parseFn });

      const result = await handleTool(client, 'parse_crypto_csv', { file_path: filePath });
      expect(result.content[0].text).toContain('Error: Could not auto-detect exchange.');
      expect(result.content[0].text).toContain('Suggestion: Pass exchange explicitly.');
    });
  });

  describe('parse_bank_statement', () => {
    it('reads file from disk, calls client.parse with bank option, formats summary', async () => {
      const filePath = join(tmpDir, 'chase_jan.pdf');
      await writeFile(filePath, '%PDF-1.4 fake');

      const parseFn = jest.fn().mockResolvedValue({
        status: 'success',
        summary: 'Parsed 42 transactions from Chase',
        detected_source: 'chase',
        transactions: [],
        warnings: [],
        metadata: { transaction_count: 42 },
      });
      const client = makeMockClient({ parse: parseFn });

      const result = await handleTool(client, 'parse_bank_statement', {
        file_path: filePath,
        bank: 'chase',
      });

      expect(parseFn).toHaveBeenCalledWith(
        expect.any(Buffer),
        'chase_jan.pdf',
        expect.objectContaining({ bank: 'chase' }),
      );
      expect(result.content[0].text).toContain('Bank: chase');
      expect(result.content[0].text).toContain('Transactions: 42');
    });
  });

  describe('list_supported_sources', () => {
    it('calls client.listSources and formats markdown output', async () => {
      const listSources = jest.fn().mockResolvedValue({
        crypto_exchanges: [
          { id: 'coinbase', name: 'Coinbase' },
          { id: 'kraken', name: 'Kraken' },
        ],
        banks: [{ id: 'chase', name: 'Chase' }],
        output_formats: { crypto: ['koinly', 'turbotax'], bank: ['qbo'] },
      });
      const client = makeMockClient({ listSources });

      const result = await handleTool(client, 'list_supported_sources', {});

      expect(listSources).toHaveBeenCalled();
      const text = result.content[0].text;
      expect(text).toContain('Supported Crypto Exchanges');
      expect(text).toContain('Coinbase');
      expect(text).toContain('Kraken');
      expect(text).toContain('Supported Banks');
      expect(text).toContain('Chase');
      expect(text).toContain('Crypto output formats: koinly, turbotax');
    });
  });

  describe('unknown tool', () => {
    it('returns "Unknown tool" message rather than throwing', async () => {
      const client = makeMockClient({});
      const result = await handleTool(client, 'totally_made_up_tool', {});
      expect(result.content[0].text).toBe('Unknown tool: totally_made_up_tool');
    });
  });
});
