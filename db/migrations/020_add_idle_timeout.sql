-- ============================================================================
-- Migration 020: per-user automatic sign-out after inactivity
-- ============================================================================
--
-- Created:        2026-10-24
-- Companion code: lib/idle-timeout.ts, lib/auth-db.ts (idle timeout getters),
--                 app/api/auth/[...nextauth]/route.ts (jwt/session callbacks),
--                 app/api/account/idle-timeout/route.ts
-- Affected tables: users
-- Estimated runtime: <1 second on current data volume
-- Reversible: yes (see ROLLBACK section at bottom)
--
-- ----------------------------------------------------------------------------
-- WHY
-- ----------------------------------------------------------------------------
-- Sessions are 7-day JWTs with no inactivity limit, so anyone using the same
-- device within a week was still signed in to someone's tax records. Each
-- user now has an idle limit in minutes: 30 by default (NIST SP 800-63B AAL2),
-- or 15, 60, 240, or 0 = never (the 7-day session limit still applies).
--
-- Deploy order: apply this BEFORE the Vercel deploy that reads the column.
-- Existing users get the 30-minute default; nobody is signed out by applying
-- it (the limit counts from each session's next request).
--
-- ----------------------------------------------------------------------------

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS idle_timeout_minutes integer NOT NULL DEFAULT 30;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_idle_timeout_minutes_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_idle_timeout_minutes_check
      CHECK (idle_timeout_minutes IN (0, 15, 30, 60, 240));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- VERIFY
-- ----------------------------------------------------------------------------
-- SELECT idle_timeout_minutes, count(*) FROM users GROUP BY 1;  -- all 30

-- ----------------------------------------------------------------------------
-- ROLLBACK
-- ----------------------------------------------------------------------------
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_idle_timeout_minutes_check;
-- ALTER TABLE users DROP COLUMN IF EXISTS idle_timeout_minutes;
