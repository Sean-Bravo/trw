/**
 * Tests for lib/api-keys.ts
 */

import {
  generateApiKey,
  hashApiKey,
  createApiKey,
  listApiKeys,
  revokeApiKey,
  renameApiKey,
  validateApiKey,
  getMonthlyUsage,
  getUsageHistory,
  updateKeyTier,
} from '@/lib/api-keys';

// Mock database module
jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  execute: jest.fn(),
}));

import { query, queryOne, execute } from '@/lib/db';

const mockQuery = query as jest.Mock;
const mockQueryOne = queryOne as jest.Mock;
const mockExecute = execute as jest.Mock;

describe('generateApiKey', () => {
  it('returns key with tf_live_ prefix followed by 32 hex chars', () => {
    const { key } = generateApiKey();
    expect(key).toMatch(/^tf_live_[0-9a-f]{32}$/);
  });

  it('returns prefix as first 8 chars of the hex', () => {
    const { key, prefix } = generateApiKey();
    const hex = key.replace('tf_live_', '');
    expect(prefix).toBe(hex.slice(0, 8));
  });

  it('returns a SHA-256 hash of the full key', () => {
    const { key, hash } = generateApiKey();
    expect(hash).toBe(hashApiKey(key));
  });

  it('generates unique keys on each call', () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();
    expect(key1.key).not.toBe(key2.key);
    expect(key1.hash).not.toBe(key2.hash);
  });
});

describe('hashApiKey', () => {
  it('returns consistent SHA-256 hash for same input', () => {
    const hash1 = hashApiKey('tf_live_test123');
    const hash2 = hashApiKey('tf_live_test123');
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns different hashes for different inputs', () => {
    const hash1 = hashApiKey('tf_live_aaa');
    const hash2 = hashApiKey('tf_live_bbb');
    expect(hash1).not.toBe(hash2);
  });
});

describe('createApiKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates key when under limit', async () => {
    mockQuery.mockResolvedValue([{ count: '2' }]);
    mockQueryOne.mockResolvedValue({ id: 'new-key-id' });

    const result = await createApiKey('user-1', 'My Key');

    expect(result.key).toMatch(/^tf_live_/);
    expect(result.id).toBe('new-key-id');
    expect(result.prefix).toHaveLength(8);
  });

  it('throws when at max key limit (5 active keys)', async () => {
    mockQuery.mockResolvedValue([{ count: '5' }]);

    await expect(createApiKey('user-1', 'Sixth Key')).rejects.toThrow(
      'Maximum of 5 active API keys allowed'
    );
  });

  it('inserts with starter tier defaults (rpm=30, quota=100)', async () => {
    mockQuery.mockResolvedValue([{ count: '0' }]);
    mockQueryOne.mockResolvedValue({ id: 'key-id' });

    await createApiKey('user-1', 'Test');

    const insertCall = mockQueryOne.mock.calls[0];
    const params = insertCall[1];
    // params: [userId, name, prefix, hash, tier, rate_limit_rpm, monthly_quota]
    expect(params[4]).toBe('starter');
    expect(params[5]).toBe(30); // rate_limit_rpm
    expect(params[6]).toBe(100); // monthly_quota
  });

  it('returns { key, id, prefix }', async () => {
    mockQuery.mockResolvedValue([{ count: '0' }]);
    mockQueryOne.mockResolvedValue({ id: 'key-abc' });

    const result = await createApiKey('user-1', 'Test');

    expect(result).toHaveProperty('key');
    expect(result).toHaveProperty('id', 'key-abc');
    expect(result).toHaveProperty('prefix');
  });

  it('throws when INSERT fails', async () => {
    mockQuery.mockResolvedValue([{ count: '0' }]);
    mockQueryOne.mockResolvedValue(null);

    await expect(createApiKey('user-1', 'Test')).rejects.toThrow(
      'Failed to create API key'
    );
  });
});

describe('listApiKeys', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls query with correct userId', async () => {
    mockQuery.mockResolvedValue([]);

    await listApiKeys('user-xyz');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1'),
      ['user-xyz']
    );
  });

  it('query does not select key_hash', async () => {
    mockQuery.mockResolvedValue([]);

    await listApiKeys('user-1');

    const sql = mockQuery.mock.calls[0][0];
    expect(sql).not.toContain('key_hash');
    expect(sql).toContain('ORDER BY created_at DESC');
  });
});

