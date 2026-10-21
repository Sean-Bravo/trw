-- ============================================================================
-- Migration 019: api_usage belongs to the user and survives key deletion
-- ============================================================================
--
-- Created:        2026-10-21
-- Companion code: backend/services/api_auth.py (check_monthly_quota),
--                 backend/handlers/api.py, lib/api-keys.ts (deleteApiKey)
-- Affected tables: api_usage
-- Estimated runtime: <1 second on current data volume
-- Reversible: yes (see ROLLBACK section at bottom)
--
-- ----------------------------------------------------------------------------
-- WHY
-- ----------------------------------------------------------------------------
-- Oct 17 security report issue #8: the free monthly quota was counted per
-- key, and api_usage.api_key_id cascaded on delete. Revoking the free key,
-- permanently deleting it and creating a new one gave a fresh 25 files, as
-- often as you liked.
--
-- Now every usage row carries the key owner's user_id, the quota check sums
-- by user, and deleting a key only detaches its rows (api_key_id → NULL), so
-- the month's usage stays counted against the user.
--
-- user_id is filled by a trigger from api_keys rather than by the Lambda, so
-- the API Lambda that is live when this is applied (which does not send
-- user_id) keeps recording usage without a gap. The UNIQUE
-- (api_key_id, usage_date) upsert target is unchanged; detached rows have a
-- NULL api_key_id, which never conflicts.
--
-- Deploy order: apply this BEFORE deploying the Lambdas. The new quota check
-- reads api_usage.user_id.
-- ----------------------------------------------------------------------------

ALTER TABLE api_usage
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE CASCADE;

UPDATE api_usage u
   SET user_id = k.user_id
  FROM api_keys k
 WHERE k.id = u.api_key_id
   AND u.user_id IS NULL;

CREATE OR REPLACE FUNCTION api_usage_set_user_id() RETURNS trigger AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    SELECT user_id INTO NEW.user_id FROM api_keys WHERE id = NEW.api_key_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS api_usage_set_user_id ON api_usage;
CREATE TRIGGER api_usage_set_user_id
  BEFORE INSERT ON api_usage
  FOR EACH ROW EXECUTE FUNCTION api_usage_set_user_id();

ALTER TABLE api_usage ALTER COLUMN user_id SET NOT NULL;

-- Deleting a key keeps its usage rows, detached from the key. The cascading
-- FK is dropped by catalog lookup rather than by its expected name, so a
-- differently named constraint cannot survive and keep cascading.
ALTER TABLE api_usage ALTER COLUMN api_key_id DROP NOT NULL;
DO $$
DECLARE c text;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
            WHERE conrelid = 'api_usage'::regclass
              AND confrelid = 'api_keys'::regclass
              AND contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE api_usage DROP CONSTRAINT %I', c);
  END LOOP;
END $$;
ALTER TABLE api_usage
  ADD CONSTRAINT api_usage_api_key_id_fkey
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_api_usage_user_date ON api_usage(user_id, usage_date);

-- ----------------------------------------------------------------------------
-- ROLLBACK
-- ----------------------------------------------------------------------------
-- Roll the Lambdas back first: the new quota check reads user_id.
-- DELETE FROM api_usage WHERE api_key_id IS NULL;
-- ALTER TABLE api_usage DROP CONSTRAINT api_usage_api_key_id_fkey;
-- ALTER TABLE api_usage
--   ADD CONSTRAINT api_usage_api_key_id_fkey
--   FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE;
-- ALTER TABLE api_usage ALTER COLUMN api_key_id SET NOT NULL;
-- DROP INDEX IF EXISTS idx_api_usage_user_date;
-- DROP TRIGGER IF EXISTS api_usage_set_user_id ON api_usage;
-- DROP FUNCTION IF EXISTS api_usage_set_user_id();
-- ALTER TABLE api_usage DROP COLUMN IF EXISTS user_id;
