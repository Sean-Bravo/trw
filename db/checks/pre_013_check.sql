-- ============================================================================
-- Pre-flight check for migration 013 (api_keys_one_active_free_per_user)
-- ============================================================================
--
-- WHY THIS EXISTS
--
-- Migration 013 adds a partial unique index that enforces "one active free
-- key per user." If existing rows already violate that rule (a race or a
-- pre-013 bug), `CREATE UNIQUE INDEX` will fail mid-migration. The columns
-- it adds (deactivated_reason, deactivated_at) WILL still be created, but
-- the index won't, and the migration won't be in a clean state.
--
-- This file is NOT a migration. Run it against the target DB BEFORE applying
-- 013. If STEP 1 returns 0 rows, you're safe to apply 013 as-written. If it
-- returns any rows, run STEP 2 to clean up the duplicates first.
--
-- Usage:
--   psql "$DATABASE_URL" -f db/checks/pre_013_check.sql
--
-- ============================================================================


-- ----------------------------------------------------------------------------
-- STEP 1: Detect users with multiple active free keys
-- ----------------------------------------------------------------------------
-- Expected on a healthy DB: 0 rows.
\echo '=== STEP 1: Users with duplicate active free keys ==='
SELECT user_id, COUNT(*) AS active_free_count
  FROM api_keys
 WHERE tier = 'free' AND is_active = true
 GROUP BY user_id
HAVING COUNT(*) > 1
 ORDER BY active_free_count DESC, user_id;


-- ----------------------------------------------------------------------------
-- STEP 2: Cleanup template (DO NOT RUN until 013's columns exist)
-- ----------------------------------------------------------------------------
-- The deactivated_reason and deactivated_at columns are added by 013. If
-- STEP 1 finds duplicates, the right deploy order becomes:
--
--   1. Apply ONLY the ALTER TABLE portion of 013 (just the column adds).
--   2. Run the cleanup below for each user_id flagged in STEP 1.
--   3. Apply the CREATE UNIQUE INDEX portion of 013.
--
-- Splitting 013 into two transactions for that deploy is safer than letting
-- the unique-index step fail and roll back partial work.
--
-- Cleanup keeps the most-recently-created free key per user and deactivates
-- the rest, with a clear reason so dashboard render distinguishes this from
-- the downgrade flow:
--
-- BEGIN;
--   UPDATE api_keys
--      SET is_active          = false,
--          deactivated_at     = NOW(),
--          deactivated_reason = 'duplicate_cleanup_pre_013'
--    WHERE tier = 'free'
--      AND is_active = true
--      AND id NOT IN (
--        SELECT DISTINCT ON (user_id) id
--          FROM api_keys
--         WHERE tier = 'free' AND is_active = true
--         ORDER BY user_id, created_at DESC
--      );
--   -- Sanity-check: STEP 1's query should now return 0 rows.
-- COMMIT;
--
-- After cleanup, run STEP 1 once more inside the same session to confirm
-- 0 rows. THEN apply CREATE UNIQUE INDEX.
--
-- ============================================================================
