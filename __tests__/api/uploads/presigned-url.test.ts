/**
 * Tests for POST /api/uploads/presigned-url route (CSV uploads)
 */

import { getServerSession } from 'next-auth';
import { POST } from '@/app/api/uploads/presigned-url/route';
import { createMockRequest } from '../../utils/mock-request';
import * as rateLimit from '@/lib/rate-limit';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));
jest.mock('@/lib/rate-limit', () => ({
  rateLimiters: {
    fileUpload: { check: jest.fn().mockResolvedValue({ success: true }) },
    fileUploadAnon: { check: jest.fn().mockResolvedValue({ success: true }) },
  },
  getClientIdentifier: jest.fn().mockReturnValue('test-ip'),
}));
// Tiered AI Insights wire-up: route now calls getUserTier server-side and
// forwards the resolved tier to the Lambda. Default mock to 'free'.
jest.mock('@/lib/auth-db', () => ({
  getUserTier: jest.fn().mockResolvedValue('free'),
}));

import { getUserTier } from '@/lib/auth-db';
const mockGetUserTier = getUserTier as jest.MockedFunction<typeof getUserTier>;

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockRateLimit = rateLimit as jest.Mocked<typeof rateLimit>;

describe('POST /api/uploads/presigned-url', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockRateLimit.rateLimiters.fileUpload.check as jest.Mock).mockResolvedValue({ success: true });
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 't@x.com' },
      expires: '2025-12-31',
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        uploadUrl: 'https://s3.example.com/upload',
        jobId: 'job-123',
        key: 'uploads/job-123/data.csv',
        expiresIn: 3600,
      }),
    });
  });

  afterEach(() => { global.fetch = originalFetch; });

  it('returns presignedPost, uploadId, jobId, maxSize, s3Key for valid CSV', async () => {
    const res = await POST(createMockRequest({ filename: 'data.csv', fileSize: 1024 }) as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.presignedPost).toEqual({ url: 'https://s3.example.com/upload', fields: {} });
    expect(data.uploadId).toBe('uploads/job-123/data.csv');
    expect(data.jobId).toBe('job-123');
    expect(data.maxSize).toBe(1024);
    expect(data.s3Key).toBe('uploads/job-123/data.csv');
  });

  it('calls Lambda with filename, contentType text/csv, userId, userTier', async () => {
    await POST(createMockRequest({ filename: 'x.csv', fileSize: 100 }) as any);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/presigned-url$/),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ filename: 'x.csv', contentType: 'text/csv', userId: 'user-1', userTier: 'free' }),
      })
    );
  });

  it('forwards real user tier (pro) when subscription is upgraded', async () => {
    mockGetUserTier.mockResolvedValueOnce('pro');
    await POST(createMockRequest({ filename: 'x.csv', fileSize: 100 }) as any);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/presigned-url$/),
      expect.objectContaining({
        body: expect.stringContaining('"userTier":"pro"'),
      })
    );
  });

  it('validates filename: rejects missing', async () => {
    const res = await POST(createMockRequest({ fileSize: 1 }) as any);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/filename|Missing|invalid/i);
  });

  it('validates file size: rejects missing', async () => {
    const res = await POST(createMockRequest({ filename: 'a.csv' }) as any);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/file size|invalid/i);
  });

  it('validates file size: rejects non-number', async () => {
    const res = await POST(createMockRequest({ filename: 'a.csv', fileSize: '1' }) as any);
    expect(res.status).toBe(400);
  });

  it('validates file size: rejects <= 0', async () => {
    const res = await POST(createMockRequest({ filename: 'a.csv', fileSize: 0 }) as any);
    expect(res.status).toBe(400);
  });

  it('allows anonymous access (no session)', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(createMockRequest({ filename: 'a.csv', fileSize: 1 }) as any);
    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalled();
  });

  it('returns 429 when rate limit exceeded', async () => {
    (mockRateLimit.rateLimiters.fileUpload.check as jest.Mock).mockResolvedValue({ success: false });
    const res = await POST(createMockRequest({ filename: 'a.csv', fileSize: 1 }) as any);
    expect(res.status).toBe(429);
    expect((await res.json()).error).toMatch(/Upload limit|try again/i);
  });

  it('rejects non-CSV extension', async () => {
    const res = await POST(createMockRequest({ filename: 'x.pdf', fileSize: 1 }) as any);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Only CSV|CSV/i);
  });

  it('handles Lambda non-2xx', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'S3 error' }),
    });
    const res = await POST(createMockRequest({ filename: 'a.csv', fileSize: 1 }) as any);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('S3 error');
  });

  it('returns 500 on fetch throw', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    const res = await POST(createMockRequest({ filename: 'a.csv', fileSize: 1 }) as any);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Internal server error');
  });
});
