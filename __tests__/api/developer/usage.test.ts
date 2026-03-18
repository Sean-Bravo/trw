/**
 * Tests for /api/developer/usage route
 */

import { GET } from '@/app/api/developer/usage/route';
import * as apiKeys from '@/lib/api-keys';
import { createMockApiKey, createMockApiUsage } from '../../factories/api-keys';

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

describe('GET /api/developer/usage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when no session', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('returns 401 when session has no user id', async () => {
    mockGetServerSession.mockResolvedValue({ user: {} });

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('returns usage for active keys only', async () => {
    const activeKey = createMockApiKey({ id: 'key-1', is_active: true, name: 'Active' });
    const revokedKey = createMockApiKey({ id: 'key-2', is_active: false, name: 'Revoked' });

    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockApiKeys.listApiKeys.mockResolvedValue([activeKey, revokedKey]);
    mockApiKeys.getMonthlyUsage.mockResolvedValue({ fileCount: 5, requestCount: 10 });
    mockApiKeys.getUsageHistory.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.usage).toHaveLength(1);
    expect(data.usage[0].keyId).toBe('key-1');
  });

  it('returns empty usage array when no active keys', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockApiKeys.listApiKeys.mockResolvedValue([
      createMockApiKey({ is_active: false }),
    ]);
    mockApiKeys.getMonthlyUsage.mockResolvedValue({ fileCount: 0, requestCount: 0 });
    mockApiKeys.getUsageHistory.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(data.usage).toEqual([]);
  });

  it('includes tier, monthlyQuota, keyName per entry', async () => {
    const key = createMockApiKey({
      id: 'key-1',
      is_active: true,
      name: 'Production',
      tier: 'growth',
      monthly_quota: 500,
    });
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockApiKeys.listApiKeys.mockResolvedValue([key]);
    mockApiKeys.getMonthlyUsage.mockResolvedValue({ fileCount: 42, requestCount: 100 });
    mockApiKeys.getUsageHistory.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(data.usage[0]).toMatchObject({
      keyId: 'key-1',
      keyName: 'Production',
      tier: 'growth',
      monthlyQuota: 500,
      currentMonth: { fileCount: 42, requestCount: 100 },
    });
  });

  it('maps history to { date, fileCount, requestCount }', async () => {
    const key = createMockApiKey({ id: 'key-1', is_active: true });
    const historyRecord = createMockApiUsage({
      usage_date: new Date('2026-03-15'),
      file_count: 3,
      request_count: 7,
    });
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockApiKeys.listApiKeys.mockResolvedValue([key]);
    mockApiKeys.getMonthlyUsage.mockResolvedValue({ fileCount: 0, requestCount: 0 });
    mockApiKeys.getUsageHistory.mockResolvedValue([historyRecord]);

    const response = await GET();
    const data = await response.json();

    expect(data.usage[0].history).toHaveLength(1);
    expect(data.usage[0].history[0]).toMatchObject({
      fileCount: 3,
      requestCount: 7,
    });
  });

  it('fetches usage for multiple active keys in parallel', async () => {
    const keys = [
      createMockApiKey({ id: 'key-1', is_active: true }),
      createMockApiKey({ id: 'key-2', is_active: true }),
    ];
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockApiKeys.listApiKeys.mockResolvedValue(keys);
    mockApiKeys.getMonthlyUsage.mockResolvedValue({ fileCount: 0, requestCount: 0 });
    mockApiKeys.getUsageHistory.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(data.usage).toHaveLength(2);
    expect(mockApiKeys.getMonthlyUsage).toHaveBeenCalledTimes(2);
    expect(mockApiKeys.getUsageHistory).toHaveBeenCalledTimes(2);
  });

  it('returns 500 on listApiKeys error', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockApiKeys.listApiKeys.mockRejectedValue(new Error('DB error'));

    const response = await GET();
    expect(response.status).toBe(500);
  });

  it('returns 500 on getMonthlyUsage error', async () => {
    const key = createMockApiKey({ is_active: true });
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockApiKeys.listApiKeys.mockResolvedValue([key]);
    mockApiKeys.getMonthlyUsage.mockRejectedValue(new Error('DB error'));

    const response = await GET();
    expect(response.status).toBe(500);
  });
});
