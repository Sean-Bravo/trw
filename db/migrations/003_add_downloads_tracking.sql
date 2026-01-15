-- Migration: Add downloads tracking for free tier limit (3/month)
-- Run this in Neon SQL Editor

BEGIN;

-- Track downloads per user per month
CREATE TABLE IF NOT EXISTS downloads (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id           uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  downloaded_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_user_month ON downloads(user_id, downloaded_at);

-- Prevent duplicate download records for same job
CREATE UNIQUE INDEX IF NOT EXISTS ux_downloads_user_job ON downloads(user_id, job_id);

COMMIT;
