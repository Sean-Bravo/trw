-- ============================================================================
-- Migration 015: Parse-outcome columns (source version per request / bank job)
-- ============================================================================
--
-- Created:        2026-10-14
-- Companion code: backend/services/api_auth.py (record_request),
--                 backend/handlers/api.py, app/api/bank/process/route.ts,
--                 db/checks/funnel_outcomes.sql
-- Affected tables: api_requests, bank_jobs
-- Estimated runtime: <1 second on current data volume
-- Reversible: yes (see ROLLBACK section at bottom)
--
-- ----------------------------------------------------------------------------
-- WHY
-- ----------------------------------------------------------------------------
-- "Record first-parse success/failure reason, detected source/version, and
-- insights-model version." api_requests already holds error_code and
-- detected_source; it gains the parser / bank-config version so a failure
-- can be pinned to the exact version that produced it. bank_jobs gains the
-- bank config version for the same reason. Dashboard CSV jobs need no
-- column: jobs.result (jsonb) now carries parser_version, failure_reason
-- and the insights metadata from the processor's result.json / error.json.
-- ----------------------------------------------------------------------------

ALTER TABLE api_requests ADD COLUMN IF NOT EXISTS source_version text;
ALTER TABLE bank_jobs    ADD COLUMN IF NOT EXISTS config_version text;

COMMENT ON COLUMN api_requests.source_version IS 'Engine parser version (CSV) or bank config version (PDF) that handled the request.';
COMMENT ON COLUMN bank_jobs.config_version IS 'backend/configs/banks/<bank>.yaml version that parsed the statement.';

-- ----------------------------------------------------------------------------
-- ROLLBACK
-- ----------------------------------------------------------------------------
-- ALTER TABLE bank_jobs    DROP COLUMN IF EXISTS config_version;
-- ALTER TABLE api_requests DROP COLUMN IF EXISTS source_version;
