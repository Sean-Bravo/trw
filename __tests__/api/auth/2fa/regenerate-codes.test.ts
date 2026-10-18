/**
 * Tests for POST /api/auth/2fa/regenerate-codes
 *
 * F1 (scan C): fresh backup codes are a working second factor, so minting
 * them needs the same re-auth as disabling 2FA.
 */

import { getServerSession } from 'next-auth';
import { POST } from '@/app/api/auth/2fa/regenerate-codes/route';
import * as rateLimit from '@/lib/rate-limit';
import { createMockRequest } from '../../../utils/mock-request';
import { BACKUP_CODE, PASSWORD, setupReauthDb } from './reauth-fixture';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));
jest.mock('@/lib/db');
jest.mock('@/lib/rate-limit', () => ({
  rateLimiters: { auth: { check: jest.fn() } },
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockRateLimitCheck = rateLimit.rateLimiters.auth.check as jest.Mock;

const post = (body: object) => POST(createMockRequest(body) as any);
const regenerated = (sql: string[]) => sql.some((s) => s.includes('SET backup_codes = $1'));

describe('POST /api/auth/2fa/regenerate-codes', () => {
  let fx: ReturnType<typeof setupReauthDb>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1' }, expires: '2025' });
    mockRateLimitCheck.mockResolvedValue({ success: true });
    fx = setupReauthDb();
  });

  it('requires a session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await post({ password: PASSWORD, code: fx.totp() });
    expect(res.status).toBe(401);
    expect(fx.mockExecute).not.toHaveBeenCalled();
  });

  it('returns 401 without a password and code, and issues no codes', async () => {
    const res = await post({});
    expect(res.status).toBe(401);
    expect((await res.json()).backupCodes).toBeUndefined();
    expect(regenerated(fx.executedSql())).toBe(false);
  });

  it('returns 401 for a wrong code and counts it toward the lockout', async () => {
    const res = await post({ password: PASSWORD, code: fx.wrongTotp() });
    expect(res.status).toBe(401);
    expect(fx.countedFailure()).toBe(true);
    expect(fx.row.failed_login_attempts).toBe(1);
    expect(regenerated(fx.executedSql())).toBe(false);
  });

  it('returns 401 for a wrong password with a valid code, and counts it', async () => {
    const res = await post({ password: 'wrong', code: fx.totp() });
    expect(res.status).toBe(401);
    expect(fx.row.failed_login_attempts).toBe(1);
    expect(regenerated(fx.executedSql())).toBe(false);
  });

  it('locks the account after 5 failures, after which even valid proof is refused', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await post({ password: PASSWORD, code: fx.wrongTotp() })).status).toBe(401);
    }
    const res = await post({ password: PASSWORD, code: fx.totp() });
    expect(res.status).toBe(429);
    expect(regenerated(fx.executedSql())).toBe(false);
  });

  it('returns 8 new codes with the password and a valid TOTP code', async () => {
    const res = await post({ password: PASSWORD, code: fx.totp() });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.backupCodes).toHaveLength(8);
    expect(regenerated(fx.executedSql())).toBe(true);
  });

  it('works with an unused backup code, which the new set replaces', async () => {
    const res = await post({ password: PASSWORD, code: BACKUP_CODE });
    expect(res.status).toBe(200);
    const [, params] = fx.mockExecute.mock.calls.find(([sql]) =>
      (sql as string).includes('SET backup_codes = $1')
    )!;
    expect(params?.[0]).toHaveLength(8);
    expect(params?.[0]).not.toContain(fx.row.backup_codes![0]);
  });

  it('returns 400 when 2FA is not enabled', async () => {
    fx.row.two_factor_enabled = false;
    const res = await post({ password: PASSWORD, code: fx.totp() });
    expect(res.status).toBe(400);
    expect(regenerated(fx.executedSql())).toBe(false);
  });

  it('returns 429 when the per-user rate limit is hit', async () => {
    mockRateLimitCheck.mockResolvedValue({ success: false });
    const res = await post({ password: PASSWORD, code: fx.totp() });
    expect(res.status).toBe(429);
    expect(fx.mockExecute).not.toHaveBeenCalled();
  });
});
