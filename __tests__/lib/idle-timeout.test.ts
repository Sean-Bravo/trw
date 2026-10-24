import {
  DEFAULT_IDLE_TIMEOUT_MINUTES,
  IDLE_TIMEOUT_OPTIONS,
  idleTimeoutLabel,
  isIdleExpired,
  isIdleTimeoutOption,
  isRecentAuth,
  RECENT_AUTH_MS,
} from '@/lib/idle-timeout';

const NOW = Date.parse('2026-10-24T12:00:00Z');
const min = (m: number) => m * 60 * 1000;

describe('idle timeout rules', () => {
  it('defaults to 30 minutes and offers 15/30/60/240/never', () => {
    expect(DEFAULT_IDLE_TIMEOUT_MINUTES).toBe(30);
    expect([...IDLE_TIMEOUT_OPTIONS]).toEqual([15, 30, 60, 240, 0]);
  });

  it('expires only past the limit', () => {
    expect(isIdleExpired(NOW - min(29), 30, NOW)).toBe(false);
    expect(isIdleExpired(NOW - min(31), 30, NOW)).toBe(true);
    expect(isIdleExpired(NOW - min(16), 15, NOW)).toBe(true);
  });

  it('never expires when the limit is off', () => {
    expect(isIdleExpired(NOW - min(10_000), 0, NOW)).toBe(false);
  });

  it('treats a session with no activity stamp as fresh (no mass sign-out on deploy)', () => {
    expect(isIdleExpired(undefined, 15, NOW)).toBe(false);
  });

  it('uses the default when the limit is unknown', () => {
    expect(isIdleExpired(NOW - min(31), undefined, NOW)).toBe(true);
  });

  it('accepts only the allowed limits', () => {
    expect(isIdleTimeoutOption(30)).toBe(true);
    expect(isIdleTimeoutOption(0)).toBe(true);
    expect(isIdleTimeoutOption(45)).toBe(false);
    expect(isIdleTimeoutOption('30')).toBe(false);
  });

  it('labels the options', () => {
    expect(IDLE_TIMEOUT_OPTIONS.map(idleTimeoutLabel)).toEqual(['15 minutes', '30 minutes', '1 hour', '4 hours', 'Never']);
  });

  it('counts a sign-in as recent for 5 minutes', () => {
    expect(isRecentAuth(NOW - RECENT_AUTH_MS + 1000, NOW)).toBe(true);
    expect(isRecentAuth(NOW - RECENT_AUTH_MS - 1000, NOW)).toBe(false);
    expect(isRecentAuth(undefined, NOW)).toBe(false);
  });
});
