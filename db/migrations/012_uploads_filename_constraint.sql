-- ============================================================================
-- Migration 012: Prevent UUID-shaped filenames in uploads + bank_jobs
-- ============================================================================
--
-- Created:        2026-04-10
-- Author:         Sean (paired with Claude)
-- Companion docs: docs/UPLOADS_FILENAME_FIX.md
-- Related code:   commit 2ff5a9c (app fix), commit 9b03e13 (this migration v2)
-- Affected tables: uploads, bank_jobs
-- Estimated runtime: <1 second on current data volume
-- Reversible: yes (see ROLLBACK section at bottom)
--
-- ----------------------------------------------------------------------------
-- THE STORY
-- ----------------------------------------------------------------------------
--
-- A bookkeeper-focused review of the dashboard surfaced an unusable file
-- entry: instead of "Smith LLC - January 2026.csv", processing history
-- showed a raw UUID like "23e8c130-bdb2-5eab-...". For a multi-client
-- workflow that's a real friction point — you can't tell which file is
-- which.
--
-- Root cause: the crypto upload confirm route
-- (app/api/uploads/[uploadId]/confirm/route.ts) used to parse the
-- filename out of the S3 key path:
--
--     const s3KeyParts = uploadId.split('/');
--     const filename = s3KeyParts.length >= 3
--                        ? s3KeyParts.slice(2).join('/')
--                        : 'Unknown file';
--
-- That works when the key looks like uploads/{jobId}/{filename}.
-- When the path lost its third segment (or — as we discovered later —
-- when an even older code path stored the jobId UUID in the third
-- segment too), the stored filename became a UUID slice and the
-- dashboard rendered garbage.
--
-- ----------------------------------------------------------------------------
-- THE FIX (two parts)
-- ----------------------------------------------------------------------------
--
-- 1. APPLICATION (commit 2ff5a9c):
--    The upload client now passes file.name through to the confirm POST
--    body. The route prefers that over the S3-key parse, with the parse
--    kept as a fallback and 'Unknown file' as the final guard. 4 new
--    tests cover the resolution chain. Suite: 792/792.
--
-- 2. DATABASE (this migration):
--    a) Clean up any existing rows where filename is UUID-shaped, by
--       re-deriving from s3_key when possible (and re-checking that the
--       derived value isn't ALSO UUID-shaped — this is what burned us
--       on the first migration attempt).
--    b) Add a CHECK constraint that makes the entire bug class
--       impossible to recur. Any future regression that tries to write
--       a UUID-shaped filename will fail at the DB layer with a clear
--       error instead of silently corrupting the dashboard.
--
-- ----------------------------------------------------------------------------
-- HOW THE FIRST ATTEMPT FAILED (recorded for posterity)
-- ----------------------------------------------------------------------------
--
-- Original UPDATE used COALESCE:
--     SET filename = COALESCE(NULLIF(split_part(s3_key, '/', 3), ''),
--                             'unnamed.csv')
--
-- That fixed 11 rows, then ALTER TABLE ADD CONSTRAINT failed with:
--     ERROR: check constraint "uploads_filename_not_uuid_shaped" of
--     relation "uploads" is violated by some row (SQLSTATE 23514)
--
-- Why: at least one row's s3_key had a UUID in its third segment, so
-- split_part returned another UUID, COALESCE accepted it (it wasn't
-- NULL or empty), and the new filename still violated the constraint.
--
-- Lesson: COALESCE checks NULL/empty, not "matches the bad pattern".
-- The fix below uses CASE to explicitly require the derived value to
-- NOT be UUID-shaped, falling back to 'unnamed.csv' otherwise.
--
-- ============================================================================


-- ----------------------------------------------------------------------------
-- STEP 1A: Clean uploads.filename
-- ----------------------------------------------------------------------------
-- Re-derive the real name from s3_key, but ONLY if that value is itself
-- non-empty AND not UUID-shaped. Otherwise fall back to 'unnamed.csv'.
--
-- The regex '^[0-9a-f]{8}-[0-9a-f]{4}' matches the start of any UUID
-- (8 hex chars, dash, 4 hex chars, …). Matching the full UUID format
-- would also work, but anchoring on the prefix is sufficient and
-- catches truncated cases too.
UPDATE uploads
   SET filename = CASE
     WHEN split_part(s3_key, '/', 3) <> ''
      AND split_part(s3_key, '/', 3) !~ '^[0-9a-f]{8}-[0-9a-f]{4}'
       THEN split_part(s3_key, '/', 3)
     ELSE 'unnamed.csv'
   END
 WHERE filename ~ '^[0-9a-f]{8}-[0-9a-f]{4}';


