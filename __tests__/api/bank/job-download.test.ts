/**
 * Tests for GET /api/bank/job/[jobId]/download route
 */

import { GET } from '@/app/api/bank/job/[jobId]/download/route';
import { createMockRequest } from '../../utils/mock-request';

function createContext(jobId: string) {
  return { params: Promise.resolve({ jobId }) };
}

describe('GET /api/bank/job/[jobId]/download', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ downloadUrl: 'https://s3.example.com/presigned-download' }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Successful requests', () => {
    it('returns Lambda response with download URL', async () => {
      const lambdaData = { downloadUrl: 'https://s3.example.com/result.qbo' };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(lambdaData),
      });

      const request = createMockRequest({});
      const response = await GET(request as any, createContext('job-123'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.downloadUrl).toBe('https://s3.example.com/result.qbo');
    });

    it('calls Lambda with format query defaulting to csv', async () => {
      const request = createMockRequest({});

      await GET(request as any, createContext('job-456'));

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\?format=csv$/),
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('passes format from request URL to Lambda', async () => {
      const request = createMockRequest({}, {
        url: 'http://localhost/api/bank/job/j1/download?format=xero',
      });

      await GET(request as any, createContext('j1'));

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\?format=xero$/),
        expect.any(Object)
      );
    });

    it('calls Lambda GET /bank/job/:jobId/download', async () => {
      const request = createMockRequest({});

      await GET(request as any, createContext('job-789'));

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/bank\/job\/job-789\/download\?format=csv$/),
        expect.any(Object)
      );
    });
  });

  describe('Validation', () => {
    it('returns 400 when jobId is missing', async () => {
      const request = createMockRequest({});
      const response = await GET(request as any, createContext(''));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing jobId');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Lambda errors', () => {
    it('propagates Lambda response and status when Lambda returns non-2xx', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Job not found' }),
      });

      const request = createMockRequest({});
      const response = await GET(request as any, createContext('job-123'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Job not found');
    });
  });

  describe('Error handling', () => {
    it('returns 500 when fetch throws', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const request = createMockRequest({});
      const response = await GET(request as any, createContext('job-123'));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
