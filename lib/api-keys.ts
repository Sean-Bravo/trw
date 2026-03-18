import { randomBytes, createHash } from 'crypto';
import { query, queryOne, execute } from './db';

// --- Types ---

export type ApiTier = 'free' | 'starter' | 'growth' | 'business';

export interface DbApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  tier: ApiTier;
  is_active: boolean;
  rate_limit_rpm: number;
  monthly_quota: number;
  stripe_subscription_id: string | null;
  last_used_at: Date | null;
  expires_at: Date | null;
  created_at: Date;
}

export interface DbApiUsage {
  id: string;
  api_key_id: string;
  usage_date: Date;
  request_count: number;
  file_count: number;
  bytes_processed: number;
  created_at: Date;
}

export const API_TIERS = {
  free:     { monthly_quota: 10,   rate_limit_rpm: 10,  price: 0 },
  starter:  { monthly_quota: 100,  rate_limit_rpm: 30,  price: 29 },
  growth:   { monthly_quota: 500,  rate_limit_rpm: 60,  price: 99 },
  business: { monthly_quota: 2000, rate_limit_rpm: 120, price: 249 },
} as const;

const MAX_KEYS_PER_USER = 5;

// --- Key Generation ---

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const hex = randomBytes(16).toString('hex'); // 32 hex chars
  const key = `tf_live_${hex}`;
  const prefix = hex.slice(0, 8);
  const hash = hashApiKey(key);
  return { key, prefix, hash };
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

// --- CRUD Operations ---

export async function createApiKey(
  userId: string,
  name: string
): Promise<{ key: string; id: string; prefix: string }> {
  // Check key count
  const existing = await query<{ count: string }>(
    'SELECT COUNT(*)::text as count FROM api_keys WHERE user_id = $1 AND is_active = true',
    [userId]
  );
  const count = parseInt(existing[0]?.count ?? '0', 10);
  if (count >= MAX_KEYS_PER_USER) {
    throw new Error(`Maximum of ${MAX_KEYS_PER_USER} active API keys allowed`);
  }

  const { key, prefix, hash } = generateApiKey();
  const tier: ApiTier = 'free';
  const tierConfig = API_TIERS[tier];

  const result = await queryOne<{ id: string }>(
    `INSERT INTO api_keys (user_id, name, key_prefix, key_hash, tier, rate_limit_rpm, monthly_quota)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [userId, name, prefix, hash, tier, tierConfig.rate_limit_rpm, tierConfig.monthly_quota]
  );

  if (!result) {
    throw new Error('Failed to create API key');
  }

  return { key, id: result.id, prefix };
}

export async function listApiKeys(userId: string): Promise<Omit<DbApiKey, 'key_hash'>[]> {
  return query<Omit<DbApiKey, 'key_hash'>>(
    `SELECT id, user_id, name, key_prefix, tier, is_active, rate_limit_rpm, monthly_quota,
            stripe_subscription_id, last_used_at, expires_at, created_at
     FROM api_keys
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
}

export async function revokeApiKey(userId: string, keyId: string): Promise<boolean> {
  const result = await execute(
    'UPDATE api_keys SET is_active = false WHERE id = $1 AND user_id = $2 AND is_active = true',
    [keyId, userId]
  );
  return result.rowCount > 0;
}

export async function renameApiKey(userId: string, keyId: string, name: string): Promise<boolean> {
  const result = await execute(
    'UPDATE api_keys SET name = $1 WHERE id = $2 AND user_id = $3',
    [name, keyId, userId]
  );
  return result.rowCount > 0;
}

export async function validateApiKey(keyPlaintext: string): Promise<DbApiKey | null> {
  if (!keyPlaintext.startsWith('tf_live_')) {
    return null;
  }
  const hash = hashApiKey(keyPlaintext);
  const key = await queryOne<DbApiKey>(
    `SELECT * FROM api_keys WHERE key_hash = $1 AND is_active = true`,
    [hash]
  );
  if (!key) return null;
  if (key.expires_at && new Date(key.expires_at) < new Date()) return null;

  // Update last_used_at (fire and forget)
  execute('UPDATE api_keys SET last_used_at = now() WHERE id = $1', [key.id]).catch(() => {});

  return key;
}

// --- Usage ---

export async function getMonthlyUsage(apiKeyId: string): Promise<{ fileCount: number; requestCount: number }> {
  const result = await queryOne<{ file_count: string; request_count: string }>(
    `SELECT COALESCE(SUM(file_count), 0)::text as file_count,
            COALESCE(SUM(request_count), 0)::text as request_count
     FROM api_usage
     WHERE api_key_id = $1
       AND usage_date >= date_trunc('month', CURRENT_DATE)`,
    [apiKeyId]
  );
  return {
    fileCount: parseInt(result?.file_count ?? '0', 10),
    requestCount: parseInt(result?.request_count ?? '0', 10),
  };
}

export async function getUsageHistory(apiKeyId: string, months: number = 6): Promise<DbApiUsage[]> {
  return query<DbApiUsage>(
    `SELECT * FROM api_usage
     WHERE api_key_id = $1
       AND usage_date >= (CURRENT_DATE - ($2 || ' months')::interval)
     ORDER BY usage_date DESC`,
    [apiKeyId, months]
  );
}

// --- Tier Management ---

export async function updateKeyTier(
  keyId: string,
  tier: ApiTier,
  stripeSubscriptionId?: string
): Promise<boolean> {
  const tierConfig = API_TIERS[tier];
  const result = await execute(
    `UPDATE api_keys
     SET tier = $1, monthly_quota = $2, rate_limit_rpm = $3, stripe_subscription_id = $4
     WHERE id = $5`,
    [tier, tierConfig.monthly_quota, tierConfig.rate_limit_rpm, stripeSubscriptionId ?? null, keyId]
  );
  return result.rowCount > 0;
}
