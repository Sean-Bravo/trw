-- ============================================================================
-- Migration 016: Single-use 2FA login token on users
-- ============================================================================
--
-- Created:        2026-10-17
-- Companion code: lib/auth-db.ts (createTwoFactorLoginToken,
--                 consumeTwoFactorLoginToken, authorizeCredentials),
--                 app/api/auth/2fa/login-verify/route.ts,
--                 app/api/auth/[...nextauth]/route.ts, app/login/2fa/page.tsx
-- Affected tables: users
-- Estimated runtime: <1 second on current data volume
-- Reversible: yes (see ROLLBACK section at bottom)
--
-- ----------------------------------------------------------------------------
-- WHY
-- ----------------------------------------------------------------------------
-- Oct 16 security scan F30: 2FA was enforced only in the browser. A direct
-- POST to /api/auth/callback/credentials with email + password got a full
-- session without a second factor. Now login-verify, after a correct code,
-- writes the SHA-256 of a random token here (2-minute expiry) and returns
-- the raw token; the NextAuth credentials authorize() refuses a 2FA user
-- unless it gets that token, and clears it on use. Only the hash is stored.
--
-- Deploy order: apply this BEFORE the code ships. Without the columns,
-- login-verify fails with 'column does not exist' for every 2FA user.
-- ----------------------------------------------------------------------------

ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_login_token_hash    text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_login_token_expires timestamptz;

COMMENT ON COLUMN users.two_factor_login_token_hash IS 'SHA-256 hex of the single-use token login-verify returns after a correct 2FA code; consumed by NextAuth authorize().';

-- ----------------------------------------------------------------------------
-- ROLLBACK
-- ----------------------------------------------------------------------------
-- ALTER TABLE users DROP COLUMN IF EXISTS two_factor_login_token_expires;
-- ALTER TABLE users DROP COLUMN IF EXISTS two_factor_login_token_hash;
