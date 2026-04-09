-- DEPRECATED: superseded by db/migrations/010_add_auth_columns.sql (H-12)
-- This file is kept for git history only. Run the consolidated migration
-- in /db/migrations/ instead. See SECURITY_AUDIT.md §H-12.
--
-- Migration: Add email-based 2FA login code columns to users table

ALTER TABLE users
ADD COLUMN IF NOT EXISTS two_factor_login_code VARCHAR(6),
ADD COLUMN IF NOT EXISTS two_factor_login_code_expires TIMESTAMP WITH TIME ZONE;

-- Index for faster lookups during 2FA verification
CREATE INDEX IF NOT EXISTS idx_users_two_factor_login_code ON users(two_factor_login_code) WHERE two_factor_login_code IS NOT NULL;
