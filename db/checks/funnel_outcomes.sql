-- ============================================================================
-- Funnel + first-parse outcome queries for the 14-day review (Nov 2, 2026)
-- ============================================================================
-- Read-only. Run in the Neon SQL editor. Each block answers one line of the
-- "Metrics to track" table in the daily schedule. Attribution columns come
-- from migration 014 (users), outcome columns from migration 015
-- (api_requests.source_version, bank_jobs.config_version); dashboard CSV
-- outcomes live in jobs.result (jsonb) as written by the processor.
-- Users created before Oct 14, 2026 have NULL attribution ("pre-attribution").

-- 1. Signups by funnel and acquisition source, last 30 days
SELECT
  COALESCE(funnel, 'pre-attribution')          AS funnel,
  COALESCE(acquisition_source, 'unknown')       AS source,
  COALESCE(acquisition_medium, '-')             AS medium,
  COUNT(*)                                      AS signups
FROM users
WHERE created_at >= now() - interval '30 days'
GROUP BY 1, 2, 3
ORDER BY signups DESC;

-- 2. Developer activation: key created → first request → repeat request, by funnel
SELECT
  COALESCE(u.funnel, 'pre-attribution')                               AS funnel,
  COUNT(DISTINCT u.id)                                                AS users,
  COUNT(DISTINCT k.user_id)                                           AS with_key,
  COUNT(DISTINCT CASE WHEN r.n >= 1 THEN k.user_id END)               AS first_request,
  COUNT(DISTINCT CASE WHEN r.ok >= 1 THEN k.user_id END)              AS first_success,
  COUNT(DISTINCT CASE WHEN r.ok >= 2 THEN k.user_id END)              AS repeat_success
FROM users u
LEFT JOIN api_keys k ON k.user_id = u.id
LEFT JOIN (
  SELECT api_key_id,
         COUNT(*)                                            AS n,
         COUNT(*) FILTER (WHERE status_code = 200)           AS ok
  FROM api_requests
  WHERE endpoint = '/v1/parse'
  GROUP BY api_key_id
) r ON r.api_key_id = k.id
WHERE u.created_at >= now() - interval '30 days'
GROUP BY 1;

-- 3. API first-parse outcome by detected source and version (last 30 days)
SELECT
  source_type,
  COALESCE(detected_source, 'undetected')       AS source,
  COALESCE(source_version, '?')                 AS version,
  COALESCE(error_code, '-')                     AS error_code,
  COUNT(*)                                      AS requests,
  COUNT(*) FILTER (WHERE status_code = 200)     AS ok,
  COUNT(*) FILTER (WHERE status_code <> 200)    AS failed
FROM api_requests
WHERE endpoint = '/v1/parse'
  AND created_at >= now() - interval '30 days'
GROUP BY 1, 2, 3, 4
ORDER BY requests DESC;

-- 4. Dashboard CSV jobs: outcome, parser version, failure reason, insights model
SELECT
  j.status,
  j.result ->> 'exchange'                        AS exchange,
  j.result ->> 'parser_version'                  AS parser_version,
  j.result ->> 'failure_reason'                  AS failure_reason,
  j.result -> 'insights' ->> 'model'             AS insights_model,
  j.result -> 'insights' ->> 'prompt_version'    AS prompt_version,
  j.result -> 'insights' ->> 'request_type'      AS request_type,
  j.result -> 'insights' ->> 'ai_error'          AS ai_error,
  COUNT(*)                                       AS jobs
FROM jobs j
WHERE j.created_at >= now() - interval '30 days'
GROUP BY 1, 2, 3, 4, 5, 6, 7, 8
ORDER BY jobs DESC;

-- 5. Bank funnel (signed-in only — anonymous conversions are GA4-only):
--    upload → successful extraction, by bank and config version
SELECT
  COALESCE(detected_bank, 'undetected')         AS bank,
  COALESCE(config_version, '?')                 AS config_version,
  status,
  COALESCE(LEFT(error, 60), '-')                AS error,
  COUNT(*)                                      AS jobs
FROM bank_jobs
WHERE created_at >= now() - interval '30 days'
GROUP BY 1, 2, 3, 4
ORDER BY jobs DESC;

-- 6. Bank-funnel users who went on to pay (attribution → subscription)
SELECT
  COALESCE(u.funnel, 'pre-attribution')         AS funnel,
  s.tier,
  s.status,
  COUNT(*)                                      AS users
FROM users u
JOIN subscriptions s ON s.user_id = u.id
WHERE u.created_at >= now() - interval '30 days'
GROUP BY 1, 2, 3
ORDER BY users DESC;
