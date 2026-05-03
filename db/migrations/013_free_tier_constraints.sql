-- ============================================================================
-- Migration 013: Free tier constraints (one-active-free-key + deactivation provenance)
-- ============================================================================
--
-- Created:        2026-05-03
-- Companion docs: docs/PLAN_FREE_TIER_V3.md
-- Affected tables: api_keys
-- Estimated runtime: <1 second on current data volume
-- Reversible: yes (see ROLLBACK section at bottom)
--
-- ----------------------------------------------------------------------------
-- WHY
-- ----------------------------------------------------------------------------
--
-- Two structural guards for the Free tier rollout:
--
-- 1. ONE-ACTIVE-FREE-KEY-PER-USER (D2)
--    Free signups are auto-provisioned with a single API key. Without a
--    DB-level guard, a race (two verify requests, retry storm, or the
--    Stripe-webhook downgrade colliding with an existing free key) could
--    leave a user with multiple active free keys, doubling their effective
--    free quota and breaking the "1 free key" promise. The partial unique
--    index makes this impossible at the DB level. The app-level check in
--    lib/api-keys.ts:createApiKey is for the user-facing error message.
--
-- 2. DEACTIVATION PROVENANCE (D6)
--    When a paid sub is canceled, the webhook downgrades the canceled key
--    to 'free'. If the user already had a free key, the webhook deactivates
--    that pre-existing free key so the unique index above doesn't trip. The
--    user has no way to know why their formerly-named free key suddenly
--    stopped working. These two columns let the dashboard render an
--    explanation: "Deactivated [date] when [paid key name] was downgraded
--    to Free." Generic deactivation (user clicks "Deactivate" themselves)
--    leaves both columns NULL — no regression.
--
-- ============================================================================


-- ----------------------------------------------------------------------------
-- STEP 1: Partial unique index — one active free key per user (D2)
-- ----------------------------------------------------------------------------
-- The index is partial because non-free keys are capped at 5 per user via
-- application logic (MAX_KEYS_PER_USER), and inactive keys don't count
-- toward either cap.
CREATE UNIQUE INDEX IF NOT EXISTS api_keys_one_active_free_per_user
  ON api_keys (user_id)
  WHERE tier = 'free' AND is_active = true;


-- ----------------------------------------------------------------------------
-- STEP 2: Deactivation provenance columns (D6)
-- ----------------------------------------------------------------------------
-- Both columns are nullable. NULL means "deactivated by user action" (or
-- never deactivated). Non-NULL deactivated_reason is an opaque string the
-- application interprets; today the only producer is the Stripe webhook
-- which writes 'downgraded_replaced_by:<paid_key_id>'. Future producers
-- (e.g., admin revocation) can use other reason codes without a schema
-- change.
ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS deactivated_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ NULL;


-- ============================================================================
-- VERIFICATION (run these manually after the migration)
-- ============================================================================
--
-- 1. Index exists:
--
--    SELECT indexname FROM pg_indexes
--     WHERE tablename = 'api_keys'
--       AND indexname = 'api_keys_one_active_free_per_user';
--    -- expect: 1 row
--
-- 2. Columns exist:
--
--    SELECT column_name, data_type, is_nullable
--      FROM information_schema.columns
--     WHERE table_name = 'api_keys'
--       AND column_name IN ('deactivated_reason', 'deactivated_at');
--    -- expect: 2 rows, both nullable
--
-- 3. Index actually rejects duplicate active free keys:
--
--    -- (Setup) Pick a test user with no active free key.
--    -- (Test) Insert two free keys for that user; the second should ERROR
--    --        with: duplicate key value violates unique constraint
--    --        "api_keys_one_active_free_per_user"
--
-- ============================================================================
-- ROLLBACK
-- ============================================================================
--
--    DROP INDEX IF EXISTS api_keys_one_active_free_per_user;
--    ALTER TABLE api_keys
--      DROP COLUMN IF EXISTS deactivated_reason,
--      DROP COLUMN IF EXISTS deactivated_at;
--
-- Dropping the columns is destructive (reason metadata for any deactivated
-- keys is lost). The dashboard explanation note simply stops rendering.
--
-- ============================================================================
