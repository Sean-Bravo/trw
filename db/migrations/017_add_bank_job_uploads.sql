-- ============================================================================
-- Migration 017: Bind bank jobs to their owner at presign time
-- ============================================================================
--
-- Created:        2026-10-17
-- Companion code: app/api/bank/presigned-url/route.ts,
--                 app/api/bank/process/route.ts,
--                 backend/handlers/webhook.py (handle_bank_process)
-- Affected tables: bank_job_uploads (new)
-- Estimated runtime: <1 second (new empty table)
-- Reversible: yes (see ROLLBACK section at bottom)
--
-- ----------------------------------------------------------------------------
-- WHY
-- ----------------------------------------------------------------------------
-- Oct 17 consolidated security report, issue #2: /api/bank/process trusted a
-- client-supplied jobId and s3Key, so a caller could parse any PDF in the
-- uploads bucket, overwrite another user's bank exports, and rewrite another
-- user's bank_jobs row. Now /api/bank/presigned-url records the job id, its
-- owner and the exact S3 key here, and /api/bank/process accepts only the
-- jobId, looks the row up, rejects any caller who is not the owner, and sends
-- the recorded key to the Lambda.
--
-- This is a separate table rather than bank_jobs columns because:
--   * bank_jobs.user_id is NOT NULL with an FK to users, and logged-out
--     visitors to /upload can convert statements too;
--   * a bank_jobs row at presign time would show abandoned uploads as
--     'processing' in the dashboard job list.
--
-- Exactly one owner column is set:
--   * user_id       for a logged-in user (cascades on account deletion);
--   * anon_id_hash  for a logged-out visitor: SHA-256 hex of the rate-limit
--                   identity (getClientIdentifier), so no raw IP is stored.
--
-- Deploy order: apply this BEFORE the Next.js code ships. Without the table,
-- every bank presign returns 500.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bank_job_uploads (
  job_id        uuid PRIMARY KEY,
  user_id       uuid REFERENCES users(id) ON DELETE CASCADE,
  anon_id_hash  text,
  s3_key        text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bank_job_uploads_one_owner
    CHECK ((user_id IS NULL) <> (anon_id_hash IS NULL)),
  CONSTRAINT bank_job_uploads_key_in_job_prefix
    CHECK (s3_key LIKE 'bank/' || job_id::text || '/%')
);

-- For a future retention prune of old rows.
CREATE INDEX IF NOT EXISTS idx_bank_job_uploads_created_at ON bank_job_uploads(created_at);

COMMENT ON TABLE  bank_job_uploads IS 'Owner and exact S3 key of each bank statement presign; /api/bank/process only processes jobs recorded here for the caller.';
COMMENT ON COLUMN bank_job_uploads.anon_id_hash IS 'SHA-256 hex of the rate-limit identity of a logged-out uploader; NULL when user_id is set.';

-- ----------------------------------------------------------------------------
-- ROLLBACK
-- ----------------------------------------------------------------------------
-- Roll the code back first: the bank routes read and write this table.
-- DROP TABLE IF EXISTS bank_job_uploads;
