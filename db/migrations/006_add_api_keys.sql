-- Migration: Add API key management tables for developer API
-- Created: 2026-03-18

-- API tier enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'api_tier') THEN
    CREATE TYPE api_tier AS ENUM ('free', 'starter', 'growth', 'business');
  END IF;
END$$;

-- API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             text NOT NULL,
  key_prefix       text NOT NULL,           -- first 8 chars after "tf_live_", for display
  key_hash         text NOT NULL UNIQUE,    -- SHA-256 hash of the full key
  tier             api_tier NOT NULL DEFAULT 'free',
  is_active        boolean NOT NULL DEFAULT true,
  rate_limit_rpm   integer NOT NULL DEFAULT 10,
  monthly_quota    integer NOT NULL DEFAULT 10,
  stripe_subscription_id text,
  last_used_at     timestamptz,
  expires_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- API usage tracking (daily rollup per key)
CREATE TABLE IF NOT EXISTS api_usage (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id       uuid NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  usage_date       date NOT NULL DEFAULT CURRENT_DATE,
  request_count    integer NOT NULL DEFAULT 0,
  file_count       integer NOT NULL DEFAULT 0,
  bytes_processed  bigint NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (api_key_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_api_usage_key_date ON api_usage(api_key_id, usage_date);

-- API request log (per-request, for debugging and analytics)
CREATE TABLE IF NOT EXISTS api_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id       uuid NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint         text NOT NULL,
  method           text NOT NULL,
  status_code      integer NOT NULL,
  response_time_ms integer,
  error_code       text,
  file_size        integer,
  source_type      text,                   -- "bank_statement" or "crypto_exchange"
  detected_source  text,                   -- e.g. "coinbase", "chase"
  transaction_count integer,
  ip_address       text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_requests_key_created ON api_requests(api_key_id, created_at);
