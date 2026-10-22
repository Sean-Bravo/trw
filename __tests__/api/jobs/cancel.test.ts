/**
 * Tests for POST /api/jobs/[jobId]/cancel
 */

import { getServerSession } from 'next-auth';
import { POST } from '@/app/api/jobs/[jobId]/cancel/route';
import { createMockRequest } from '../../utils/mock-request';
import * as jobsDb from '@/lib/jobs-db';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));
jest.mock('@/lib/jobs-db');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockGetJobById = jobsDb.getJobById as jest.MockedFunction<typeof jobsDb.getJobById>;
const mockCancelJob = jobsDb.cancelJob as jest.MockedFunction<typeof jobsDb.cancelJob>;

function ctx(jobId: string) {
  return { params: Promise.resolve({ jobId }) };
}

function dbJob(userId: string, status = 'running') {
  return {
    id: 'j1',
    upload_id: 'u1',
    status,
    result: null,
    error: null,
    created_at: new Date(),
    started_at: null,
    finished_at: null,
    upload: { user_id: userId, filename: 'x.csv', s3_key: 'k', status: 'pending', id: 'u1', file_size: null, created_at: new Date(), updated_at: new Date() },
  } as any;
}

describe('POST /api/jobs/[jobId]/cancel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 't@x.com' },
      expires: '2025-12-31',
    });
  });

  it('returns 401 when signed out', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(createMockRequest({}) as any, ctx('j1'));
    expect(res.status).toBe(401);
    expect(mockCancelJob).not.toHaveBeenCalled();
  });

  it('returns 403 for a job that does not exist', async () => {
    mockGetJobById.mockResolvedValue(null);
    const res = await POST(createMockRequest({}) as any, ctx('j1'));
    expect(res.status).toBe(403);
    expect(mockCancelJob).not.toHaveBeenCalled();
  });

  it('returns 403 for another user\'s job', async () => {
    mockGetJobById.mockResolvedValue(dbJob('other-user'));
    const res = await POST(createMockRequest({}) as any, ctx('j1'));
    expect(res.status).toBe(403);
    expect(mockCancelJob).not.toHaveBeenCalled();
  });

  it('cancels the owner\'s unfinished job', async () => {
    mockGetJobById.mockResolvedValue(dbJob('user-1'));
    mockCancelJob.mockResolvedValue(true);
    const res = await POST(createMockRequest({}) as any, ctx('j1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ jobId: 'j1', status: 'canceled' });
    expect(mockCancelJob).toHaveBeenCalledWith('j1');
  });

  it('returns 409 when the job already finished', async () => {
    mockGetJobById.mockResolvedValue(dbJob('user-1', 'succeeded'));
    mockCancelJob.mockResolvedValue(false);
    const res = await POST(createMockRequest({}) as any, ctx('j1'));
    expect(res.status).toBe(409);
  });
});