-- ----------------------------------------------------------------------------
-- STEP 1B: Drop any prior version of the constraint (re-run safety)
-- ----------------------------------------------------------------------------
-- If this migration is re-run after a partial-success state (which is
-- what happens when the first attempt's UPDATE committed but the ALTER
-- failed), the constraint may already exist. DROP IF EXISTS keeps the
-- migration idempotent.
ALTER TABLE uploads
  DROP CONSTRAINT IF EXISTS uploads_filename_not_uuid_shaped;


-- ----------------------------------------------------------------------------
-- STEP 1C: Add the CHECK constraint to uploads
-- ----------------------------------------------------------------------------
-- The structural guard. Any INSERT or UPDATE that tries to write a
-- UUID-shaped filename will fail with SQLSTATE 23514. Code regressions
-- can no longer silently corrupt the dashboard view.
ALTER TABLE uploads
  ADD CONSTRAINT uploads_filename_not_uuid_shaped
  CHECK (filename !~ '^[0-9a-f]{8}-[0-9a-f]{4}');


-- ----------------------------------------------------------------------------
-- STEP 2A: Clean bank_jobs.filename
-- ----------------------------------------------------------------------------
-- Belt-and-suspenders for the bank flow. The current code stores the
-- filename correctly (app/api/bank/process/route.ts takes file.name
-- from the request body and inserts it directly), so this should be a
-- no-op today. Included anyway so a future code regression in the bank
-- path can't re-introduce the bug class.
--
-- Bank uploads are PDFs, so the fallback is 'unnamed.pdf'.
UPDATE bank_jobs
   SET filename = 'unnamed.pdf'
 WHERE filename ~ '^[0-9a-f]{8}-[0-9a-f]{4}';


-- ----------------------------------------------------------------------------
-- STEP 2B: Drop any prior version of the bank_jobs constraint
-- ----------------------------------------------------------------------------
ALTER TABLE bank_jobs
  DROP CONSTRAINT IF EXISTS bank_jobs_filename_not_uuid_shaped;


-- ----------------------------------------------------------------------------
-- STEP 2C: Add the CHECK constraint to bank_jobs
-- ----------------------------------------------------------------------------
ALTER TABLE bank_jobs
  ADD CONSTRAINT bank_jobs_filename_not_uuid_shaped
  CHECK (filename !~ '^[0-9a-f]{8}-[0-9a-f]{4}');


-- ============================================================================
-- VERIFICATION (run these manually after the migration)
-- ============================================================================
--
-- 1. No remaining UUID-shaped filenames in either table:
--
--    SELECT count(*) FROM uploads
--     WHERE filename ~ '^[0-9a-f]{8}-[0-9a-f]{4}';
--    -- expect: 0
--
--    SELECT count(*) FROM bank_jobs
--     WHERE filename ~ '^[0-9a-f]{8}-[0-9a-f]{4}';
--    -- expect: 0
--
-- 2. Both constraints exist:
--
--    SELECT conname FROM pg_constraint
--     WHERE conname IN (
--       'uploads_filename_not_uuid_shaped',
--       'bank_jobs_filename_not_uuid_shaped'
--     );
--    -- expect: 2 rows
--
-- 3. Constraint actually rejects bad writes (this should ERROR):
--
--    INSERT INTO uploads (user_id, filename, s3_key, status)
--    VALUES (
--      (SELECT id FROM users LIMIT 1),
--      '23e8c130-bdb2-5eab-9999-000000000000.csv',
--      'uploads/test/test.csv',
--      'pending'
--    );
--    -- expect: ERROR: check constraint "uploads_filename_not_uuid_shaped"
--    --         of relation "uploads" is violated by new row
--
-- 4. Sample of cleaned rows (should show real names or 'unnamed.csv'):
--
--    SELECT id, filename, s3_key
--      FROM uploads
--     ORDER BY created_at DESC
--     LIMIT 10;
--
-- ============================================================================
-- ROLLBACK (if you ever need to undo this migration)
-- ============================================================================
--
-- The constraint is the only structural change — dropping it restores
-- the prior schema. The data cleanup (UPDATE) is NOT reversible: the
-- original UUID-shaped filenames are lost. If you need to roll back,
-- accept that the affected rows now read 'unnamed.csv' / 'unnamed.pdf'
-- instead of the prior UUID strings.
--
--    ALTER TABLE uploads
--      DROP CONSTRAINT IF EXISTS uploads_filename_not_uuid_shaped;
--    ALTER TABLE bank_jobs
--      DROP CONSTRAINT IF EXISTS bank_jobs_filename_not_uuid_shaped;
--
-- ============================================================================
