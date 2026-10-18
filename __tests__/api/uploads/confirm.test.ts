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
const mockGetPendingUpload = uploadsDb.getPendingUpload as jest.MockedFunction<typeof uploadsDb.getPendingUpload>;
const mockDeletePendingUpload = uploadsDb.deletePendingUpload as jest.MockedFunction<typeof uploadsDb.deletePendingUpload>;

// Presign recorded this key for user-1 with Lambda job id `jobId`.
function pendingFor(s3Key: string, userId = 'user-1', jobId = 'j1') {
  return {
    s3_key: s3Key,
    user_id: userId,
    job_id: jobId,
    filename: 'x.csv',
    created_at: new Date(),
    expires_at: new Date(Date.now() + 3600_000),
  };
}

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
    mockGetPendingUpload.mockImplementation(async (s3Key: string) => pendingFor(s3Key));
    mockDeletePendingUpload.mockResolvedValue(undefined);
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

  it('calls Lambda /confirm-upload with the jobId and key from the pending record', async () => {
    mockGetPendingUpload.mockResolvedValue(pendingFor('uploads/job-99/file.csv', 'user-1', 'job-99'));
    await POST(createMockRequest({}) as any, ctx('uploads/job-99/file.csv'));
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/confirm-upload$/),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ jobId: 'job-99', key: 'uploads/job-99/file.csv' }),
      })
    );
  });

  it('takes jobId from the pending record, not from the URL path', async () => {
    mockGetPendingUpload.mockResolvedValue(pendingFor('uploads/abc-123/file.csv', 'user-1', 'issued-job'));
    await POST(createMockRequest({}) as any, ctx('uploads/abc-123/file.csv'));
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ jobId: 'issued-job', key: 'uploads/abc-123/file.csv' }),
      })
    );
  });

  // Issue #15: the URL's uploadId is only a lookup key. A key presign did
  // not issue to the caller must not reach Lambda or the DB.
  describe('issued-key check', () => {
    it('looks up the pending record by the exact URL key', async () => {
      await POST(createMockRequest({}) as any, ctx('uploads/j1/x.csv'));
      expect(mockGetPendingUpload).toHaveBeenCalledWith('uploads/j1/x.csv');
    });

    it('returns 403 for a key issued to another user', async () => {
      mockGetPendingUpload.mockResolvedValue(pendingFor('uploads/victim-job/x.csv', 'other-user', 'victim-job'));
      const res = await POST(createMockRequest({}) as any, ctx('uploads/victim-job/x.csv'));
      expect(res.status).toBe(403);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockCreateUpload).not.toHaveBeenCalled();
      expect(mockQueryOne).not.toHaveBeenCalled();
    });

    it('returns 403 for a key that was never issued (or has expired)', async () => {
      mockGetPendingUpload.mockResolvedValue(null);
      const res = await POST(createMockRequest({}) as any, ctx('uploads/guessed/x.csv'));
      expect(res.status).toBe(403);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockCreateUpload).not.toHaveBeenCalled();
    });

    it('returns 500 and does not call Lambda when the pending lookup throws', async () => {
      mockGetPendingUpload.mockRejectedValue(new Error('Neon down'));
      const res = await POST(createMockRequest({}) as any, ctx('uploads/j1/x.csv'));
      expect(res.status).toBe(500);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('deletes the pending record after persisting', async () => {
      const res = await POST(createMockRequest({}) as any, ctx('uploads/j1/x.csv'));
      expect(res.status).toBe(200);
      expect(mockDeletePendingUpload).toHaveBeenCalledWith('uploads/j1/x.csv');
    });

    it('still returns 200 when deleting the pending record fails', async () => {
      mockDeletePendingUpload.mockRejectedValue(new Error('DB error'));
      const res = await POST(createMockRequest({}) as any, ctx('uploads/j1/x.csv'));
      expect(res.status).toBe(200);
    });
  });

  describe('filename resolution', () => {
    it('prefers the client-supplied filename over the S3 key path', async () => {
      const req = createMockRequest({ etag: 'abc', filename: 'Smith LLC - Jan 2026.csv' });
      await POST(req as any, ctx('uploads/j1/sanitized_name.csv'));
      expect(mockCreateUpload).toHaveBeenCalledWith(
        'user-1',
        'Smith LLC - Jan 2026.csv',
        'uploads/j1/sanitized_name.csv',
      );
    });

    it('falls back to S3 key parse when client omits filename', async () => {
      const req = createMockRequest({ etag: 'abc' });
      await POST(req as any, ctx('uploads/j1/legacy.csv'));
      expect(mockCreateUpload).toHaveBeenCalledWith(
        'user-1',
        'legacy.csv',
        'uploads/j1/legacy.csv',
      );
    });

    it('falls back to "Unknown file" when neither source has a usable name', async () => {
      const req = createMockRequest({ etag: 'abc', filename: '   ' });
      await POST(req as any, ctx('uploads/j1'));
      expect(mockCreateUpload).toHaveBeenCalledWith(
        'user-1',
        'Unknown file',
        'uploads/j1',
      );
    });

    it('rejects non-string filename values defensively', async () => {
      const req = createMockRequest({ etag: 'abc', filename: { evil: true } });
      await POST(req as any, ctx('uploads/j1/legit.csv'));
      // falls back to the S3-key parse since the body filename was wrong type
      expect(mockCreateUpload).toHaveBeenCalledWith(
        'user-1',
        'legit.csv',
        'uploads/j1/legit.csv',
      );
    });
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

  // The job routes now require the DB row (issue #14), so an unpersisted
  // job would be invisible to its owner. Fail, and keep the pending record.
  it('returns 500 and keeps the pending record when DB persist fails', async () => {
    mockCreateUpload.mockRejectedValue(new Error('DB error'));
    const res = await POST(createMockRequest({}) as any, ctx('uploads/j1/f.csv'));
    expect(res.status).toBe(500);
    expect(mockDeletePendingUpload).not.toHaveBeenCalled();
  });

  it('returns 500 when request throws', async () => {
    const req = { ...createMockRequest({}), json: () => Promise.reject(new Error('Parse')) };
    const res = await POST(req as any, ctx('uploads/j1/f.csv'));
    expect(res.status).toBe(500);
  });
});
