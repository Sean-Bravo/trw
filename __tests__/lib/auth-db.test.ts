/**
 * Tests for lib/auth-db.ts — focused on the unified tier helper. Yesterday's
 * helper read from `subscriptions.tier`; this is the post-unification version
 * that reads `api_keys.tier` with highest-active-wins resolution.
 */

import {
  getUserTier,
  createUser,
  findOrCreateOAuthUser,
  verifyPassword,
  authorizeCredentials,
  createTwoFactorLoginToken,
} from '@/lib/auth-db';
import bcrypt from 'bcryptjs';

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
    await findOrCreateOAuthUser('google', 'gid', 'c@x.com', undefined, undefined, undefined, undefined, attr, true);
    const insert = mockQueryOne.mock.calls.find(([q]) => /INSERT INTO users/.test(q));
    expect(insert).toBeDefined();
    expect(insert![0]).toMatch(/funnel/);
    expect(insert![1].slice(-5)).toEqual(['google', 'cpc', 'c1', '/upload', 'bank']);
  });
});


/**
 * Oct 16 security scan F30 / F31 / F40. A small in-memory users row stands in
 * for Neon so single-use and lockout behaviour is exercised end to end
 * through the real SQL branches.
 */
describe('credentials login gates (F30, F31, F40)', () => {
  const mockExecute = execute as jest.Mock;

  type Row = {
    id: string;
    email: string;
    password_hash: string;
    name: string | null;
    email_verified: boolean;
    failed_login_attempts: number;
    locked_until: Date | null;
    two_factor_enabled: boolean;
    two_factor_login_token_hash: string | null;
    two_factor_login_token_expires: Date | null;
    created_at: Date;
  };
  let row: Row;
  let compareSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    row = {
      id: 'u1',
      email: 'u@x.com',
      password_hash: 'hash',
      name: null,
      email_verified: true,
      failed_login_attempts: 0,
      locked_until: null,
      two_factor_enabled: false,
      two_factor_login_token_hash: null,
      two_factor_login_token_expires: null,
      created_at: new Date(),
    };
    compareSpy = jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

    mockQueryOne.mockImplementation(async (sql: string) => {
      if (/WHERE email = \$1/.test(sql)) {
        // Honour the column list, so a SELECT that drops a column yields undefined
        // for it exactly as Neon would.
        const cols = sql.slice(sql.indexOf('SELECT') + 6, sql.indexOf('FROM')).split(',').map((c) => c.trim());
        return Object.fromEntries(cols.map((c) => [c, (row as Record<string, unknown>)[c]]));
      }
      if (/WHERE u\.id = \$1/.test(sql)) {
        return { id: row.id, email: row.email, name: row.name, email_verified: row.email_verified, created_at: row.created_at };
      }
      if (/SELECT two_factor_enabled/.test(sql)) return { two_factor_enabled: row.two_factor_enabled };
      if (/SELECT two_factor_login_token_hash/.test(sql)) {
        return {
          two_factor_login_token_hash: row.two_factor_login_token_hash,
          two_factor_login_token_expires: row.two_factor_login_token_expires,
        };
      }
      return null;
    });

    mockExecute.mockImplementation(async (sql: string, params: unknown[]) => {
      if (/SET two_factor_login_token_hash = \$1/.test(sql)) {
        row.two_factor_login_token_hash = params[0] as string;
        row.two_factor_login_token_expires = new Date(Date.now() + 2 * 60 * 1000);
        return { rowCount: 0 };
      }
      if (/SET two_factor_login_token_hash = NULL/.test(sql)) {
        if (row.two_factor_login_token_hash !== params[1]) return { rowCount: 0 };
        row.two_factor_login_token_hash = null;
        row.two_factor_login_token_expires = null;
        return { rowCount: 1 };
      }
      return { rowCount: 0 };
    });
  });

  afterEach(() => {
    compareSpy.mockRestore();
  });

  it('F31: an unverified account cannot log in with the right password', async () => {
    row.email_verified = false;

    expect(await authorizeCredentials('u@x.com', 'Password123!')).toBeNull();
    expect(compareSpy).toHaveBeenCalled();
  });

  it('F30: a password-only callback is refused when 2FA is enabled', async () => {
    row.two_factor_enabled = true;

    expect(await authorizeCredentials('u@x.com', 'Password123!')).toBeNull();
    expect(await authorizeCredentials('u@x.com', 'Password123!', 'not-a-real-token')).toBeNull();
  });

  it('F30: a valid 2FA token is accepted once and rejected on reuse', async () => {
    row.two_factor_enabled = true;
    const token = await createTwoFactorLoginToken('u1');
    // Only the hash is stored.
    expect(row.two_factor_login_token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.two_factor_login_token_hash).not.toBe(token);

    const first = await authorizeCredentials('u@x.com', 'Password123!', token);
    expect(first?.id).toBe('u1');

    expect(await authorizeCredentials('u@x.com', 'Password123!', token)).toBeNull();
  });

  it('F30: an expired 2FA token is refused', async () => {
    row.two_factor_enabled = true;
    const token = await createTwoFactorLoginToken('u1');
    row.two_factor_login_token_expires = new Date(Date.now() - 1000);

    expect(await authorizeCredentials('u@x.com', 'Password123!', token)).toBeNull();
  });

  it('F40: a locked account returns null without bcrypt.compare being called', async () => {
    row.locked_until = new Date(Date.now() + 10 * 60 * 1000);

    expect(await verifyPassword('u@x.com', 'Password123!')).toBeNull();
    expect(await authorizeCredentials('u@x.com', 'Password123!')).toBeNull();
    expect(compareSpy).not.toHaveBeenCalled();
  });

  it('F40: a correct password alone does not reset the failure counter', async () => {
    row.failed_login_attempts = 4;

    await verifyPassword('u@x.com', 'Password123!');

    const resets = mockExecute.mock.calls.filter(([sql]) => /failed_login_attempts = 0/.test(sql));
    expect(resets).toHaveLength(0);
  });
});


