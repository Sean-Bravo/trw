/**
 * Tests for POST /api/bank/process route
 */

import { getServerSession } from 'next-auth';
import { POST } from '@/app/api/bank/process/route';
import { createMockRequest } from '../../utils/mock-request';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}));

jest.mock('@/lib/db', () => ({
  query: jest.fn().mockResolvedValue({ rowCount: 1 }),
  queryOne: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/rate-limit', () => ({
  getClientIdentifier: jest.fn().mockReturnValue('test-ip'),
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe('POST /api/bank/process', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
      expires: '2025-12-31',
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ success: true, jobId: 'job-123', status: 'completed' }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Successful requests', () => {
    it('returns Lambda response when processing succeeds', async () => {
      const lambdaData = { success: true, jobId: 'job-123', status: 'completed' };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(lambdaData),
      });

      const request = createMockRequest({ jobId: 'job-123', s3Key: 'bank/user-1/abc.pdf' });
      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(lambdaData);
    });

    it('calls Lambda with jobId, s3Key, and outputFormat', async () => {
      const request = createMockRequest({
        jobId: 'job-456',
        s3Key: 'bank/user-1/statement.pdf',
        outputFormat: 'xero',
      });

      await POST(request as any);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/bank/process'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId: 'job-456',
            s3Key: 'bank/user-1/statement.pdf',
            outputFormat: 'xero',
          }),
        })
      );
    });

    it('defaults outputFormat to qbo when omitted', async () => {
      const request = createMockRequest({ jobId: 'job-1', s3Key: 'key.pdf' });

      await POST(request as any);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            jobId: 'job-1',
            s3Key: 'key.pdf',
            outputFormat: 'qbo',
          }),
        })
      );
    });

  });

  describe('Anonymous access', () => {
    it('allows anonymous users (no session)', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = createMockRequest({ jobId: 'j1', s3Key: 'k.pdf' });
      const response = await POST(request as any);

      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('allows session without user id', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'x@x.com' },
        expires: '2025-12-31',
      } as any);

      const request = createMockRequest({ jobId: 'j1', s3Key: 'k.pdf' });
      const response = await POST(request as any);

      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Request body validation', () => {
    it('returns 400 when jobId is missing', async () => {
      const request = createMockRequest({ s3Key: 'k.pdf' });
      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing jobId or s3Key');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns 400 when s3Key is missing', async () => {
      const request = createMockRequest({ jobId: 'j1' });
      const response = await POST(request as any);

      expect(response.status).toBe(400);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns 400 when outputFormat is invalid', async () => {
      const request = createMockRequest({
        jobId: 'j1',
        s3Key: 'k.pdf',
        outputFormat: 'invalid',
      });
      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid output format');
      expect(data.error).toContain('qbo, xero, excel');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('accepts outputFormat excel', async () => {
      const request = createMockRequest({
        jobId: 'j1',
        s3Key: 'k.pdf',
        outputFormat: 'excel',
      });

      await POST(request as any);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            jobId: 'j1',
            s3Key: 'k.pdf',
            outputFormat: 'excel',
          }),
        })
      );
    });
  });

  describe('Lambda errors', () => {
    it('propagates Lambda error and status when Lambda returns non-2xx', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({
            error: 'OCR failed',
            warnings: ['Low resolution'],
          }),
      });

      const request = createMockRequest({ jobId: 'j1', s3Key: 'k.pdf' });
      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('OCR failed');
      expect(data.warnings).toEqual(['Low resolution']);
    });

    it('returns default error and empty warnings when Lambda body has no error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.resolve({}),
      });

      const request = createMockRequest({ jobId: 'j1', s3Key: 'k.pdf' });
      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Processing failed');
      expect(data.warnings).toEqual([]);
    });
  });

  describe('Error handling', () => {
    it('returns 500 when fetch throws', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const request = createMockRequest({ jobId: 'j1', s3Key: 'k.pdf' });
      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('returns 500 when request.json() throws', async () => {
      const request = {
        ...createMockRequest({ jobId: 'j1', s3Key: 'k.pdf' }),
        json: () => Promise.reject(new Error('Parse error')),
      };

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
