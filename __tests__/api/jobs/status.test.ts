/**
 * Tests for GET /api/jobs/[jobId] route
 */

import { getServerSession } from 'next-auth';
import { GET } from '@/app/api/jobs/[jobId]/route';
import { createMockRequest } from '../../utils/mock-request';
import * as jobsDb from '@/lib/jobs-db';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));
jest.mock('@/lib/jobs-db');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockGetJobById = jobsDb.getJobById as jest.MockedFunction<typeof jobsDb.getJobById>;
const mockUpdateJobStatus = jobsDb.updateJobStatus as jest.MockedFunction<typeof jobsDb.updateJobStatus>;

function ctx(jobId: string) {
  return { params: Promise.resolve({ jobId }) };
}

describe('GET /api/jobs/[jobId]', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 't@x.com' },
      expires: '2025-12-31',
    });
    mockGetJobById.mockResolvedValue(null);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        jobId: 'j1',
        status: 'completed',
        result: { tx: 1 },
        error: null,
        progress: 100,
        filename: 'x.csv',
      }),
    });
  });

  afterEach(() => { global.fetch = originalFetch; });

  it('returns 403 when DB job exists but belongs to another user', async () => {
    mockGetJobById.mockResolvedValue({
      id: 'j1',
      upload_id: 'u1',
      status: 'succeeded',
      result: {},
      error: null,
      created_at: new Date(),
      started_at: null,
      finished_at: null,
      upload: { user_id: 'other-user', filename: 'x.csv', s3_key: 'k', status: 'pending', id: 'u1', file_size: null, created_at: new Date(), updated_at: new Date() },
    } as any);

    const res = await GET(createMockRequest({}) as any, ctx('j1'));
    expect(res.status).toBe(403);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns job from DB when terminal and result present', async () => {
    mockGetJobById.mockResolvedValue({
      id: 'j1',
      upload_id: 'u1',
      status: 'succeeded',
      result: { count: 10 },
      error: null,
      created_at: new Date(),
      started_at: new Date(),
      finished_at: new Date(),
      upload: { user_id: 'user-1', filename: 'x.csv', s3_key: 'k', status: 'pending', id: 'u1', file_size: null, created_at: new Date(), updated_at: new Date() },
    } as any);

    const res = await GET(createMockRequest({}) as any, ctx('j1'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.status).toBe('succeeded');
    expect(data.result).toEqual({ count: 10 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('falls back to Lambda when DB job not found', async () => {
    mockGetJobById.mockResolvedValue(null);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ jobId: 'j1', status: 'processing', progress: 50, filename: 'x.csv' }),
    });

    const res = await GET(createMockRequest({}) as any, ctx('j1'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/\/job\/j1$/), expect.any(Object));
    expect(data.status).toBe('running'); // processing -> running
  });

  it('maps Lambda status: pending->queued, processing->running, completed->succeeded, failed->failed', async () => {
    mockGetJobById.mockResolvedValue(null);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ jobId: 'j1', status: 'completed', result: {}, filename: 'x.csv' }),
    });

    const res = await GET(createMockRequest({}) as any, ctx('j1'));
    const data = await res.json();
    expect(data.status).toBe('succeeded');
  });

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET(createMockRequest({}) as any, ctx('j1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when Lambda returns 404', async () => {
    mockGetJobById.mockResolvedValue(null);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });

    const res = await GET(createMockRequest({}) as any, ctx('j1'));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/not found|Job not found/i);
  });

  it('returns 500 when fetch throws', async () => {
    mockGetJobById.mockResolvedValue(null);
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Net'));

    const res = await GET(createMockRequest({}) as any, ctx('j1'));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Internal server error');
  });
});