describe('findOrCreateOAuthUser link-by-email (F31)', () => {
  const mockExecute = execute as jest.Mock;

  beforeEach(() => {
    // mockReset, not clearAllMocks: drop queued once-values and the fake-row
    // implementations from the block above.
    mockQueryOne.mockReset();
    mockExecute.mockReset();
  });

  it('refuses to link Google to an existing unverified row', async () => {
    mockQueryOne
      .mockResolvedValueOnce(null) // accounts lookup
      .mockResolvedValueOnce({ id: 'squat', email: 'v@x.com', password_hash: 'h', email_verified: false });

    await expect(
      findOrCreateOAuthUser('google', 'gid', 'v@x.com', undefined, undefined, undefined, undefined, null, true)
    ).rejects.toThrow(/unverified/);
    expect(mockExecute.mock.calls.some(([sql]) => /INSERT INTO accounts/.test(sql))).toBe(false);
  });

  it('refuses when Google does not assert email_verified', async () => {
    mockQueryOne.mockResolvedValueOnce(null); // accounts lookup

    await expect(
      findOrCreateOAuthUser('google', 'gid', 'v@x.com', undefined, undefined, undefined, undefined, null, false)
    ).rejects.toThrow(/did not verify/);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('links when both the row and Google are verified', async () => {
    mockQueryOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'u1', email: 'v@x.com', password_hash: 'h', email_verified: true })
      .mockResolvedValue({ id: 'u1', email: 'v@x.com', name: null, email_verified: true, created_at: new Date() });

    const user = await findOrCreateOAuthUser('google', 'gid', 'v@x.com', undefined, undefined, undefined, undefined, null, true);

    expect(user.id).toBe('u1');
    const link = mockExecute.mock.calls.find(([sql]) => /INSERT INTO accounts/.test(sql));
    expect(link![1][0]).toBe('u1');
  });
});
