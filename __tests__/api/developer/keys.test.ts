/**
 * Tests for /api/developer/keys route
 */

import { GET, POST } from '@/app/api/developer/keys/route';
import { createMockRequest } from '../../utils/mock-request';
import * as apiKeys from '@/lib/api-keys';
import { createMockApiKey } from '../../factories/api-keys';

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

describe('GET /api/developer/keys', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when no session', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 when session has no user id', async () => {
    mockGetServerSession.mockResolvedValue({ user: {} });

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('returns list of keys with camelCase mapping', async () => {
    const mockKey = createMockApiKey({ tier: 'starter' });
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockApiKeys.listApiKeys.mockResolvedValue([mockKey]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.keys).toHaveLength(1);
    expect(data.keys[0]).toEqual({
      id: mockKey.id,
      name: mockKey.name,
      keyPrefix: `tf_live_${mockKey.key_prefix}...`,
      tier: mockKey.tier,
      isActive: mockKey.is_active,
      rateLimitRpm: mockKey.rate_limit_rpm,
      monthlyQuota: mockKey.monthly_quota,
      lastUsedAt: mockKey.last_used_at,
      createdAt: mockKey.created_at,
    });
  });

  it('returns empty keys array when user has none', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockApiKeys.listApiKeys.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.keys).toEqual([]);
  });

  it('does not include key_hash in response', async () => {
    const mockKey = createMockApiKey();
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockApiKeys.listApiKeys.mockResolvedValue([mockKey]);

    const response = await GET();
    const data = await response.json();

    expect(data.keys[0]).not.toHaveProperty('key_hash');
    expect(data.keys[0]).not.toHaveProperty('keyHash');
  });

  it('calls listApiKeys with correct userId', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-xyz' } });
    mockApiKeys.listApiKeys.mockResolvedValue([]);

    await GET();

    expect(mockApiKeys.listApiKeys).toHaveBeenCalledWith('user-xyz');
  });

  it('maps multiple keys correctly', async () => {
    const keys = [
      createMockApiKey({ tier: 'starter' }),
      createMockApiKey({ tier: 'growth', is_active: false }),
    ];
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockApiKeys.listApiKeys.mockResolvedValue(keys);

    const response = await GET();
    const data = await response.json();

    expect(data.keys).toHaveLength(2);
    expect(data.keys[0].tier).toBe('starter');
    expect(data.keys[1].isActive).toBe(false);
  });

  it('returns 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockApiKeys.listApiKeys.mockRejectedValue(new Error('DB connection failed'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

describe('POST /api/developer/keys', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiKeys.createApiKey.mockResolvedValue({
      key: 'tf_live_abc12345def67890abc12345def67890',
      id: 'key-123',
      prefix: 'abc12345',
    });
  });

  it('returns 401 when no session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const request = createMockRequest({ name: 'Test Key' });

    const response = await POST(request as any);
    expect(response.status).toBe(401);
  });

  it('creates key with valid name and returns 201', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    const request = createMockRequest({ name: 'Production' });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe('key-123');
    expect(data.key).toBe('tf_live_abc12345def67890abc12345def67890');
    expect(data.keyPrefix).toBe('tf_live_abc12345...');
    expect(data.message).toContain('Store this key securely');
  });

  it('returns 400 for empty name', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    const request = createMockRequest({ name: '' });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Name is required');
  });

  it('returns 400 for name longer than 100 chars', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    const request = createMockRequest({ name: 'x'.repeat(101) });

    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it('returns 400 for non-string name', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    const request = createMockRequest({ name: 12345 });

    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it('returns 400 for whitespace-only name', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    const request = createMockRequest({ name: '   ' });

    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it('trims whitespace from name', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    const request = createMockRequest({ name: '  My Key  ' });

    await POST(request as any);

    expect(mockApiKeys.createApiKey).toHaveBeenCalledWith('user-1', 'My Key');
  });

  it('returns 409 when max keys exceeded', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockApiKeys.createApiKey.mockRejectedValue(
      new Error('Maximum of 5 active API keys allowed')
    );
    const request = createMockRequest({ name: 'Another Key' });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain('Maximum of');
  });

  it('returns 500 on unexpected error', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockApiKeys.createApiKey.mockRejectedValue(new Error('Unexpected'));
    const request = createMockRequest({ name: 'Test' });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  it('calls createApiKey with correct userId', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-abc' } });
    const request = createMockRequest({ name: 'Test' });

    await POST(request as any);

    expect(mockApiKeys.createApiKey).toHaveBeenCalledWith('user-abc', 'Test');
  });
});
