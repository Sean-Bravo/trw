/**
 * Automatic sign-out after inactivity (docs/AUTO_LOGOUT_PLAN.md).
 *
 * The server enforces it: the session token records the last real user
 * activity, and once a session has been idle past the user's limit the
 * NextAuth session callback returns it without a user, which every page and
 * API route already treats as signed out. The browser (IdleTimeout) only
 * warns and signs out on time; it can be closed or asleep.
 */

/** Allowed limits in minutes. 0 = never (the 7-day session limit still applies). */
export const IDLE_TIMEOUT_OPTIONS = [15, 30, 60, 240, 0] as const;
export type IdleTimeoutMinutes = (typeof IDLE_TIMEOUT_OPTIONS)[number];

/** NIST SP 800-63B AAL2 inactivity limit. */
export const DEFAULT_IDLE_TIMEOUT_MINUTES: IdleTimeoutMinutes = 30;

/** The warning shows this long before sign-out (WCAG 2.2.1 asks for at least 20 s). */
export const IDLE_WARNING_MS = 2 * 60 * 1000;

/** The browser refreshes the server's last-activity stamp at most this often. */
export const ACTIVITY_PING_INTERVAL_MS = 60 * 1000;

/** Turning the limit off needs a sign-in no older than this. */
export const RECENT_AUTH_MS = 5 * 60 * 1000;

export function isIdleTimeoutOption(value: unknown): value is IdleTimeoutMinutes {
  return typeof value === 'number' && (IDLE_TIMEOUT_OPTIONS as readonly number[]).includes(value);
}

export function idleTimeoutLabel(minutes: IdleTimeoutMinutes): string {
  if (minutes === 0) return 'Never';
  if (minutes < 60) return `${minutes} minutes`;
  return minutes === 60 ? '1 hour' : `${minutes / 60} hours`;
}

/**
 * True when a session has been idle past its limit. A missing stamp counts as
 * fresh: tokens issued before this feature carry none, and treating them as
 * expired would sign everyone out on deploy.
 */
export function isIdleExpired(
  lastActivity: number | undefined,
  idleTimeoutMin: number | undefined,
  now: number = Date.now()
): boolean {
  if (typeof lastActivity !== 'number') return false;
  const limit = idleTimeoutMin ?? DEFAULT_IDLE_TIMEOUT_MINUTES;
  if (limit <= 0) return false;
  return now - lastActivity > limit * 60 * 1000;
}

export function isRecentAuth(authTime: number | undefined, now: number = Date.now()): boolean {
  return typeof authTime === 'number' && now - authTime <= RECENT_AUTH_MS;
}
