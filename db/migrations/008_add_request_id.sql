-- Add request_id column to api_requests for tracing
ALTER TABLE api_requests ADD COLUMN IF NOT EXISTS request_id text;
