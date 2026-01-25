/**
 * Tests for GET /api/auth/2fa/status
 */

import { getServerSession } from 'next-auth';
import { GET } from '@/app/api/auth/2fa/status/route';
import * as db from '@/lib/db';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));
jest.mock('@/lib/db');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockQueryOne = db.queryOne as jest.MockedFunction<typeof db.queryOne>;

describe('GET /api/auth/2fa/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1' }, expires: '2025' });
  });

  it('returns enabled true when 2FA is on', async () => {
    mockQueryOne.mockResolvedValue({ two_factor_enabled: true });
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.enabled).toBe(true);
  });

  it('returns enabled false for new users', async () => {
    mockQueryOne.mockResolvedValue({ two_factor_enabled: false });
    const res = await GET();
    expect((await res.json()).enabled).toBe(false);
  });

  it('requires authentication', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 500 on error', async () => {
    mockQueryOne.mockRejectedValue(new Error('DB'));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
