/**
 * Tests for POST /api/auth/2fa/verify
 */

import { getServerSession } from 'next-auth';
import { POST } from '@/app/api/auth/2fa/verify/route';
import { createMockRequest } from '../../../utils/mock-request';
import * as db from '@/lib/db';
import * as lib2fa from '@/lib/2fa';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));
jest.mock('@/lib/db');
jest.mock('@/lib/2fa');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockQueryOne = db.queryOne as jest.MockedFunction<typeof db.queryOne>;
const mockExecute = db.execute as jest.MockedFunction<typeof db.execute>;
const mockVerifyToken = lib2fa.verifyToken as jest.MockedFunction<typeof lib2fa.verifyToken>;
const mockGenerateBackupCodes = lib2fa.generateBackupCodes as jest.MockedFunction<typeof lib2fa.generateBackupCodes>;
const mockHashBackupCodes = lib2fa.hashBackupCodes as jest.MockedFunction<typeof lib2fa.hashBackupCodes>;

describe('POST /api/auth/2fa/verify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1' }, expires: '2025' });
    mockQueryOne.mockResolvedValue({ two_factor_secret: 'SECRET', two_factor_enabled: false });
    mockVerifyToken.mockReturnValue(true);
    mockGenerateBackupCodes.mockReturnValue(['A1B2-C3D4', 'E5F6-G7H8']);
    mockHashBackupCodes.mockImplementation((c: string[]) => c.map(() => 'hashed'));
    mockExecute.mockResolvedValue(undefined);
  });

  it('enables 2FA and returns backup codes', async () => {
    const res = await POST(createMockRequest({ code: '123456' }) as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.backupCodes)).toBe(true);
    expect(mockVerifyToken).toHaveBeenCalledWith('123456', 'SECRET');
    expect(mockExecute).toHaveBeenCalled();
  });

  it('requires authentication', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(createMockRequest({ code: '123456' }) as any);
    expect(res.status).toBe(401);
  });

  it('rejects invalid code format', async () => {
    const res = await POST(createMockRequest({ code: '12' }) as any);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid code|format/i);
  });

  it('rejects if setup not started', async () => {
    mockQueryOne.mockResolvedValue({ two_factor_secret: null, two_factor_enabled: false });
    const res = await POST(createMockRequest({ code: '123456' }) as any);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Setup not started/i);
  });

  it('rejects if 2FA already enabled', async () => {
    mockQueryOne.mockResolvedValue({ two_factor_secret: 'S', two_factor_enabled: true });
    const res = await POST(createMockRequest({ code: '123456' }) as any);
    expect(res.status).toBe(400);
  });

  it('rejects invalid TOTP token', async () => {
    mockVerifyToken.mockReturnValue(false);
    const res = await POST(createMockRequest({ code: '123456' }) as any);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid verification|Invalid code/i);
  });
});
