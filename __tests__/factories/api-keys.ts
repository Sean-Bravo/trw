// Simple factories for API key tests (no external dependencies to avoid ESM issues)

let idCounter = 0;
const generateId = () => `test-key-${Date.now()}-${++idCounter}`;
const generateHex = (len: number) => {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < len; i++) result += chars[Math.floor(Math.random() * 16)];
  return result;
};

export interface MockApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  tier: 'free' | 'starter' | 'growth' | 'business';
  is_active: boolean;
  rate_limit_rpm: number;
  monthly_quota: number;
  stripe_subscription_id: string | null;
  last_used_at: Date | null;
  expires_at: Date | null;
  created_at: Date;
}

export interface MockApiUsage {
  id: string;
  api_key_id: string;
  usage_date: Date;
  request_count: number;
  file_count: number;
  bytes_processed: number;
  created_at: Date;
}

const TIER_DEFAULTS = {
  free: { monthly_quota: 10, rate_limit_rpm: 10 },
  starter: { monthly_quota: 100, rate_limit_rpm: 30 },
  growth: { monthly_quota: 500, rate_limit_rpm: 60 },
  business: { monthly_quota: 2000, rate_limit_rpm: 120 },
} as const;

export const createMockApiKey = (overrides?: Partial<MockApiKey>): MockApiKey => {
  const tier = overrides?.tier ?? 'free';
  const defaults = TIER_DEFAULTS[tier];
  return {
    id: generateId(),
    user_id: `user-${generateHex(8)}`,
    name: `API Key ${idCounter}`,
    key_prefix: generateHex(8),
    key_hash: generateHex(64),
    tier,
    is_active: true,
    rate_limit_rpm: defaults.rate_limit_rpm,
    monthly_quota: defaults.monthly_quota,
    stripe_subscription_id: null,
    last_used_at: null,
    expires_at: null,
    created_at: new Date(),
    ...overrides,
  };
};

export const createMockApiUsage = (overrides?: Partial<MockApiUsage>): MockApiUsage => ({
  id: generateId(),
  api_key_id: `key-${generateHex(8)}`,
  usage_date: new Date(),
  request_count: 5,
  file_count: 3,
  bytes_processed: 50000,
  created_at: new Date(),
  ...overrides,
});

export const createMockApiKeys = (count: number): MockApiKey[] =>
  Array.from({ length: count }, () => createMockApiKey());
