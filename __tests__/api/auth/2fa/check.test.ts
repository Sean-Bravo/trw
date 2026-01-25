/**
 * Tests for POST /api/auth/2fa/check (login flow: checks if 2FA required)
 */

import { POST } from '@/app/api/auth/2fa/check/route';
import { createMockRequest } from '../../../utils/mock-request';
import * as authDb from '@/lib/auth-db';
import * as db from '@/lib/db';
import * as email from '@/lib/email';
import * as rateLimit from '@/lib/rate-limit';

jest.mock('@/lib/auth-db');
jest.mock('@/lib/db');
jest.mock('@/lib/email', () => ({
  generateVerificationCode: jest.fn(() => '123456'),
  send2FALoginEmail: jest.fn().mockResolvedValue({ success: true }),
}));
jest.mock('@/lib/rate-limit', () => ({
  rateLimiters: { auth: { check: jest.fn().mockResolvedValue({ success: true }) } },
  getClientIdentifier: jest.fn().mockReturnValue('ip'),
}));

const mockVerifyPassword = authDb.verifyPassword as jest.MockedFunction<typeof authDb.verifyPassword>;
const mockQueryOne = db.queryOne as jest.MockedFunction<typeof db.queryOne>;
const mockExecute = db.execute as jest.MockedFunction<typeof db.execute>;
const mockSend2FALoginEmail = (email as any).send2FALoginEmail as jest.Mock;

describe('POST /api/auth/2fa/check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit.rateLimiters.auth.check as jest.Mock).mockResolvedValue({ success: true });
    mockVerifyPassword.mockResolvedValue({ id: 'u1', email: 'u@x.com' } as any);
    mockQueryOne.mockResolvedValue({ two_factor_enabled: false, name: 'U' });
    mockExecute.mockResolvedValue(undefined);
    mockSend2FALoginEmail?.mockResolvedValue?.({ success: true });
  });

  it('returns requires2FA false when 2FA not enabled', async () => {
    const res = await POST(createMockRequest({ email: 'u@x.com', password: 'P1!' }) as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.requires2FA).toBe(false);
    expect(mockSend2FALoginEmail).not.toHaveBeenCalled();
  });

  it('returns requires2FA true and sends email when 2FA enabled', async () => {
    mockQueryOne.mockResolvedValue({ two_factor_enabled: true, name: 'U' });
    const res = await POST(createMockRequest({ email: 'u@x.com', password: 'P1!' }) as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.requires2FA).toBe(true);
    expect(mockExecute).toHaveBeenCalled();
    expect(mockSend2FALoginEmail).toHaveBeenCalled();
  });

  it('rejects missing credentials', async () => {
    const res = await POST(createMockRequest({ email: 'u@x.com' }) as any);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Missing credentials/i);
  });

  it('returns 401 for invalid password', async () => {
    mockVerifyPassword.mockResolvedValue(null);
    const res = await POST(createMockRequest({ email: 'u@x.com', password: 'wrong' }) as any);
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/Invalid credentials/i);
  });

  it('returns 429 when rate limited', async () => {
    (rateLimit.rateLimiters.auth.check as jest.Mock).mockResolvedValue({ success: false });
    const res = await POST(createMockRequest({ email: 'u@x.com', password: 'P1!' }) as any);
    expect(res.status).toBe(429);
  });
});
