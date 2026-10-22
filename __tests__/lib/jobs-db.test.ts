/**
 * Tests for lib/jobs-db.ts updateJobStatus. $2 is assigned to the job_status
 * enum and compared to literals; Postgres rejects that unless every use is
 * cast ("inconsistent types deduced for parameter $2"), which left every
 * finished crypto job "queued" in the history list from April to October 2026.
 */

import { updateJobStatus } from '@/lib/jobs-db';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  execute: jest.fn(),
}));

import { execute } from '@/lib/db';

const mockExecute = execute as jest.Mock;

describe('updateJobStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('casts every use of $2 to job_status', async () => {
    await updateJobStatus('job-1', 'succeeded', { record_count: 6 });

    const [sql] = mockExecute.mock.calls[0];
    const uses = sql.match(/\$2(::\w+)?/g);
    expect(uses.length).toBeGreaterThan(1);
    expect(uses.every((u: string) => u === '$2::job_status')).toBe(true);
  });

  it('casts the result and error params so a null keeps the stored value', async () => {
    await updateJobStatus('job-1', 'failed', undefined, 'boom');

    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain('COALESCE($3::jsonb, result)');
    expect(sql).toContain('COALESCE($4::text, error)');
    expect(params).toEqual(['job-1', 'failed', null, 'boom']);
  });
});
