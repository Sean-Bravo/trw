/**
 * Tests for lib/auth-db.ts — focused on the consumer tier helper added in
 * the Tiered AI Insights wire-up. Other auth-db functions (createUser,
 * findUserByEmail, etc.) are exercised through the route-level tests they
 * back; this file stays small.
 */

import { getUserTier } from '@/lib/auth-db';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  execute: jest.fn(),
}));

import { queryOne } from '@/lib/db';

const mockQueryOne = queryOne as jest.Mock;

describe('getUserTier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the tier from an active subscription row', async () => {
    mockQueryOne.mockResolvedValue({ tier: 'pro' });

    const tier = await getUserTier('user-1');

    expect(tier).toBe('pro');
    const [sql, params] = mockQueryOne.mock.calls[0];
    expect(sql).toContain('SELECT tier FROM subscriptions');
    expect(sql).toContain("status = 'active'");
    expect(params).toEqual(['user-1']);
  });

  it('returns "premium" when subscription tier is premium', async () => {
    mockQueryOne.mockResolvedValue({ tier: 'premium' });
    expect(await getUserTier('user-2')).toBe('premium');
  });

  it('defaults to "free" when no active subscription row exists', async () => {
    // Either no row at all, or status != 'active' filters it out.
    mockQueryOne.mockResolvedValue(null);
    expect(await getUserTier('user-no-sub')).toBe('free');
  });

  it('only matches active status (canceled/past_due rows return null → free)', async () => {
    mockQueryOne.mockResolvedValue(null);
    const tier = await getUserTier('user-canceled');

    expect(tier).toBe('free');
    // Confirm the SQL filters on status = 'active'.
    const [sql] = mockQueryOne.mock.calls[0];
    expect(sql).toMatch(/status\s*=\s*'active'/);
  });
});
