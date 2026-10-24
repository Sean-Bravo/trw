/**
 * Tests for POST /api/jobs/[jobId]/retry — which jobs may be retried.
 * A job stuck queued/running past the dashboard's "Timed out" cutoff can be
 * retried like a failed one; a job still within the cutoff cannot.
 */

import { getServerSession } from 'next-auth';
import { POST } from '@/app/api/jobs/[jobId]/retry/route';
import { createMockRequest } from '../../utils/mock-request';
import { getJobById } from '@/lib/jobs-db';
import { execute } from '@/lib/db';
import { STALE_AFTER_MS } from '@/lib/job-staleness';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));
jest.mock('@/lib/db', () => ({ queryOne: jest.fn(), execute: jest.fn() }));
jest.mock('@/lib/jobs-db', () => ({ getJobById: jest.fn() }));

const mockSession = getServerSession as jest.Mock;
const mockGetJobById = getJobById as jest.Mock;
const mockExecute = execute as jest.Mock;

function ctx(jobId: string) {
  return { params: Promise.resolve({ jobId }) };
}

function job(status: string, ageMs: number) {
  return {
    id: 'j1',
    upload_id: 'u1',
    status,
    result: null,
    error: null,
    created_at: new Date(Date.now() - ageMs),
    started_at: null,
    finished_at: null,
    retry_count: 0,
    last_retry_at: null,
    upload: { user_id: 'user-1', filename: 'x.csv', s3_key: 'uploads/j1/x.csv', status: 'pending', id: 'u1', file_size: null, created_at: new Date(), updated_at: new Date() },
  };
}

describe('POST /api/jobs/[jobId]/retry', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { id: 'user-1' }, expires: '2099-01-01' });
    mockExecute.mockResolvedValue({ rowCount: 1 });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) }) as jest.Mock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('retries a failed job', async () => {
    mockGetJobById.mockResolvedValue(job('failed', 60_000));
    const res = await POST(createMockRequest({}) as never, ctx('j1'));
    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries a job stuck queued past the timed-out cutoff', async () => {
    mockGetJobById.mockResolvedValue(job('queued', STALE_AFTER_MS + 60_000));
    const res = await POST(createMockRequest({}) as never, ctx('j1'));
    expect(res.status).toBe(200);
  });

  it('retries a job stuck running past the cutoff', async () => {
    mockGetJobById.mockResolvedValue(job('running', STALE_AFTER_MS + 60_000));
    const res = await POST(createMockRequest({}) as never, ctx('j1'));
    expect(res.status).toBe(200);
  });

  it('refuses a job that is still within the cutoff', async () => {
    mockGetJobById.mockResolvedValue(job('queued', 60_000));
    const res = await POST(createMockRequest({}) as never, ctx('j1'));
    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('refuses a succeeded job', async () => {
    mockGetJobById.mockResolvedValue(job('succeeded', STALE_AFTER_MS + 60_000));
    const res = await POST(createMockRequest({}) as never, ctx('j1'));
    expect(res.status).toBe(400);
  });
});
