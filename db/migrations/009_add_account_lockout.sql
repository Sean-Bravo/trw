-- Migration: Add account lockout columns (H-7)
-- Created: 2026-04-09
--
-- Adds per-account brute-force protection. IP-based rate limits alone
-- are bypassable via residential proxy rotation; per-account lockout
-- closes that gap.
--
-- See SECURITY_AUDIT.md §H-7

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS locked_until timestamptz;
