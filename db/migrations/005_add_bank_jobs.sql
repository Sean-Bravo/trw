-- Migration: Add bank_jobs table for tracking bank statement processing
-- Created: 2026-01-27

-- Create enum for bank job status
CREATE TYPE bank_job_status AS ENUM ('processing', 'completed', 'failed');

-- Create bank_jobs table
CREATE TABLE IF NOT EXISTS bank_jobs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename         text NOT NULL,
  status           bank_job_status NOT NULL DEFAULT 'processing',
  detected_bank    text,
  transaction_count integer,
  output_format    text DEFAULT 'qbo',
  result_key       text,  -- S3 key for the result file
  error            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz
);

-- Index for listing user's jobs
CREATE INDEX IF NOT EXISTS idx_bank_jobs_user_id ON bank_jobs(user_id);

-- Index for querying by status
CREATE INDEX IF NOT EXISTS idx_bank_jobs_status ON bank_jobs(status);
