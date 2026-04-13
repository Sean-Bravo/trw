-- Migration: Prevent UUID-shaped filenames in uploads
-- Created: 2026-04-10
--
-- Background: see docs/UPLOADS_FILENAME_FIX.md and commit 2ff5a9c.
--
-- The crypto upload confirm route used to parse the filename out of the
-- S3 key path. When the path lost its third segment, the stored value
-- looked like a UUID, which was unusable in the dashboard for users
-- managing multiple files.
--
-- The application code is fixed (the client now passes the real
-- filename through), but we add a CHECK constraint here as a structural
-- guard so the bug class can't recur — any future regression that tries
-- to write a UUID-shaped filename will fail at the DB layer instead of
-- silently corrupting the dashboard view.

-- Step 1: clean up any existing legacy rows so the CHECK constraint can
-- be added without rejecting current data. We try to rederive the real
-- name from the S3 key first, then fall back to a generic label.
UPDATE uploads
   SET filename = COALESCE(
       NULLIF(split_part(s3_key, '/', 3), ''),
       'unnamed.csv'
     )
 WHERE filename ~ '^[0-9a-f]{8}-[0-9a-f]{4}';

-- Step 2: add the structural guard.
-- Pattern matches a leading UUID-looking sequence (8 hex - 4 hex …).
-- Anything starting with such a prefix is rejected.
ALTER TABLE uploads
  ADD CONSTRAINT uploads_filename_not_uuid_shaped
  CHECK (filename !~ '^[0-9a-f]{8}-[0-9a-f]{4}');

-- Same belt-and-suspenders guard for bank_jobs. The bank flow stores
-- filename correctly today, but a future code path could regress.
UPDATE bank_jobs
   SET filename = 'unnamed.pdf'
 WHERE filename ~ '^[0-9a-f]{8}-[0-9a-f]{4}';

ALTER TABLE bank_jobs
  ADD CONSTRAINT bank_jobs_filename_not_uuid_shaped
  CHECK (filename !~ '^[0-9a-f]{8}-[0-9a-f]{4}');
