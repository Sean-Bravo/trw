import { TaxFormatter, TaxFormatterError, AuthenticationError, RateLimitError, ParseError } from '../src';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

function mockResponse(status: number, body: any, headers?: Record<string, string>) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Map(Object.entries(headers || {})),
    json: async () => body,
  };
}

describe('TaxFormatter', () => {
  it('throws if no API key', () => {
    expect(() => new TaxFormatter('')).toThrow('API key is required');
  });

  it('sets default options', () => {
    const tf = new TaxFormatter('tf_live_xxx');
    expect(tf).toBeDefined();
  });

  it('accepts custom options', () => {
    const tf = new TaxFormatter('tf_live_xxx', {
      baseUrl: 'https://custom.api.com',
      timeout: 5000,
      maxRetries: 1,
    });
    expect(tf).toBeDefined();
  });
});

describe('parse', () => {
  it('sends base64 file content', async () => {
    const tf = new TaxFormatter('tf_live_xxx');
    mockFetch.mockResolvedValueOnce(mockResponse(200, {
      status: 'success',
      detected_source: 'coinbase',
      transactions: [{ date: '2025-01-01' }],
      metadata: { transaction_count: 1 },
    }));

    const result = await tf.parse(Buffer.from('csv,data'), 'coinbase.csv');

    expect(result.status).toBe('success');
    expect(result.detected_source).toBe('coinbase');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.taxformatter.com/v1/parse',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('passes parse options', async () => {
    const tf = new TaxFormatter('tf_live_xxx');
    mockFetch.mockResolvedValueOnce(mockResponse(200, { status: 'success' }));

    await tf.parse(Buffer.from('data'), 'file.csv', { outputFormat: 'turbotax', exchange: 'binance' });

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.output_format).toBe('turbotax');
    expect(callBody.exchange).toBe('binance');
  });

  it('throws AuthenticationError on 401', async () => {
    const tf = new TaxFormatter('bad_key');
    mockFetch.mockResolvedValueOnce(mockResponse(401, {
      code: 'invalid_api_key',
      message: 'Invalid or revoked API key.',
    }));

    await expect(tf.parse(Buffer.from('data'), 'file.csv')).rejects.toThrow(AuthenticationError);
  });

  it('throws ParseError on 422', async () => {
    const tf = new TaxFormatter('tf_live_xxx');
    mockFetch.mockResolvedValueOnce(mockResponse(422, {
      code: 'parse_error',
      message: 'Could not detect exchange',
      suggestion: 'Specify the exchange parameter',
    }));

    await expect(tf.parse(Buffer.from('data'), 'file.csv')).rejects.toThrow(ParseError);
  });

  it('retries on 429 with exponential backoff', async () => {
    const tf = new TaxFormatter('tf_live_xxx', { maxRetries: 2 });

    mockFetch
      .mockResolvedValueOnce(mockResponse(429, {
        code: 'rate_limited',
        message: 'Rate limit exceeded',
        metadata: { retry_after_seconds: 60 },
      }, { 'Retry-After': '1' }))
      .mockResolvedValueOnce(mockResponse(200, { status: 'success' }));

    const result = await tf.parse(Buffer.from('data'), 'file.csv');
    expect(result.status).toBe('success');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  }, 10000);

  it('throws RateLimitError after max retries', async () => {
    const tf = new TaxFormatter('tf_live_xxx', { maxRetries: 1 });

    mockFetch.mockResolvedValue(mockResponse(429, {
      code: 'rate_limited',
      message: 'Rate limit exceeded',
    }, { 'Retry-After': '0' }));

    await expect(tf.parse(Buffer.from('data'), 'file.csv')).rejects.toThrow(RateLimitError);
  });

  it('throws TaxFormatterError on 500', async () => {
    const tf = new TaxFormatter('tf_live_xxx');
    mockFetch.mockResolvedValueOnce(mockResponse(500, {
      code: 'internal_error',
      message: 'Internal server error',
    }));

    await expect(tf.parse(Buffer.from('data'), 'file.csv')).rejects.toThrow(TaxFormatterError);
  });
});

describe('listSources', () => {
  it('returns sources', async () => {
    const tf = new TaxFormatter('tf_live_xxx');
    mockFetch.mockResolvedValueOnce(mockResponse(200, {
      crypto_exchanges: [{ id: 'coinbase', name: 'Coinbase' }],
      banks: [{ id: 'chase', name: 'Chase' }],
      output_formats: { crypto: ['koinly'], bank: ['csv'] },
    }));

    const result = await tf.listSources();
    expect(result.crypto_exchanges).toHaveLength(1);
    expect(result.banks).toHaveLength(1);
  });
});

describe('getUsage', () => {
  it('returns usage data', async () => {
    const tf = new TaxFormatter('tf_live_xxx');
    mockFetch.mockResolvedValueOnce(mockResponse(200, {
      usage: [{ key_id: 'k1', key_name: 'test', tier: 'starter', monthly_quota: 100, current_month: { file_count: 5, request_count: 10 } }],
    }));

    const result = await tf.getUsage();
    expect(result.usage).toHaveLength(1);
    expect(result.usage[0].tier).toBe('starter');
  });
});

describe('health', () => {
  it('returns health status', async () => {
    const tf = new TaxFormatter('tf_live_xxx');
    mockFetch.mockResolvedValueOnce(mockResponse(200, {
      status: 'ok',
      version: '2026-03-01',
      environment: 'prod',
    }));

    const result = await tf.health();
    expect(result.status).toBe('ok');
  });
});

describe('error classes', () => {
  it('TaxFormatterError has code and statusCode', () => {
    const err = new TaxFormatterError('test', 'msg', 400, 'suggestion');
    expect(err.code).toBe('test');
    expect(err.statusCode).toBe(400);
    expect(err.suggestion).toBe('suggestion');
    expect(err.name).toBe('TaxFormatterError');
  });

  it('AuthenticationError defaults', () => {
    const err = new AuthenticationError();
    expect(err.statusCode).toBe(401);
    expect(err.name).toBe('AuthenticationError');
  });

  it('RateLimitError has retryAfterSeconds', () => {
    const err = new RateLimitError('limit', 60);
    expect(err.statusCode).toBe(429);
    expect(err.retryAfterSeconds).toBe(60);
  });

  it('ParseError has suggestion', () => {
    const err = new ParseError('parse_error', 'bad file', 'try again');
    expect(err.statusCode).toBe(422);
    expect(err.suggestion).toBe('try again');
  });
});
