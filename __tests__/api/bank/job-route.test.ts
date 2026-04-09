/**
 * Tests for GET /api/bank/job/[jobId] route
 */

import { getServerSession } from 'next-auth';
import { GET } from '@/app/api/bank/job/[jobId]/route';
import { createMockRequest } from '../../utils/mock-request';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}));

jest.mock('@/lib/db', () => ({
  queryOne: jest.fn(),
}));

import { queryOne } from '@/lib/db';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockQueryOne = queryOne as jest.Mock;

function createContext(jobId: string) {
  return { params: Promise.resolve({ jobId }) };
}

describe('GET /api/bank/job/[jobId]', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
      expires: '2025-12-31',
    });
    // default: job belongs to the authenticated user
    mockQueryOne.mockResolvedValue({ user_id: 'user-1' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ jobId: 'job-123', status: 'completed', result: {} }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Successful requests', () => {
    it('returns Lambda response when job exists', async () => {
      const lambdaData = { jobId: 'job-123', status: 'completed', result: { rows: 10 } };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(lambdaData),
      });

      const request = createMockRequest({});
      const response = await GET(request as any, createContext('job-123'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(lambdaData);
    });

    it('calls Lambda GET /bank/job/:jobId', async () => {
      const request = createMockRequest({});

      await GET(request as any, createContext('job-456'));

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/bank\/job\/job-456$/),
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  describe('Authentication', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = createMockRequest({});
      const response = await GET(request as any, createContext('job-123'));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns 401 when session has no user id', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'x@x.com' },
        expires: '2025-12-31',
      } as any);

      const request = createMockRequest({});
      const response = await GET(request as any, createContext('job-123'));

      expect(response.status).toBe(401);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('H-3: ownership', () => {
    it('returns 403 when job belongs to a different user', async () => {
      mockQueryOne.mockResolvedValue({ user_id: 'someone-else' });
      const request = createMockRequest({});
      const response = await GET(request as any, createContext('victim-job'));

      expect(response.status).toBe(403);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns 403 when job does not exist', async () => {
      mockQueryOne.mockResolvedValue(null);
      const request = createMockRequest({});
      const response = await GET(request as any, createContext('no-such-job'));

      expect(response.status).toBe(403);
      expect(global.fetch).not.toHaveBeenCalled();
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

    it('returns 500 when params rejects', async () => {
      const request = createMockRequest({});
      const response = await GET(request as any, {
        params: Promise.reject(new Error('params error')),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
