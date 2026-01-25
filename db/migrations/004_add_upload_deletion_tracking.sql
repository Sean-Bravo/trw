-- Migration: Add deletion tracking columns to uploads table
-- Date: 2026-01-26
-- Purpose: Support user-controlled data retention with "delete after download" feature

BEGIN;

-- Add deletion tracking columns to uploads
ALTER TABLE uploads
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS deletion_type VARCHAR(20) NULL;

-- deletion_type values: 'user_requested', 'auto_expired', 'support_request'

-- Add comment for documentation
COMMENT ON COLUMN uploads.deleted_at IS 'Timestamp when the file was deleted from storage (metadata row preserved)';
COMMENT ON COLUMN uploads.deletion_type IS 'How the file was deleted: user_requested, auto_expired, or support_request';

-- Create processing_metadata table for anonymized metadata retention
CREATE TABLE IF NOT EXISTS processing_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id UUID REFERENCES uploads(id) ON DELETE SET NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    exchange_detected VARCHAR(50),
    row_count INTEGER,
    column_headers JSONB,
    error_types JSONB,
    processing_duration_ms INTEGER,
    output_formats_generated TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for lookups by upload
CREATE INDEX IF NOT EXISTS idx_processing_metadata_upload_id ON processing_metadata(upload_id);
CREATE INDEX IF NOT EXISTS idx_processing_metadata_job_id ON processing_metadata(job_id);

COMMIT;
