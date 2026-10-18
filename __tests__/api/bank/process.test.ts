/**
 * Tests for POST /api/bank/process route
 */

import { getServerSession } from 'next-auth';
import { createHash } from 'crypto';
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
const { query, queryOne } = jest.requireMock('@/lib/db') as { query: jest.Mock; queryOne: jest.Mock };

const JOB_ID = '3f1c2a9e-8b7d-4c6e-9f0a-1b2c3d4e5f60';
const RECORDED_KEY = `bank/${JOB_ID}/statement.pdf`;
const ANON_HASH = createHash('sha256').update('test-ip').digest('hex');

const userUpload = (userId = 'user-1') => ({ user_id: userId, anon_id_hash: null, s3_key: RECORDED_KEY });
const anonUpload = (hash = ANON_HASH) => ({ user_id: null, anon_id_hash: hash, s3_key: RECORDED_KEY });

const lambdaBody = () => JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);

describe('POST /api/bank/process', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
      expires: '2025-12-31',
    });
    queryOne.mockResolvedValue(userUpload());
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ success: true, jobId: JOB_ID, status: 'completed' }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Successful requests', () => {
    it('stores the bank config version the Lambda reports (migration 015)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true, jobId: JOB_ID, detectedBank: 'Chase', transactionCount: 12,
          resultKey: `bank/${JOB_ID}/output_csv.csv`, configVersion: '1.0.0',
        }),
      });

      await POST(createMockRequest({ jobId: JOB_ID }) as any);

      const update = query.mock.calls.find(([sql]: [string]) => /SET status = 'completed'/.test(sql));
      expect(update).toBeDefined();
      expect(update![0]).toMatch(/config_version = \$4/);
      expect(update![1]).toEqual(['Chase', 12, `bank/${JOB_ID}/output_csv.csv`, '1.0.0', JOB_ID, 'user-1']);
    });

    it('returns Lambda response when processing succeeds', async () => {
      const lambdaData = { success: true, jobId: JOB_ID, status: 'completed' };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(lambdaData),
      });

      const response = await POST(createMockRequest({ jobId: JOB_ID }) as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(lambdaData);
    });

    it('calls Lambda with jobId, the recorded s3Key, the owner and outputFormat', async () => {
      await POST(createMockRequest({ jobId: JOB_ID, outputFormat: 'xero' }) as any);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/bank/process'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId: JOB_ID,
            s3Key: RECORDED_KEY,
            userId: 'user-1',
            outputFormat: 'xero',
          }),
        })
      );
    });

    it('defaults outputFormat to qbo when omitted', async () => {
      await POST(createMockRequest({ jobId: JOB_ID }) as any);

      expect(lambdaBody().outputFormat).toBe('qbo');
    });

    it('accepts outputFormat excel', async () => {
      await POST(createMockRequest({ jobId: JOB_ID, outputFormat: 'excel' }) as any);

      expect(lambdaBody().outputFormat).toBe('excel');
    });
  });

  describe('Job ownership (issue #2)', () => {
    it("rejects another user's jobId without calling the Lambda or touching bank_jobs", async () => {
      queryOne.mockResolvedValue(userUpload('user-2'));

      const response = await POST(createMockRequest({ jobId: JOB_ID }) as any);

      expect(response.status).toBe(403);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(query).not.toHaveBeenCalled();
    });

    it('rejects a jobId with no presign record', async () => {
      queryOne.mockResolvedValue(null);

      const response = await POST(createMockRequest({ jobId: JOB_ID }) as any);

      expect(response.status).toBe(403);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('looks the record up by jobId', async () => {
      await POST(createMockRequest({ jobId: JOB_ID }) as any);

      expect(queryOne).toHaveBeenCalledWith(expect.stringContaining('FROM bank_job_uploads WHERE job_id = $1'), [JOB_ID]);
    });

    it('ignores a caller-supplied s3Key and sends the recorded one', async () => {
      await POST(createMockRequest({ jobId: JOB_ID, s3Key: 'bank/victim-job/their-statement.pdf' }) as any);

      expect(lambdaBody().s3Key).toBe(RECORDED_KEY);
      expect((global.fetch as jest.Mock).mock.calls[0][1].body).not.toContain('victim-job');
    });

    it('rejects a logged-in caller for a job an anonymous visitor presigned', async () => {
      queryOne.mockResolvedValue(anonUpload());

      const response = await POST(createMockRequest({ jobId: JOB_ID }) as any);

      expect(response.status).toBe(403);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('scopes every bank_jobs UPDATE by user_id', async () => {
      await POST(createMockRequest({ jobId: JOB_ID }) as any);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false, status: 400, json: () => Promise.resolve({ error: 'No transactions found in PDF' }),
      });
      await POST(createMockRequest({ jobId: JOB_ID }) as any);

      const updates = query.mock.calls.filter(([sql]: [string]) => /UPDATE bank_jobs/.test(sql));
      expect(updates).toHaveLength(2);
      for (const [sql, params] of updates) {
        expect(sql).toMatch(/WHERE id = \$\d+ AND user_id = \$\d+/);
        expect(params).toContain('user-1');
      }
    });

    it('returns 500 and does not process when the record lookup fails', async () => {
      queryOne.mockRejectedValue(new Error('connection refused'));

      const response = await POST(createMockRequest({ jobId: JOB_ID }) as any);

      expect(response.status).toBe(500);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Anonymous access', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(null);
      queryOne.mockResolvedValue(anonUpload());
    });

    it('allows the anonymous visitor who presigned the job', async () => {
      const response = await POST(createMockRequest({ jobId: JOB_ID }) as any);

      expect(response.status).toBe(200);
      expect(lambdaBody().userId).toBe('anon-test-ip');
      expect(query).not.toHaveBeenCalled();
    });

    it('treats a session without user id as anonymous', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'x@x.com' },
        expires: '2025-12-31',
      } as any);

      const response = await POST(createMockRequest({ jobId: JOB_ID }) as any);

      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('rejects an anonymous visitor with a different identity', async () => {
      queryOne.mockResolvedValue(anonUpload('0'.repeat(64)));

      const response = await POST(createMockRequest({ jobId: JOB_ID }) as any);

      expect(response.status).toBe(403);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("rejects an anonymous visitor for a logged-in user's job", async () => {
      queryOne.mockResolvedValue(userUpload());

      const response = await POST(createMockRequest({ jobId: JOB_ID }) as any);

      expect(response.status).toBe(403);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Request body validation', () => {
    it('returns 400 when jobId is missing', async () => {
      const response = await POST(createMockRequest({ s3Key: 'k.pdf' }) as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing jobId');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns 400 when jobId is not a UUID', async () => {
      const response = await POST(createMockRequest({ jobId: '../uploads/x' }) as any);

      expect(response.status).toBe(400);
      expect(queryOne).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns 400 when outputFormat is invalid', async () => {
      const response = await POST(createMockRequest({ jobId: JOB_ID, outputFormat: 'invalid' }) as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid output format');
      expect(data.error).toContain('qbo, xero, excel');
      expect(global.fetch).not.toHaveBeenCalled();
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

      const response = await POST(createMockRequest({ jobId: JOB_ID }) as any);
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

      const response = await POST(createMockRequest({ jobId: JOB_ID }) as any);
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

      const response = await POST(createMockRequest({ jobId: JOB_ID }) as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('returns 500 when request.json() throws', async () => {
      const request = {
        ...createMockRequest({ jobId: JOB_ID }),
        json: () => Promise.reject(new Error('Parse error')),
      };

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
