import { neon } from '@neondatabase/serverless';
import type { NeonQueryFunction } from '@neondatabase/serverless';

// Get the database URL from environment
const getDatabaseUrl = () => {
  const url = process.env['NEON_DATABASE_URL'] || process.env['DATABASE_URL'];
  if (!url) {
    throw new Error('NEON_DATABASE_URL or DATABASE_URL environment variable is required');
  }
  return url;
};

// Lazy-initialized SQL client to avoid build-time connection
let _sql: NeonQueryFunction<false, false> | null = null;

const getSql = () => {
  if (!_sql) {
    _sql = neon(getDatabaseUrl());
  }
  return _sql;
};

// Type-safe query helper with error handling
// Uses sql.query() for parameterized queries with $1, $2, etc. placeholders
export async function query<T = unknown>(
  queryText: string,
  params?: unknown[]
): Promise<T[]> {
  try {
    const sql = getSql();
    const result = await sql.query(queryText, params ?? []);
    return result as T[];
  } catch (error) {
    console.error('[DB Error]', error);
    throw error;
  }
}

// Single row helper
export async function queryOne<T = unknown>(
  queryText: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(queryText, params);
  return rows[0] || null;
}

// Execute helper for inserts/updates that return affected rows
export async function execute(
  queryText: string,
  params?: unknown[]
): Promise<{ rowCount: number }> {
  try {
    const sql = getSql();
    const result = await sql.query(queryText, params ?? []);
    return { rowCount: Array.isArray(result) ? result.length : 0 };
  } catch (error) {
    console.error('[DB Error]', error);
    throw error;
  }
}

// Transaction helper using Neon's HTTP approach
// Note: For true transactions, use @neondatabase/serverless with WebSocket
export async function transaction<T>(
  callback: (sql: typeof query) => Promise<T>
): Promise<T> {
  // For HTTP connections, we execute queries sequentially
  // True ACID transactions require WebSocket connection
  return callback(query);
}

// User types
export interface DbUser {
  id: string;
  email: string;
  password_hash: string | null;
  name: string | null;
  email_verified: boolean;
  verification_code: string | null;
  verification_code_expires: Date | null;
  created_at: Date;
}

export interface DbAccount {
  id: string;
  user_id: string;
  provider: string;
  provider_account_id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: Date | null;
  created_at: Date;
}

export interface DbSubscription {
  id: string;
  user_id: string;
  tier: 'free' | 'pro' | 'premium';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: Date | null;
  created_at: Date;
}

export interface DbUpload {
  id: string;
  user_id: string;
  filename: string;
  s3_key: string;
  status: 'pending' | 'processing' | 'parsed' | 'failed';
  file_size: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface DbJob {
  id: string;
  upload_id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';
  result: Record<string, unknown> | null;
  error: string | null;
  created_at: Date;
  started_at: Date | null;
  finished_at: Date | null;
}

export interface DbTransaction {
  id: string;
  user_id: string;
  upload_id: string | null;
  posted_at: Date;
  description: string;
  amount_cents: number;
  currency: string;
  merchant: string | null;
  category: string | null;
  raw: Record<string, unknown> | null;
  created_at: Date;
}

export interface DbAiCache {
  id: string;
  user_id: string;
  key: string;
  model: string;
  result: Record<string, unknown>;
  expires_at: Date | null;
  created_at: Date;
}
