/**
 * Tests for /api/bank/presigned-url route
 */

import { getServerSession } from 'next-auth';
import { POST } from '@/app/api/bank/presigned-url/route';
import { createMockRequest } from '../../utils/mock-request';
import * as rateLimit from '@/lib/rate-limit';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}));

jest.mock('@/lib/rate-limit', () => ({
  rateLimiters: {
    fileUpload: {
      check: jest.fn().mockResolvedValue({ success: true }),
    },
  },
  getClientIdentifier: jest.fn().mockReturnValue('test-ip'),
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockRateLimit = rateLimit as jest.Mocked<typeof rateLimit>;

const mockLambdaResponse = (overrides: Partial<{ uploadUrl: string; jobId: string; key: string; expiresIn: number }> = {}) => ({
  uploadUrl: 'https://s3.example.com/presigned',
  jobId: 'job-123',
  key: 'bank/user-1/abc.pdf',
  expiresIn: 3600,
  ...overrides,
});

describe('POST /api/bank/presigned-url', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockRateLimit.rateLimiters.fileUpload.check as jest.Mock).mockResolvedValue({ success: true });
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com', subscriptionTier: 'pro' },
      expires: '2025-12-31',
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockLambdaResponse()),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Successful requests', () => {
    it('returns presigned URL and metadata for valid PDF filename', async () => {
      const request = createMockRequest({ filename: 'statement.pdf' });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.uploadUrl).toBe('https://s3.example.com/presigned');
      expect(data.jobId).toBe('job-123');
      expect(data.key).toBe('bank/user-1/abc.pdf');
      expect(data.expiresIn).toBe(3600);
    });

    it('calls Lambda with filename, contentType, and userId', async () => {
      const request = createMockRequest({ filename: 'my-bank-statement.pdf' });

      await POST(request as any);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/bank/presigned-url'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: 'my-bank-statement.pdf',
            contentType: 'application/pdf',
            userId: 'user-1',
          }),
        })
      );
    });

    it('accepts PDF with uppercase extension', async () => {
      const request = createMockRequest({ filename: 'statement.PDF' });

      const response = await POST(request as any);

      expect(response.status).toBe(200);
    });

    it('succeeds for premium tier', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-2', email: 'premium@example.com', subscriptionTier: 'premium' },
        expires: '2025-12-31',
      });

      const request = createMockRequest({ filename: 'statement.pdf' });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.uploadUrl).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = createMockRequest({ filename: 'statement.pdf' });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns 401 when session has no user id', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
        expires: '2025-12-31',
      } as any);

      const request = createMockRequest({ filename: 'statement.pdf' });

      const response = await POST(request as any);

      expect(response.status).toBe(401);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Subscription tier', () => {
    it('returns 403 for free tier', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', email: 'free@example.com', subscriptionTier: 'free' },
        expires: '2025-12-31',
      });

      const request = createMockRequest({ filename: 'statement.pdf' });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Bank statement processing requires a Pro or Premium subscription');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('treats missing subscriptionTier as free', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' },
        expires: '2025-12-31',
      } as any);

      const request = createMockRequest({ filename: 'statement.pdf' });

      const response = await POST(request as any);

      expect(response.status).toBe(403);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Request body validation', () => {
    it('returns 400 when filename is missing', async () => {
      const request = createMockRequest({});

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing or invalid filename');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns 400 when filename is not a string', async () => {
      const request = createMockRequest({ filename: 123 });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing or invalid filename');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns 400 when filename is null', async () => {
      const request = createMockRequest({ filename: null });

      const response = await POST(request as any);

      expect(response.status).toBe(400);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns 400 for non-PDF extension', async () => {
      const request = createMockRequest({ filename: 'statement.csv' });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Only PDF files are supported');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns 400 for .docx', async () => {
      const request = createMockRequest({ filename: 'statement.docx' });

      const response = await POST(request as any);

      expect(response.status).toBe(400);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Rate limiting', () => {
    it('returns 429 when upload rate limit exceeded', async () => {
      (mockRateLimit.rateLimiters.fileUpload.check as jest.Mock).mockResolvedValue({ success: false });

      const request = createMockRequest({ filename: 'statement.pdf' });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Upload limit reached. Please try again later.');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('checks fileUpload rate limiter with client identifier', async () => {
      const request = createMockRequest({ filename: 'statement.pdf' });

      await POST(request as any);

      expect(mockRateLimit.getClientIdentifier).toHaveBeenCalledWith(request);
      expect(mockRateLimit.rateLimiters.fileUpload.check).toHaveBeenCalledWith('test-ip');
    });
  });

  describe('Lambda / API Gateway', () => {
    it('propagates Lambda error message when Lambda returns non-2xx', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'S3 bucket misconfigured' }),
      });

      const request = createMockRequest({ filename: 'statement.pdf' });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('S3 bucket misconfigured');
    });

    it('returns generic error when Lambda error body has no error field', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.resolve({}),
      });

      const request = createMockRequest({ filename: 'statement.pdf' });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.error).toBe('Failed to generate upload URL');
    });

    it('handles Lambda response that is not valid JSON', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const request = createMockRequest({ filename: 'statement.pdf' });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to generate upload URL');
    });
  });

  describe('Error handling', () => {
    it('returns 500 on unexpected error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const request = createMockRequest({ filename: 'statement.pdf' });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('returns 500 when request.json() throws', async () => {
      const request = {
        ...createMockRequest({ filename: 'statement.pdf' }),
        json: () => Promise.reject(new Error('Parse error')),
      };

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
