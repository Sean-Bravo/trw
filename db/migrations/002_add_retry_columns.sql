-- Migration: Add retry tracking columns to jobs table
-- Run this in Neon SQL Editor

-- Add retry_count column with default 0
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0;

-- Add last_retry_at column
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_retry_at timestamptz;

-- Add index for querying retried jobs
CREATE INDEX IF NOT EXISTS idx_jobs_retry_count ON jobs(retry_count) WHERE retry_count > 0;
