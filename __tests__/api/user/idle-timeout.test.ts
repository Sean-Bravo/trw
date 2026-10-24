/**
 * Tests for PATCH /api/user/idle-timeout
 */

import { getServerSession } from 'next-auth';
import { PATCH } from '@/app/api/user/idle-timeout/route';
import { createMockRequest } from '../../utils/mock-request';
import { setIdleTimeoutMinutes } from '@/lib/auth-db';
import { sendIdleTimeoutDisabledEmail } from '@/lib/email';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));
jest.mock('@/lib/auth-db', () => ({ setIdleTimeoutMinutes: jest.fn() }));
jest.mock('@/lib/email', () => ({ sendIdleTimeoutDisabledEmail: jest.fn() }));

const mockSession = getServerSession as jest.Mock;
const mockSet = setIdleTimeoutMinutes as jest.Mock;
const mockEmail = sendIdleTimeoutDisabledEmail as jest.Mock;

const session = (authAgoMs: number) => ({
  user: { id: 'u1', email: 'a@b.c', name: 'A' },
  authTime: Date.now() - authAgoMs,
  expires: '2099-01-01',
});

describe('PATCH /api/user/idle-timeout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSet.mockResolvedValue(undefined);
    mockEmail.mockResolvedValue({ success: true });
  });

  it('requires a session', async () => {
    mockSession.mockResolvedValue(null);
    const res = await PATCH(createMockRequest({ minutes: 15 }) as never);
    expect(res.status).toBe(401);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('rejects a value that is not an option', async () => {
    mockSession.mockResolvedValue(session(60 * 60 * 1000));
    const res = await PATCH(createMockRequest({ minutes: 45 }) as never);
    expect(res.status).toBe(400);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('saves a new limit without a recent sign-in, and sends no email', async () => {
    mockSession.mockResolvedValue(session(60 * 60 * 1000));
    const res = await PATCH(createMockRequest({ minutes: 60 }) as never);
    expect(res.status).toBe(200);
    expect(mockSet).toHaveBeenCalledWith('u1', 60);
    expect(mockEmail).not.toHaveBeenCalled();
  });

  it('refuses to turn it off without a recent sign-in', async () => {
    mockSession.mockResolvedValue(session(60 * 60 * 1000));
    const res = await PATCH(createMockRequest({ minutes: 0 }) as never);
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('reauth_required');
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('turns it off after a recent sign-in and emails the account', async () => {
    mockSession.mockResolvedValue(session(60 * 1000));
    const res = await PATCH(createMockRequest({ minutes: 0 }) as never);
    expect(res.status).toBe(200);
    expect(mockSet).toHaveBeenCalledWith('u1', 0);
    expect(mockEmail).toHaveBeenCalledWith('a@b.c', 'A');
  });

  it('keeps the change when the notice email fails', async () => {
    mockSession.mockResolvedValue(session(60 * 1000));
    mockEmail.mockResolvedValue({ success: false, error: 'smtp down' });
    const res = await PATCH(createMockRequest({ minutes: 0 }) as never);
    expect(res.status).toBe(200);
    expect(mockSet).toHaveBeenCalledWith('u1', 0);
  });
});
