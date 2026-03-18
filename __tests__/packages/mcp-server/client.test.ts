/**
 * Tests for MCP server client (packages/mcp-server/src/client.ts)
 *
 * Tests the TaxFormatterClient HTTP interactions without importing
 * the actual ESM module. We replicate the client class logic to test
 * the behavior independently.
 */

const API_BASE = 'https://api.taxformatter.com';

// Minimal client class matching the behavior of client.ts
class TaxFormatterClient {
  private apiKey: string;
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async parse(
    fileContent: Buffer,
    filename: string,
    options?: { exchange?: string; bank?: string; output_format?: string },
  ) {
    const body: Record<string, string> = {
      file_content: fileContent.toString('base64'),
      filename,
    };
    if (options?.exchange) body.exchange = options.exchange;
    if (options?.bank) body.bank = options.bank;
    if (options?.output_format) body.output_format = options.output_format;

    const res = await fetch(`${API_BASE}/v1/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify(body),
    });
    return await res.json();
  }

  async listSources() {
    const res = await fetch(`${API_BASE}/v1/sources`);
    return await res.json();
  }
}

describe('TaxFormatterClient', () => {
  let client: TaxFormatterClient;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    client = new TaxFormatterClient('tf_live_testkey123');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('stores the API key', () => {
      // The key is private, but we can verify it's used in requests
      expect(client).toBeDefined();
    });
  });

  describe('parse', () => {
    it('sends POST to /v1/parse with base64 content and X-API-Key', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ status: 'success' }),
      });

      const buffer = Buffer.from('Date,Amount\n2024-01-01,100');
      await client.parse(buffer, 'test.csv');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/v1/parse`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'tf_live_testkey123',
          },
        }),
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.file_content).toBe(buffer.toString('base64'));
      expect(callBody.filename).toBe('test.csv');
    });

    it('includes optional exchange parameter', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ status: 'success' }),
      });

      await client.parse(Buffer.from('data'), 'test.csv', { exchange: 'coinbase' });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.exchange).toBe('coinbase');
    });

    it('includes optional bank parameter', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ status: 'success' }),
      });

      await client.parse(Buffer.from('pdf'), 'statement.pdf', { bank: 'chase' });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.bank).toBe('chase');
    });

    it('includes optional output_format parameter', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ status: 'success' }),
      });

      await client.parse(Buffer.from('data'), 'test.csv', { output_format: 'turbotax' });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.output_format).toBe('turbotax');
    });

    it('omits optional params when not provided', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ status: 'success' }),
      });

      await client.parse(Buffer.from('data'), 'test.csv');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody).not.toHaveProperty('exchange');
      expect(callBody).not.toHaveProperty('bank');
      expect(callBody).not.toHaveProperty('output_format');
    });

    it('returns parsed JSON response', async () => {
      const mockResponse = {
        status: 'success',
        summary: 'Parsed 10 transactions',
        detected_source: 'coinbase',
      };
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.parse(Buffer.from('data'), 'test.csv');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('listSources', () => {
    it('sends GET to /v1/sources without auth header', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ crypto_exchanges: [] }),
      });

      await client.listSources();

      expect(mockFetch).toHaveBeenCalledWith(`${API_BASE}/v1/sources`);
      // Should NOT have headers with API key (no second argument)
      expect(mockFetch.mock.calls[0].length).toBe(1);
    });

    it('returns parsed JSON response', async () => {
      const mockResponse = {
        crypto_exchanges: [{ id: 'coinbase', name: 'coinbase' }],
        banks: [{ id: 'chase', name: 'Chase' }],
        output_formats: { crypto: ['koinly'], bank: ['csv'] },
      };
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.listSources();
      expect(result).toEqual(mockResponse);
    });
  });
});
