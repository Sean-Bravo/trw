/**
 * Server-side enforcement of automatic sign-out in the NextAuth jwt/session
 * callbacks (docs/AUTO_LOGOUT_PLAN.md).
 */

jest.mock('next/headers', () => ({ cookies: jest.fn() }));
// The real providers pull in openid-client (ESM), which Jest can't load;
// these tests only exercise the callbacks.
jest.mock('next-auth', () => ({ __esModule: true, default: jest.fn(() => jest.fn()) }));
jest.mock('next-auth/providers/google', () => ({ __esModule: true, default: jest.fn(() => ({ id: 'google' })) }));
jest.mock('next-auth/providers/credentials', () => ({ __esModule: true, default: jest.fn(() => ({ id: 'credentials' })) }));
jest.mock('@/lib/auth-db', () => ({
  authorizeCredentials: jest.fn(),
  findOrCreateOAuthUser: jest.fn(),
  findUserByEmail: jest.fn(),
  getIdleTimeoutMinutes: jest.fn(),
}));

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getIdleTimeoutMinutes } from '@/lib/auth-db';

const mockGetIdle = getIdleTimeoutMinutes as jest.Mock;
const jwt = authOptions.callbacks!.jwt! as (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
const sessionCb = authOptions.callbacks!.session! as (args: Record<string, unknown>) => Promise<Record<string, unknown>>;

const NOW = Date.parse('2026-10-24T12:00:00Z');
const min = (m: number) => m * 60 * 1000;

describe('automatic sign-out in the NextAuth callbacks', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    mockGetIdle.mockReset().mockResolvedValue(30);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts the clock at sign-in and loads the user\'s limit', async () => {
    mockGetIdle.mockResolvedValue(15);
    const token = await jwt({ token: {}, user: { id: 'u1', email: 'a@b.c' }, account: { provider: 'credentials' } });
    expect(token).toMatchObject({ id: 'u1', authTime: NOW, lastActivity: NOW, idleTimeoutMin: 15, idleExpired: false });
  });

  it('refreshes the clock only on an explicit activity update', async () => {
    const start = { id: 'u1', lastActivity: NOW - min(10), idleTimeoutMin: 30 };
    const polled = await jwt({ token: { ...start } });
    expect(polled.lastActivity).toBe(NOW - min(10));

    const pinged = await jwt({ token: { ...start }, trigger: 'update', session: { activity: true } });
    expect(pinged.lastActivity).toBe(NOW);
  });

  it('expires a session idle past its limit, and the session then has no user', async () => {
    const token = await jwt({ token: { id: 'u1', lastActivity: NOW - min(31), idleTimeoutMin: 30 } });
    expect(token.idleExpired).toBe(true);

    const session = await sessionCb({ session: { user: { id: 'u1' }, expires: 'x' }, token });
    expect(session.user).toBeUndefined();
    expect(session.idleExpired).toBe(true);
  });

  it('cannot revive an expired session with an activity ping', async () => {
    const token = await jwt({
      token: { id: 'u1', lastActivity: NOW - min(31), idleTimeoutMin: 30 },
      trigger: 'update',
      session: { activity: true },
    });
    expect(token.idleExpired).toBe(true);
    expect(token.lastActivity).toBe(NOW - min(31));
  });

  it('never expires when the limit is off', async () => {
    const token = await jwt({ token: { id: 'u1', lastActivity: NOW - min(5000), idleTimeoutMin: 0 } });
    expect(token.idleExpired).toBeFalsy();
  });

  it('starts the clock for sessions issued before this feature instead of signing them out', async () => {
    const token = await jwt({ token: { id: 'u1' } });
    expect(token).toMatchObject({ lastActivity: NOW, idleTimeoutMin: 30 });
    expect(token.idleExpired).toBeFalsy();
  });

  it('reads a changed limit from the database, never from the client', async () => {
    mockGetIdle.mockResolvedValue(60);
    const token = await jwt({
      token: { id: 'u1', lastActivity: NOW, idleTimeoutMin: 30 },
      trigger: 'update',
      session: { idleTimeoutChanged: true, idleTimeoutMin: 0 },
    });
    expect(mockGetIdle).toHaveBeenCalledWith('u1');
    expect(token.idleTimeoutMin).toBe(60);
  });

  it('exposes the limit and sign-in time to the client session', async () => {
    const session = await sessionCb({
      session: { user: {}, expires: 'x' },
      token: { id: 'u1', email: 'a@b.c', idleTimeoutMin: 15, lastActivity: NOW, authTime: NOW },
    });
    expect(session).toMatchObject({ idleTimeoutMin: 15, authTime: NOW, user: { id: 'u1' } });
  });
});
