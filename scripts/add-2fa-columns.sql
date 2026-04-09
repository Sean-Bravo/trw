-- DEPRECATED: superseded by db/migrations/010_add_auth_columns.sql (H-12)
-- This file is kept for git history only. Run the consolidated migration
-- in /db/migrations/ instead. See SECURITY_AUDIT.md §H-12.
--
-- Migration: Add 2FA columns to users table

ALTER TABLE users
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS backup_codes TEXT[];

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_two_factor_enabled ON users(two_factor_enabled) WHERE two_factor_enabled = TRUE;
