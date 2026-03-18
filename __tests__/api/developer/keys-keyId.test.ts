/**
 * Tests for /api/developer/keys/[keyId] route
 */

import { DELETE, PATCH } from '@/app/api/developer/keys/[keyId]/route';
import { createMockRequest } from '../../utils/mock-request';
import * as apiKeys from '@/lib/api-keys';

// Mock dependencies
jest.mock('@/lib/api-keys');
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}));

import { getServerSession } from 'next-auth';

const mockGetServerSession = getServerSession as jest.Mock;
const mockApiKeys = apiKeys as jest.Mocked<typeof apiKeys>;

const createParams = (keyId: string) => ({
  params: Promise.resolve({ keyId }),
});

describe('DELETE /api/developer/keys/[keyId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when no session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const request = createMockRequest({});

    const response = await DELETE(request as any, createParams('key-1'));
    expect(response.status).toBe(401);
  });

  it('returns 401 when session has no user id', async () => {
    mockGetServerSession.mockResolvedValue({ user: {} });
    const request = createMockRequest({});

    const response = await DELETE(request as any, createParams('key-1'));
    expect(response.status).toBe(401);
  });

  it('revokes key successfully and returns 200', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockApiKeys.revokeApiKey.mockResolvedValue(true);
    const request = createMockRequest({});

    const response = await DELETE(request as any, createParams('key-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('API key revoked');
  });

  it('returns 404 when key not found or already revoked', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockApiKeys.revokeApiKey.mockResolvedValue(false);
    const request = createMockRequest({});

    const response = await DELETE(request as any, createParams('key-999'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  it('calls revokeApiKey with correct userId and keyId', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-abc' } });
    mockApiKeys.revokeApiKey.mockResolvedValue(true);
    const request = createMockRequest({});

    await DELETE(request as any, createParams('key-xyz'));

    expect(mockApiKeys.revokeApiKey).toHaveBeenCalledWith('user-abc', 'key-xyz');
  });

  it('scopes revocation by userId', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-attacker' } });
    mockApiKeys.revokeApiKey.mockResolvedValue(false);
    const request = createMockRequest({});

    const response = await DELETE(request as any, createParams('key-victim'));

    expect(mockApiKeys.revokeApiKey).toHaveBeenCalledWith('user-attacker', 'key-victim');
    expect(response.status).toBe(404);
  });

  it('returns 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockApiKeys.revokeApiKey.mockRejectedValue(new Error('DB error'));
    const request = createMockRequest({});

    const response = await DELETE(request as any, createParams('key-1'));
    expect(response.status).toBe(500);
  });
});

describe('PATCH /api/developer/keys/[keyId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when no session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const request = createMockRequest({ name: 'New Name' });

    const response = await PATCH(request as any, createParams('key-1'));
    expect(response.status).toBe(401);
  });

  it('renames key successfully', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockApiKeys.renameApiKey.mockResolvedValue(true);
    const request = createMockRequest({ name: 'Renamed Key' });

    const response = await PATCH(request as any, createParams('key-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('API key renamed');
  });

  it('returns 400 for empty name', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    const request = createMockRequest({ name: '' });

    const response = await PATCH(request as any, createParams('key-1'));
    expect(response.status).toBe(400);
  });

  it('returns 400 for name longer than 100 chars', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    const request = createMockRequest({ name: 'a'.repeat(101) });

    const response = await PATCH(request as any, createParams('key-1'));
    expect(response.status).toBe(400);
  });

  it('returns 404 when key not found', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockApiKeys.renameApiKey.mockResolvedValue(false);
    const request = createMockRequest({ name: 'New Name' });

    const response = await PATCH(request as any, createParams('key-999'));
    expect(response.status).toBe(404);
  });

  it('trims whitespace from name', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockApiKeys.renameApiKey.mockResolvedValue(true);
    const request = createMockRequest({ name: '  Trimmed Name  ' });

    await PATCH(request as any, createParams('key-1'));

    expect(mockApiKeys.renameApiKey).toHaveBeenCalledWith('user-1', 'key-1', 'Trimmed Name');
  });

  it('returns 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockApiKeys.renameApiKey.mockRejectedValue(new Error('DB error'));
    const request = createMockRequest({ name: 'New Name' });

    const response = await PATCH(request as any, createParams('key-1'));
    expect(response.status).toBe(500);
  });
});
