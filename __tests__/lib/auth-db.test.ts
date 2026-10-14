/**
 * Tests for lib/auth-db.ts — focused on the unified tier helper. Yesterday's
 * helper read from `subscriptions.tier`; this is the post-unification version
 * that reads `api_keys.tier` with highest-active-wins resolution.
 */

import { getUserTier, createUser, findOrCreateOAuthUser } from '@/lib/auth-db';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  execute: jest.fn(),
}));

import { queryOne, execute } from '@/lib/db';

const mockQueryOne = queryOne as jest.Mock;

describe('getUserTier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queries api_keys (not subscriptions) and filters on is_active', async () => {
    mockQueryOne.mockResolvedValue({ tier: 'starter' });

    const tier = await getUserTier('user-1');

    expect(tier).toBe('starter');
    const [sql, params] = mockQueryOne.mock.calls[0];
    expect(sql).toContain('SELECT tier FROM api_keys');
    expect(sql).toContain('is_active = true');
    expect(sql).not.toContain('subscriptions');
    expect(params).toEqual(['user-1']);
  });

  it('returns "growth" when the user holds an active growth key', async () => {
    mockQueryOne.mockResolvedValue({ tier: 'growth' });
    expect(await getUserTier('user-2')).toBe('growth');
  });

  it('returns "business" when the user holds an active business key', async () => {
    mockQueryOne.mockResolvedValue({ tier: 'business' });
    expect(await getUserTier('user-3')).toBe('business');
  });

  it('defaults to "free" when no active api_keys row exists', async () => {
    mockQueryOne.mockResolvedValue(null);
    expect(await getUserTier('user-no-keys')).toBe('free');
  });

  it('orders by tier rank so highest-active-tier wins for multi-key users', async () => {
    // User has both a free key and a growth key. SQL ORDER BY ... LIMIT 1 returns
    // the highest-tier row; the helper should surface 'growth'.
    mockQueryOne.mockResolvedValue({ tier: 'growth' });

    const tier = await getUserTier('multi-key-user');

    expect(tier).toBe('growth');
    // Confirm the SQL has the CASE-based ordering with business=4, growth=3, etc.
    const [sql] = mockQueryOne.mock.calls[0];
    expect(sql).toMatch(/ORDER BY/i);
    expect(sql).toContain("WHEN 'business' THEN 4");
    expect(sql).toContain("WHEN 'growth'   THEN 3");
    expect(sql).toContain("WHEN 'starter'  THEN 2");
    expect(sql).toContain('LIMIT 1');
  });
});


describe('acquisition attribution on user creation (migration 014)', () => {
  const attr = { source: 'google', medium: 'cpc', campaign: 'c1', landing: '/upload', funnel: 'bank' as const, ts: 't' };
  const mockExecute = execute as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createUser writes the five attribution columns, NULL when unknown', async () => {
    mockQueryOne.mockResolvedValue({ id: 'u1', email: 'a@x.com', name: null, email_verified: false, created_at: new Date() });
    await createUser('a@x.com', 'Password123!', undefined, undefined, attr);
    let [sql, params] = mockQueryOne.mock.calls[0];
    expect(sql).toMatch(/acquisition_source, acquisition_medium, acquisition_campaign, acquisition_landing, funnel/);
    expect(params.slice(-5)).toEqual(['google', 'cpc', 'c1', '/upload', 'bank']);

    mockQueryOne.mockClear();
    await createUser('b@x.com', 'Password123!');
    [sql, params] = mockQueryOne.mock.calls[0];
    expect(params.slice(-5)).toEqual([null, null, null, null, null]);
    expect(mockExecute).toHaveBeenCalled(); // default subscription still created
  });

  it('findOrCreateOAuthUser writes attribution only for a brand-new user', async () => {
    // No existing account, no existing user → INSERT with attribution.
    mockQueryOne
      .mockResolvedValueOnce(null)                                   // accounts lookup
      .mockResolvedValueOnce(null)                                   // findUserByEmail
      .mockResolvedValueOnce({ id: 'u2', email: 'c@x.com', name: null, created_at: new Date() }) // insert
      .mockResolvedValue({ id: 'u2', email: 'c@x.com', name: null, email_verified: true, created_at: new Date(), tier: 'free' });
    await findOrCreateOAuthUser('google', 'gid', 'c@x.com', undefined, undefined, undefined, undefined, attr);
    const insert = mockQueryOne.mock.calls.find(([q]) => /INSERT INTO users/.test(q));
    expect(insert).toBeDefined();
    expect(insert![0]).toMatch(/funnel/);
    expect(insert![1].slice(-5)).toEqual(['google', 'cpc', 'c1', '/upload', 'bank']);
  });
});
