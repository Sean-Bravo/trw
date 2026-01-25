/**
 * Tests for POST /api/auth/2fa/setup
 */

import { getServerSession } from 'next-auth';
import { POST } from '@/app/api/auth/2fa/setup/route';
import * as db from '@/lib/db';
import * as lib2fa from '@/lib/2fa';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));
jest.mock('@/lib/db');
jest.mock('@/lib/2fa');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockQueryOne = db.queryOne as jest.MockedFunction<typeof db.queryOne>;
const mockExecute = db.execute as jest.MockedFunction<typeof db.execute>;
const mockGenerateSecret = lib2fa.generateSecret as jest.MockedFunction<typeof lib2fa.generateSecret>;
const mockGenerateQRCode = lib2fa.generateQRCode as jest.MockedFunction<typeof lib2fa.generateQRCode>;

describe('POST /api/auth/2fa/setup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1', email: 'u@x.com' }, expires: '2025' });
    mockQueryOne.mockResolvedValue({ two_factor_enabled: false });
    mockGenerateSecret.mockReturnValue('SECRET');
    mockGenerateQRCode.mockResolvedValue('data:image/png;base64,QR');
    mockExecute.mockResolvedValue(undefined);
  });

  it('returns secret and qrCode when not enabled', async () => {
    const res = await POST();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.secret).toBe('SECRET');
    expect(data.qrCode).toMatch(/^data:image/);
    expect(mockGenerateSecret).toHaveBeenCalled();
    expect(mockGenerateQRCode).toHaveBeenCalledWith('u@x.com', 'SECRET');
    expect(mockExecute).toHaveBeenCalled();
  });

  it('requires authentication', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Unauthorized');
  });

  it('rejects if 2FA already enabled', async () => {
    mockQueryOne.mockResolvedValue({ two_factor_enabled: true });
    const res = await POST();
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/already enabled/i);
    expect(mockGenerateSecret).not.toHaveBeenCalled();
  });

  it('returns 500 on error', async () => {
    mockExecute.mockRejectedValue(new Error('DB'));
    const res = await POST();
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Internal server error');
  });
});
