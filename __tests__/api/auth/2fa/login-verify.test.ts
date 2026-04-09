/**
 * Tests for POST /api/auth/2fa/login-verify
 */

jest.mock('@/lib/auth-db');
jest.mock('@/lib/db');
jest.mock('@/lib/2fa');
jest.mock('@/lib/rate-limit', () => ({
  rateLimiters: {
    auth: { check: jest.fn().mockResolvedValue({ success: true }) },
  },
  getClientIdentifier: jest.fn().mockReturnValue('test-ip'),
}));

import { POST } from '@/app/api/auth/2fa/login-verify/route';
import { createMockRequest } from '../../../utils/mock-request';
import * as authDb from '@/lib/auth-db';
import * as db from '@/lib/db';
import * as lib2fa from '@/lib/2fa';
import * as rateLimit from '@/lib/rate-limit';

const mockVerifyPassword = authDb.verifyPassword as jest.MockedFunction<typeof authDb.verifyPassword>;
const mockQueryOne = db.queryOne as jest.MockedFunction<typeof db.queryOne>;
const mockExecute = db.execute as jest.MockedFunction<typeof db.execute>;
const mockVerifyToken = lib2fa.verifyToken as jest.MockedFunction<typeof lib2fa.verifyToken>;
const mockVerifyBackupCode = lib2fa.verifyBackupCode as jest.MockedFunction<typeof lib2fa.verifyBackupCode>;
const mockRateLimit = rateLimit as jest.Mocked<typeof rateLimit>;

describe('POST /api/auth/2fa/login-verify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockRateLimit.rateLimiters.auth.check as jest.Mock).mockResolvedValue({ success: true });
    mockVerifyPassword.mockResolvedValue({ id: 'u1', email: 'u@x.com' } as any);
    mockQueryOne.mockResolvedValue({
      id: 'u1',
      two_factor_secret: 'SECRET',
      two_factor_login_code: '123456',
      two_factor_login_code_expires: new Date(Date.now() + 10 * 60 * 1000),
      backup_codes: ['hash1', 'hash2'],
    });
    mockVerifyToken.mockReturnValue(false);
    mockVerifyBackupCode.mockReturnValue({ valid: false, index: -1 });
    mockExecute.mockResolvedValue(undefined);
  });

  it('M-7: returns 429 when rate limit exceeded', async () => {
    (mockRateLimit.rateLimiters.auth.check as jest.Mock).mockResolvedValue({ success: false });
    const res = await POST(createMockRequest({ email: 'u@x.com', password: 'P1!', code: '123456' }) as any);
    expect(res.status).toBe(429);
    expect(mockVerifyPassword).not.toHaveBeenCalled();
  });

  it('returns success and userId when TOTP valid', async () => {
    mockVerifyToken.mockReturnValue(true);
    const res = await POST(createMockRequest({ email: 'u@x.com', password: 'P1!', code: '123456', useAuthenticatorApp: true }) as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.userId).toBe('u1');
  });

  it('returns success when backup code valid and marks used', async () => {
    mockVerifyBackupCode.mockReturnValue({ valid: true, index: 0 });
    const res = await POST(createMockRequest({ email: 'u@x.com', password: 'P1!', code: 'A1B2-C3D4', isBackupCode: true }) as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockExecute).toHaveBeenCalled();
  });

  it('rejects missing credentials', async () => {
    const res = await POST(createMockRequest({ email: 'u@x.com', password: 'P1!' }) as any);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Missing credentials/i);
  });

  it('returns 401 for invalid password', async () => {
    mockVerifyPassword.mockResolvedValue(null);
    const res = await POST(createMockRequest({ email: 'u@x.com', password: 'wrong', code: '123' }) as any);
    expect(res.status).toBe(401);
  });

  it('returns 400 when 2FA not enabled', async () => {
    mockQueryOne.mockResolvedValue(null);
    const res = await POST(createMockRequest({ email: 'u@x.com', password: 'P1!', code: '123456' }) as any);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/2FA not enabled/i);
  });

  it('rejects invalid or expired verification code', async () => {
    const res = await POST(createMockRequest({ email: 'u@x.com', password: 'P1!', code: '000000' }) as any);
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/Invalid or expired/i);
  });
});
