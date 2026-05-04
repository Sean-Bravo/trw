/**
 * Smoke tests for TaxFormatterClient.
 *
 * Validates:
 *   - Each method (parse, listSources, getUsage) hits the right URL with X-API-Key.
 *   - Non-2xx responses surface as TaxFormatterError with the upstream code/message.
 *
 * Mocks: global fetch.
 */

import { TaxFormatterClient, TaxFormatterError } from '../src/client';

describe('TaxFormatterClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  function mockFetchResponse(status: number, body: unknown) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    }) as unknown as typeof fetch;
  }

  describe('parse', () => {
    it('POSTs to /v1/parse with base64 file_content and X-API-Key header', async () => {
      mockFetchResponse(200, {
        status: 'success',
        detected_source: 'coinbase',
        metadata: { transaction_count: 1 },
      });

      const client = new TaxFormatterClient('tf_live_test', { baseUrl: 'https://api.example' });
      const result = await client.parse(Buffer.from('Date,Amount\n2024,100'), 'test.csv');

      expect(result.status).toBe('success');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('https://api.example/v1/parse');
      expect(init.method).toBe('POST');
      expect(init.headers['X-API-Key']).toBe('tf_live_test');

      const body = JSON.parse(init.body);
      expect(body.filename).toBe('test.csv');
      // Base64-decoding the content recovers the original bytes.
      expect(Buffer.from(body.file_content, 'base64').toString()).toBe('Date,Amount\n2024,100');
    });

    it('forwards optional exchange / output_format / bank options', async () => {
      mockFetchResponse(200, { status: 'success' });
      const client = new TaxFormatterClient('tf_live_test', { baseUrl: 'https://api.example' });

      await client.parse(Buffer.from('x'), 'a.csv', {
        exchange: 'coinbase',
        output_format: 'koinly',
      });

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.exchange).toBe('coinbase');
      expect(body.output_format).toBe('koinly');
    });
  });

  describe('listSources', () => {
    it('GETs /v1/sources with X-API-Key', async () => {
      mockFetchResponse(200, {
        crypto_exchanges: [{ id: 'coinbase', name: 'Coinbase' }],
        banks: [],
        output_formats: { crypto: ['koinly'], bank: ['qbo'] },
      });

      const client = new TaxFormatterClient('tf_live_test', { baseUrl: 'https://api.example' });
      const result = await client.listSources();

      expect(result.crypto_exchanges).toHaveLength(1);
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('https://api.example/v1/sources');
      expect((global.fetch as jest.Mock).mock.calls[0][1].headers['X-API-Key']).toBe('tf_live_test');
    });
  });

  describe('getUsage', () => {
    it('GETs /v1/usage with X-API-Key', async () => {
      mockFetchResponse(200, {
        usage: [
          {
            key_id: 'key-1',
            key_name: 'Default',
            tier: 'free',
            monthly_quota: 25,
            current_month: { file_count: 3, request_count: 10 },
          },
        ],
      });

      const client = new TaxFormatterClient('tf_live_test', { baseUrl: 'https://api.example' });
      const result = await client.getUsage();

      expect(result.usage[0]?.tier).toBe('free');
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('https://api.example/v1/usage');
    });
  });

  describe('error path', () => {
    it('throws TaxFormatterError with upstream code/message on 401', async () => {
      mockFetchResponse(401, {
        code: 'invalid_api_key',
        message: 'Key missing or revoked.',
        suggestion: 'Generate a new key at the dashboard.',
      });

      const client = new TaxFormatterClient('tf_live_bad', { baseUrl: 'https://api.example' });

      await expect(client.listSources()).rejects.toMatchObject({
        name: 'TaxFormatterError',
        code: 'invalid_api_key',
        statusCode: 401,
        suggestion: 'Generate a new key at the dashboard.',
      });
    });

    it('throws TaxFormatterError on 429 quota_exceeded (free tier hard-block)', async () => {
      mockFetchResponse(429, {
        code: 'quota_exceeded',
        message: 'Free tier monthly limit of 25 files reached.',
      });

      const client = new TaxFormatterClient('tf_live_free', { baseUrl: 'https://api.example' });

      const error = await client
        .parse(Buffer.from('x'), 'a.csv')
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(TaxFormatterError);
      expect((error as TaxFormatterError).code).toBe('quota_exceeded');
      expect((error as TaxFormatterError).statusCode).toBe(429);
    });
  });
});
