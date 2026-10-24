import { isTimedOut, STALE_AFTER_MS } from '@/lib/job-staleness';

const NOW = Date.parse('2026-10-24T12:00:00Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe('isTimedOut', () => {
  it('flags a queued or processing job older than the cutoff', () => {
    expect(isTimedOut({ status: 'queued', createdAt: ago(STALE_AFTER_MS + 1) }, NOW)).toBe(true);
    expect(isTimedOut({ status: 'processing', createdAt: ago(STALE_AFTER_MS + 1) }, NOW)).toBe(true);
  });

  it('leaves a job within the cutoff alone', () => {
    expect(isTimedOut({ status: 'queued', createdAt: ago(60_000) }, NOW)).toBe(false);
  });

  it('never flags a finished job, however old', () => {
    for (const status of ['completed', 'failed', 'canceled']) {
      expect(isTimedOut({ status, createdAt: ago(10 * STALE_AFTER_MS) }, NOW)).toBe(false);
    }
  });

  it('ignores an unparseable date', () => {
    expect(isTimedOut({ status: 'queued', createdAt: 'not a date' }, NOW)).toBe(false);
  });
});
