/**
 * Tests for POST /api/auth/2fa/disable
 */

import { getServerSession } from 'next-auth';
import { POST } from '@/app/api/auth/2fa/disable/route';
import * as db from '@/lib/db';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));
jest.mock('@/lib/db');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockExecute = db.execute as jest.MockedFunction<typeof db.execute>;

describe('POST /api/auth/2fa/disable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1' }, expires: '2025' });
    mockExecute.mockResolvedValue(undefined);
  });

  it('disables 2FA and returns success', async () => {
    const res = await POST();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('two_factor_enabled'),
      expect.any(Array)
    );
  });

  it('requires authentication', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(401);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('returns 500 on error', async () => {
    mockExecute.mockRejectedValue(new Error('DB'));
    const res = await POST();
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Internal server error');
  });
});
