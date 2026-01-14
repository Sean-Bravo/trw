-- TaxFormatter Database Schema
-- Run this in Neon SQL Editor to create all tables

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;   -- case-insensitive emails

-- Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'upload_status') THEN
    CREATE TYPE upload_status AS ENUM ('pending','processing','parsed','failed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
    CREATE TYPE job_status AS ENUM ('queued','running','succeeded','failed','canceled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier') THEN
    CREATE TYPE subscription_tier AS ENUM ('free','pro','premium');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM (
      'active','trialing','past_due','canceled','paused'
    );
  END IF;
END$$;

-- 1. users: User accounts (id, email, password_hash, name, created_at)
CREATE TABLE IF NOT EXISTS users (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email            citext UNIQUE NOT NULL,
  password_hash    text,                  -- nullable for OAuth-only accounts
  name             text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- 2. accounts: OAuth provider links (Google, etc.)
CREATE TABLE IF NOT EXISTS accounts (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider               text NOT NULL,               -- e.g., 'google', 'github'
  provider_account_id    text NOT NULL,               -- subject/user id from provider
  access_token           text,
  refresh_token          text,
  expires_at             timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_account_id)
);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);

-- 3. subscriptions: Stripe subscription status (tier, stripe_customer_id)
CREATE TABLE IF NOT EXISTS subscriptions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  tier                   subscription_tier NOT NULL DEFAULT 'free',
  status                 subscription_status NOT NULL DEFAULT 'active',
  stripe_customer_id     text UNIQUE,
  stripe_subscription_id text UNIQUE,
  current_period_end     timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- 4. uploads: CSV file metadata (filename, s3_key, status)
CREATE TABLE IF NOT EXISTS uploads (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename         text NOT NULL,
  s3_key           text NOT NULL UNIQUE,
  status           upload_status NOT NULL DEFAULT 'pending',
  file_size        bigint,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON uploads(user_id);

-- 5. jobs: Processing jobs (upload_id, status, result)
CREATE TABLE IF NOT EXISTS jobs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id        uuid NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  status           job_status NOT NULL DEFAULT 'queued',
  result           jsonb,          -- structured output from processing
  error            text,
  retry_count      integer NOT NULL DEFAULT 0,
  last_retry_at    timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  started_at       timestamptz,
  finished_at      timestamptz
);
CREATE INDEX IF NOT EXISTS idx_jobs_upload_id ON jobs(upload_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- 6. transactions: Parsed CSV transactions (for pro features)
CREATE TABLE IF NOT EXISTS transactions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  upload_id        uuid REFERENCES uploads(id) ON DELETE SET NULL,
  posted_at        date NOT NULL,
  description      text NOT NULL,
  amount_cents     integer NOT NULL,
  currency         char(3) NOT NULL DEFAULT 'USD',
  merchant         text,
  category         text,
  raw              jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT currency_uc CHECK (currency ~ '^[A-Z]{3}$')
);
-- Prevent obvious duplicates from the same upload
CREATE UNIQUE INDEX IF NOT EXISTS ux_transactions_dedup
  ON transactions(user_id, COALESCE(upload_id, '00000000-0000-0000-0000-000000000000'::uuid), description, posted_at, amount_cents);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, posted_at);

-- 7. ai_cache: Cached AI categorizations
CREATE TABLE IF NOT EXISTS ai_cache (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key              text NOT NULL,      -- e.g., normalized "description|amount" fingerprint
  model            text NOT NULL,      -- e.g., 'gpt-4o-mini'
  result           jsonb NOT NULL,     -- e.g., {category: "...", confidence: 0.93}
  expires_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key, model)
);
CREATE INDEX IF NOT EXISTS idx_ai_cache_user_key ON ai_cache(user_id, key);

-- Trigger to keep uploads.updated_at fresh
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_uploads_updated_at ON uploads;
CREATE TRIGGER trg_uploads_updated_at
BEFORE UPDATE ON uploads
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
