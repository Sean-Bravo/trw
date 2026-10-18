/**
 * Tests for POST /api/auth/2fa/disable
 *
 * F1 (scan C): a session alone must not turn 2FA off. The route needs the
 * current password plus a TOTP or backup code, and a wrong answer counts
 * toward the per-account lockout.
 */

import { getServerSession } from 'next-auth';
import { POST } from '@/app/api/auth/2fa/disable/route';
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
const disabled = (sql: string[]) => sql.some((s) => s.includes('two_factor_enabled = FALSE'));

describe('POST /api/auth/2fa/disable', () => {
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

  it('returns 401 without a password and code, and does not disable', async () => {
    const res = await post({});
    expect(res.status).toBe(401);
    expect(disabled(fx.executedSql())).toBe(false);
  });

  it('returns 401 with a password but no code', async () => {
    const res = await post({ password: PASSWORD });
    expect(res.status).toBe(401);
    expect(disabled(fx.executedSql())).toBe(false);
  });

  it('returns 401 for a wrong code and counts it toward the lockout', async () => {
    const res = await post({ password: PASSWORD, code: fx.wrongTotp() });
    expect(res.status).toBe(401);
    expect(fx.countedFailure()).toBe(true);
    expect(fx.row.failed_login_attempts).toBe(1);
    expect(disabled(fx.executedSql())).toBe(false);
  });

  it('returns 401 for a wrong password with a valid code, and counts it', async () => {
    const res = await post({ password: 'wrong', code: fx.totp() });
    expect(res.status).toBe(401);
    expect(fx.row.failed_login_attempts).toBe(1);
    expect(disabled(fx.executedSql())).toBe(false);
  });

  it('locks the account after 5 failures, after which even valid proof is refused', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await post({ password: PASSWORD, code: fx.wrongTotp() })).status).toBe(401);
    }
    expect(fx.row.locked_until).not.toBeNull();

    const res = await post({ password: PASSWORD, code: fx.totp() });
    expect(res.status).toBe(429);
    expect(disabled(fx.executedSql())).toBe(false);
  });

  it('disables 2FA with the password and a valid TOTP code', async () => {
    fx.row.failed_login_attempts = 2;
    const res = await post({ password: PASSWORD, code: fx.totp() });
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    expect(fx.mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('two_factor_enabled = FALSE'),
      ['u1']
    );
    expect(fx.row.failed_login_attempts).toBe(0);
  });

  it('disables 2FA with the password and an unused backup code', async () => {
    const res = await post({ password: PASSWORD, code: BACKUP_CODE });
    expect(res.status).toBe(200);
    expect(disabled(fx.executedSql())).toBe(true);
  });

  it('accepts the code alone for a Google-only account with no password', async () => {
    fx.row.password_hash = null;
    const res = await post({ password: '', code: fx.totp() });
    expect(res.status).toBe(200);
    expect(disabled(fx.executedSql())).toBe(true);
  });

  it('returns 400 when 2FA is not enabled', async () => {
    fx.row.two_factor_enabled = false;
    const res = await post({ password: PASSWORD, code: fx.totp() });
    expect(res.status).toBe(400);
    expect(fx.countedFailure()).toBe(false);
  });

  it('returns 429 when the per-user rate limit is hit', async () => {
    mockRateLimitCheck.mockResolvedValue({ success: false });
    const res = await post({ password: PASSWORD, code: fx.totp() });
    expect(res.status).toBe(429);
    expect(mockRateLimitCheck).toHaveBeenCalledWith('2fa-reauth:u1');
    expect(fx.mockExecute).not.toHaveBeenCalled();
  });

  it('returns 500 on a database error', async () => {
    fx.mockExecute.mockRejectedValue(new Error('DB'));
    const res = await post({ password: PASSWORD, code: fx.totp() });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Internal server error');
  });
});
