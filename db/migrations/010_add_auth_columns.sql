-- Migration: Consolidate all auth columns referenced by lib/auth-db.ts (H-12)
-- Created: 2026-04-09
--
-- Audit found that several columns referenced in code only exist in
-- standalone scripts under /scripts (add-verification-columns.sql,
-- add-2fa-columns.sql, add-2fa-email-columns.sql) — NOT in the sequenced
-- /db/migrations/ directory. A fresh bootstrap from /db/migrations alone
-- would miss them and break login/signup/reset/2FA flows.
--
-- Reset-token columns were missing entirely from both locations, so any
-- call to forgotPassword() against a fresh DB would throw
-- 'column "reset_token" does not exist'.
--
-- This migration consolidates all of them. IF NOT EXISTS makes it
-- idempotent: safe to run against a DB where the standalone scripts
-- have already been applied.
--
-- See SECURITY_AUDIT.md §H-12

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_code varchar(6),
  ADD COLUMN IF NOT EXISTS verification_code_expires timestamptz,
  ADD COLUMN IF NOT EXISTS reset_token text,
  ADD COLUMN IF NOT EXISTS reset_token_expires timestamptz,
  ADD COLUMN IF NOT EXISTS two_factor_secret text,
  ADD COLUMN IF NOT EXISTS two_factor_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS two_factor_login_code varchar(6),
  ADD COLUMN IF NOT EXISTS two_factor_login_code_expires timestamptz,
  ADD COLUMN IF NOT EXISTS backup_codes text[];

-- Partial indexes (only index rows that have a value, keeps the index small)
CREATE INDEX IF NOT EXISTS idx_users_reset_token
  ON users (reset_token) WHERE reset_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_verification_code
  ON users (verification_code) WHERE verification_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_two_factor_login_code
  ON users (two_factor_login_code) WHERE two_factor_login_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_two_factor_enabled
  ON users (two_factor_enabled) WHERE two_factor_enabled = TRUE;
