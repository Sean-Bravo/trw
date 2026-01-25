/**
 * Tests for GET /api/bank/banks route
 */

import { GET } from '@/app/api/bank/banks/route';
import { createMockRequest } from '../../utils/mock-request';

const FALLBACK_RESPONSE = {
  banks: [
    { id: 'chase', name: 'Chase' },
    { id: 'bank_of_america', name: 'Bank of America' },
    { id: 'wells_fargo', name: 'Wells Fargo' },
    { id: 'citi', name: 'Citi' },
  ],
  formats: [
    { id: 'qbo', name: 'QuickBooks Online' },
    { id: 'xero', name: 'Xero' },
    { id: 'excel', name: 'Excel/Generic' },
  ],
};

describe('GET /api/bank/banks', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          banks: [{ id: 'chase', name: 'Chase' }],
          formats: [{ id: 'qbo', name: 'QuickBooks Online' }],
        }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns banks and formats from Lambda when Lambda succeeds', async () => {
    const lambdaData = {
      banks: [{ id: 'chase', name: 'Chase' }, { id: 'amex', name: 'American Express' }],
      formats: [{ id: 'qbo', name: 'QuickBooks' }, { id: 'csv', name: 'CSV' }],
    };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(lambdaData),
    });

    const request = createMockRequest({});
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.banks).toEqual(lambdaData.banks);
    expect(data.formats).toEqual(lambdaData.formats);
  });

  it('calls Lambda GET /bank/banks', async () => {
    const request = createMockRequest({});

    await GET(request as any);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/bank\/banks$/),
      expect.objectContaining({
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('returns fallback when Lambda returns non-2xx', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Lambda error' }),
    });

    const request = createMockRequest({});
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(FALLBACK_RESPONSE);
  });

  it('returns fallback when fetch throws', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const request = createMockRequest({});
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(FALLBACK_RESPONSE);
  });
});
