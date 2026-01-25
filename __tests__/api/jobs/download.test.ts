/**
 * Tests for GET /api/jobs/[jobId]/download route
 */

import { getServerSession } from 'next-auth';
import { GET } from '@/app/api/jobs/[jobId]/download/route';
import { createMockRequest } from '../../utils/mock-request';
import * as db from '@/lib/db';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));
jest.mock('@/lib/db');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockQueryOne = db.queryOne as jest.MockedFunction<typeof db.queryOne>;
const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

function ctx(jobId: string) {
  return { params: Promise.resolve({ jobId }) };
}

describe('GET /api/jobs/[jobId]/download', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 't@x.com' },
      expires: '2025-12-31',
    });
    mockQueryOne.mockResolvedValue({ tier: 'free' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ downloadUrl: 'https://s3.example.com/presigned' }),
    });
  });

  afterEach(() => { global.fetch = originalFetch; });

  it('returns Lambda download payload for valid format', async () => {
    const req = createMockRequest({}, { url: 'http://localhost/api/jobs/j1/download?format=koinly' });
    const res = await GET(req as any, ctx('j1'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.downloadUrl).toBeDefined();
    expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/\/download\/j1\?format=koinly/), expect.any(Object));
  });

  it('validates format: koinly, turbotax, coinledger, zenledger', async () => {
    for (const fmt of ['koinly', 'turbotax', 'coinledger', 'zenledger']) {
      (global.fetch as jest.Mock).mockClear();
      const req = createMockRequest({}, { url: `http://localhost?format=${fmt}` });
      const res = await GET(req as any, ctx('j1'));
      expect(res.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining(`format=${fmt}`), expect.any(Object));
    }
  });

  it('returns 400 for invalid format', async () => {
    const req = createMockRequest({}, { url: 'http://localhost?format=invalid' });
    const res = await GET(req as any, ctx('j1'));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid format|Valid formats/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('defaults format to koinly when not provided', async () => {
    const req = createMockRequest({});
    await GET(req as any, ctx('j1'));
    expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/format=koinly/), expect.any(Object));
  });

  it('requires authentication', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET(createMockRequest({}) as any, ctx('j1'));
    expect(res.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('propagates Lambda error and status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Job not found' }),
    });
    const res = await GET(createMockRequest({}) as any, ctx('j1'));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/Job not found|Failed/i);
  });

  it('returns 500 when fetch throws', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Net'));
    const res = await GET(createMockRequest({}) as any, ctx('j1'));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Internal server error');
  });
});
