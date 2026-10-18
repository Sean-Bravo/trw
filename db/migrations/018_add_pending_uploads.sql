-- ============================================================================
-- Migration 018: pending_uploads — S3 keys issued at presign time
-- ============================================================================
--
-- Created:        2026-10-17
-- Companion code: lib/uploads-db.ts (createPendingUpload, getPendingUpload,
--                 deletePendingUpload), app/api/uploads/presigned-url/route.ts,
--                 app/api/uploads/[uploadId]/confirm/route.ts
-- Affected tables: pending_uploads (new)
-- Estimated runtime: <1 second
-- Reversible: yes (see ROLLBACK section at bottom)
--
-- ----------------------------------------------------------------------------
-- WHY
-- ----------------------------------------------------------------------------
-- Oct 17 security report issue #15: POST /api/uploads/{uploadId}/confirm used
-- the URL's uploadId as the S3 key and bound it to the caller, with no check
-- that the key had been issued to that caller. Anyone holding another user's
-- key could claim the upload and its job (and with it the job's result and
-- download). Now presigned-url writes a row here with the owner, exact key and
-- Lambda job id; confirm refuses any key without an unexpired row owned by the
-- session user, and deletes the row once the upload and job rows exist.
--
-- Only signed-in presigns are recorded (user_id references users). Anonymous
-- presigns could never be confirmed anyway: confirm requires a session (M-12).
--
-- expires_at: the S3 upload URL lives 15 minutes (UPLOAD_EXPIRATION in
-- backend/handlers/webhook.py); the app gives the upload an hour to finish.
-- Expired rows for a user are pruned on that user's next presign.
--
-- Deploy order: apply this BEFORE the code ships. Without the table every
-- presign fails with 'relation "pending_uploads" does not exist'.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pending_uploads (
  s3_key      text PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id      uuid NOT NULL,
  filename    text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '1 hour'
);

CREATE INDEX IF NOT EXISTS idx_pending_uploads_user_id ON pending_uploads(user_id);

COMMENT ON TABLE pending_uploads IS 'S3 keys issued by /api/uploads/presigned-url, awaiting confirm. Confirm only binds a key that has an unexpired row owned by the caller.';

-- ----------------------------------------------------------------------------
-- ROLLBACK
-- ----------------------------------------------------------------------------
-- Roll the code back first: the confirm route rejects every upload without
-- this table.
-- DROP INDEX IF EXISTS idx_pending_uploads_user_id;
-- DROP TABLE IF EXISTS pending_uploads;
