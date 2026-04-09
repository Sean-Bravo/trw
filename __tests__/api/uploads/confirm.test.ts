/**
 * Tests for POST /api/uploads/[uploadId]/confirm route
 */

import { getServerSession } from 'next-auth';
import { POST } from '@/app/api/uploads/[uploadId]/confirm/route';
import { createMockRequest } from '../../utils/mock-request';
import * as uploadsDb from '@/lib/uploads-db';
import * as db from '@/lib/db';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));
jest.mock('@/lib/uploads-db');
jest.mock('@/lib/db');
jest.mock('@/lib/rate-limit', () => ({
  getClientIdentifier: jest.fn().mockReturnValue('test-ip'),
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockCreateUpload = uploadsDb.createUpload as jest.MockedFunction<typeof uploadsDb.createUpload>;
const mockQueryOne = db.queryOne as jest.MockedFunction<typeof db.queryOne>;

function ctx(uploadId: string) {
  return { params: Promise.resolve({ uploadId }) };
}

describe('POST /api/uploads/[uploadId]/confirm', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 't@x.com' },
      expires: '2025-12-31',
    });
    mockCreateUpload.mockResolvedValue({ id: 'up-1', user_id: 'user-1', filename: 'x.csv', s3_key: 'uploads/j1/x.csv', status: 'pending', file_size: null, created_at: new Date(), updated_at: new Date() } as any);
    mockQueryOne.mockResolvedValue({ id: 'j1', upload_id: 'up-1', status: 'queued' } as any);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ jobId: 'j1', uploadId: 'uploads/j1/x.csv', status: 'queued' }),
    });
  });

  afterEach(() => { global.fetch = originalFetch; });

  it('returns jobId, uploadId, status when Lambda and DB succeed', async () => {
    const req = createMockRequest({ etag: 'abc' });
    const res = await POST(req as any, ctx('uploads/j1/x.csv'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.jobId).toBeDefined();
    expect(data.status).toMatch(/queued|completed/);
  });

  it('calls Lambda /confirm-upload with jobId and key', async () => {
    await POST(createMockRequest({}) as any, ctx('uploads/job-99/file.csv'));
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/confirm-upload$/),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ jobId: 'job-99', key: 'uploads/job-99/file.csv' }),
      })
    );
  });

  it('extracts jobId from s3Key when path has multiple segments', async () => {
    await POST(createMockRequest({}) as any, ctx('uploads/abc-123/sub/file.csv'));
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ jobId: 'abc-123', key: 'uploads/abc-123/sub/file.csv' }),
      })
    );
  });

  it('M-12: rejects anonymous access (no session) with 401', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(createMockRequest({}) as any, ctx('uploads/j1/f.csv'));
    expect(res.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('propagates Lambda 429 with Retry-After', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: 'Rate limit' }),
    });
    const res = await POST(createMockRequest({}) as any, ctx('uploads/j1/f.csv'));
    expect(res.status).toBe(429);
    expect(res.headers?.get?.('Retry-After') || (res.headers as any)?.get?.('retry-after')).toBeDefined();
  });

  it('returns 500 on Lambda 5xx', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Lambda error' }),
    });
    const res = await POST(createMockRequest({}) as any, ctx('uploads/j1/f.csv'));
    expect(res.status).toBe(500);
  });

  it('still returns 200 when DB persist fails (logs, does not fail request)', async () => {
    mockCreateUpload.mockRejectedValue(new Error('DB error'));
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ jobId: 'j1', uploadId: 'u1', status: 'queued' }),
    });
    const res = await POST(createMockRequest({}) as any, ctx('uploads/j1/f.csv'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.jobId).toBe('j1');
  });

  it('returns 500 when request throws', async () => {
    const req = { ...createMockRequest({}), json: () => Promise.reject(new Error('Parse')) };
    const res = await POST(req as any, ctx('uploads/j1/f.csv'));
    expect(res.status).toBe(500);
  });
});
