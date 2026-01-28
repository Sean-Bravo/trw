-- Migration: Add bank_jobs table for tracking bank statement processing
-- Run this in Neon SQL Editor

BEGIN;

-- Create bank_job_status enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bank_job_status') THEN
    CREATE TYPE bank_job_status AS ENUM ('processing', 'completed', 'failed');
  END IF;
END$$;

-- Bank statement processing jobs table
CREATE TABLE IF NOT EXISTS bank_jobs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename         text NOT NULL,
  status           bank_job_status NOT NULL DEFAULT 'processing',
  detected_bank    text,                    -- e.g., 'Chase', 'Bank of America'
  transaction_count integer,                -- number of transactions extracted
  output_format    text DEFAULT 'qbo',      -- 'qbo', 'xero', 'excel'
  result_key       text,                    -- S3 key for result file
  error            text,                    -- error message if failed
  created_at       timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bank_jobs_user_id ON bank_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_jobs_status ON bank_jobs(status);
CREATE INDEX IF NOT EXISTS idx_bank_jobs_created_at ON bank_jobs(user_id, created_at DESC);

COMMIT;
