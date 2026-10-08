/**
 * Retention policy guard: /api/cron/prune deletes rows older than 30 days
 * from every table the Lambdas and webhooks write to, and refuses
 * unauthenticated calls.
 */

jest.mock('@/lib/db', () => ({ queryOne: jest.fn() }));

import { queryOne } from '@/lib/db';
import { GET, RETENTION_DAYS } from '@/app/api/cron/prune/route';
import { createMockRequest } from '../utils/mock-request';

const mockedQueryOne = queryOne as jest.MockedFunction<typeof queryOne>;

function cronRequest(auth?: string) {
  return createMockRequest({}, {
    url: 'http://localhost/api/cron/prune',
    headers: auth ? { authorization: auth } : {},
  }) as unknown as Request;
}

describe('GET /api/cron/prune', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV, CRON_SECRET: 'test-secret' };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('is pinned to the 30-day policy', () => {
    expect(RETENTION_DAYS).toBe(30);
  });

  it('rejects calls without the cron secret', async () => {
    const res = await GET(cronRequest());
    expect(res.status).toBe(401);
    expect(mockedQueryOne).not.toHaveBeenCalled();
  });

  it('rejects calls with the wrong secret', async () => {
    const res = await GET(cronRequest('Bearer nope'));
    expect(res.status).toBe(401);
    expect(mockedQueryOne).not.toHaveBeenCalled();
  });

  it('refuses to run when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(cronRequest('Bearer anything'));
    expect(res.status).toBe(401);
    expect(mockedQueryOne).not.toHaveBeenCalled();
  });

  it('deletes rows older than 30 days from every retained table', async () => {
    mockedQueryOne.mockResolvedValue({ n: 2 } as never);
    const res = await GET(cronRequest('Bearer test-secret'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.retention_days).toBe(30);
    expect(body.deleted).toEqual({
      transactions: 2,
      api_requests: 2,
      processed_webhook_events: 2,
    });

    const sql = mockedQueryOne.mock.calls.map(([q]) => String(q));
    expect(sql).toHaveLength(3);
    expect(sql[0]).toMatch(/DELETE FROM transactions WHERE created_at < now\(\) - interval '30 days'/);
    expect(sql[1]).toMatch(/DELETE FROM api_requests WHERE created_at < now\(\) - interval '30 days'/);
    expect(sql[2]).toMatch(/DELETE FROM processed_webhook_events WHERE processed_at < now\(\) - interval '30 days'/);
  });
});