describe('revokeApiKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when key revoked (rowCount > 0)', async () => {
    mockExecute.mockResolvedValue({ rowCount: 1 });

    const result = await revokeApiKey('user-1', 'key-1');
    expect(result).toBe(true);
  });

  it('returns false when key not found (rowCount = 0)', async () => {
    mockExecute.mockResolvedValue({ rowCount: 0 });

    const result = await revokeApiKey('user-1', 'key-999');
    expect(result).toBe(false);
  });
});

describe('renameApiKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true on success', async () => {
    mockExecute.mockResolvedValue({ rowCount: 1 });

    const result = await renameApiKey('user-1', 'key-1', 'New Name');
    expect(result).toBe(true);
  });

  it('returns false when key not found', async () => {
    mockExecute.mockResolvedValue({ rowCount: 0 });

    const result = await renameApiKey('user-1', 'key-999', 'Name');
    expect(result).toBe(false);
  });
});

describe('validateApiKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecute.mockResolvedValue({ rowCount: 1 });
  });

  it('returns null for key not starting with tf_live_', async () => {
    const result = await validateApiKey('invalid_prefix_abc123');
    expect(result).toBeNull();
    expect(mockQueryOne).not.toHaveBeenCalled();
  });

  it('returns null when no matching active key found', async () => {
    mockQueryOne.mockResolvedValue(null);

    const result = await validateApiKey('tf_live_abc123');
    expect(result).toBeNull();
  });

  it('returns null when key is expired', async () => {
    const expiredKey = {
      id: 'key-1',
      is_active: true,
      expires_at: new Date('2020-01-01'),
    };
    mockQueryOne.mockResolvedValue(expiredKey);

    const result = await validateApiKey('tf_live_abc123');
    expect(result).toBeNull();
  });

  it('returns key record for valid key', async () => {
    const validKey = {
      id: 'key-1',
      is_active: true,
      expires_at: null,
      tier: 'starter',
    };
    mockQueryOne.mockResolvedValue(validKey);

    const result = await validateApiKey('tf_live_abc123');
    expect(result).toEqual(validKey);
  });

  it('updates last_used_at (fire-and-forget)', async () => {
    const validKey = { id: 'key-1', is_active: true, expires_at: null };
    mockQueryOne.mockResolvedValue(validKey);

    await validateApiKey('tf_live_abc123');

    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('last_used_at'),
      ['key-1']
    );
  });
});

describe('getMonthlyUsage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns fileCount and requestCount parsed from strings', async () => {
    mockQueryOne.mockResolvedValue({ file_count: '15', request_count: '42' });

    const result = await getMonthlyUsage('key-1');
    expect(result).toEqual({ fileCount: 15, requestCount: 42 });
  });

  it('returns zeros when no usage data', async () => {
    mockQueryOne.mockResolvedValue(null);

    const result = await getMonthlyUsage('key-1');
    expect(result).toEqual({ fileCount: 0, requestCount: 0 });
  });
});

describe('getUsageHistory', () => {
  it('returns usage records ordered by date', async () => {
    const records = [
      { usage_date: '2026-03-18', file_count: 5, request_count: 10 },
    ];
    mockQuery.mockResolvedValue(records);

    const result = await getUsageHistory('key-1');
    expect(result).toEqual(records);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY usage_date DESC'),
      ['key-1', 6]
    );
  });
});

describe('updateKeyTier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates tier with correct quota and rpm', async () => {
    mockExecute.mockResolvedValue({ rowCount: 1 });

    const result = await updateKeyTier('key-1', 'growth', 'sub_123');

    expect(result).toBe(true);
    const params = mockExecute.mock.calls[0][1];
    expect(params[0]).toBe('growth');
    expect(params[1]).toBe(500);   // monthly_quota
    expect(params[2]).toBe(60);    // rate_limit_rpm
    expect(params[3]).toBe('sub_123');
  });

  it('returns false when key not found', async () => {
    mockExecute.mockResolvedValue({ rowCount: 0 });

    const result = await updateKeyTier('key-999', 'starter');
    expect(result).toBe(false);
  });
});
