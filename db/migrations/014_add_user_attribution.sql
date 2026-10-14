-- ============================================================================
-- Migration 014: Acquisition attribution on users
-- ============================================================================
--
-- Created:        2026-10-14
-- Companion code: lib/attribution.ts, lib/auth-db.ts (createUser,
--                 findOrCreateOAuthUser), app/api/auth/register/route.ts,
--                 app/api/auth/[...nextauth]/route.ts
-- Affected tables: users
-- Estimated runtime: <1 second on current data volume
-- Reversible: yes (see ROLLBACK section at bottom)
--
-- ----------------------------------------------------------------------------
-- WHY
-- ----------------------------------------------------------------------------
-- The Nov 2 review reads activation and repeat use per funnel — developer
-- vs bank/accountant — and per acquisition source. The first-touch cookie
-- (tf_attr, 30 days) carries that; signup copies it onto the user so Neon
-- can join it to keys, uploads and payments. Existing users keep NULLs
-- (unknown), which the review treats as "pre-attribution".
--
-- No personal data: utm values, a referrer host or "direct", the landing
-- path and the funnel name.
-- ----------------------------------------------------------------------------

ALTER TABLE users ADD COLUMN IF NOT EXISTS acquisition_source   text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS acquisition_medium   text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS acquisition_campaign text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS acquisition_landing  text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS funnel               text
  CHECK (funnel IS NULL OR funnel IN ('bank', 'developer'));

COMMENT ON COLUMN users.funnel IS 'First-touch funnel: bank (bank-statement pages) or developer (everything else). NULL = signed up before attribution existed.';
COMMENT ON COLUMN users.acquisition_source IS 'utm_source, else referrer host, else direct. First touch, 30-day cookie.';

CREATE INDEX IF NOT EXISTS idx_users_funnel_created ON users(funnel, created_at);

-- ----------------------------------------------------------------------------
-- ROLLBACK
-- ----------------------------------------------------------------------------
-- DROP INDEX IF EXISTS idx_users_funnel_created;
-- ALTER TABLE users DROP COLUMN IF EXISTS funnel;
-- ALTER TABLE users DROP COLUMN IF EXISTS acquisition_landing;
-- ALTER TABLE users DROP COLUMN IF EXISTS acquisition_campaign;
-- ALTER TABLE users DROP COLUMN IF EXISTS acquisition_medium;
-- ALTER TABLE users DROP COLUMN IF EXISTS acquisition_source;
