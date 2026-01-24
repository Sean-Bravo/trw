# TaxFormatter CEO Dashboard - Neon SQL Cheat Sheet

Copy/paste these queries into Neon console for your weekly metrics review.

---

## Quick Reference: Actual Schema

| Table | Key Columns |
|-------|-------------|
| users | id, email, password_hash, name, created_at |
| accounts | id, user_id, provider, provider_account_id |
| subscriptions | id, user_id, tier, status, stripe_customer_id, current_period_end |
| uploads | id, user_id, filename, s3_key, status, file_size, created_at |
| jobs | id, upload_id, status, result (JSONB), error, retry_count, started_at, finished_at |
| downloads | id, user_id, job_id, downloaded_at |
| transactions | id, user_id, upload_id, posted_at, amount_cents, currency, merchant |
| ai_cache | id, user_id, key, model, result (JSONB) |

### Status Enums
- **upload_status**: pending, processing, parsed, failed
- **job_status**: queued, running, succeeded, failed, canceled
- **subscription_tier**: free, pro, premium
- **subscription_status**: active, trialing, past_due, canceled, paused

---

## MONDAY MORNING HEALTH CHECK (Run This First)

```sql
SELECT
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days') as new_users_7d,
  (SELECT COUNT(*) FROM uploads WHERE created_at > NOW() - INTERVAL '7 days') as uploads_7d,
  (SELECT COUNT(*) FROM jobs WHERE status = 'succeeded' AND created_at > NOW() - INTERVAL '7 days') as completed_jobs_7d,
  (SELECT COUNT(*) FROM jobs WHERE status = 'failed' AND created_at > NOW() - INTERVAL '7 days') as failed_jobs_7d,
  (SELECT COUNT(*) FROM downloads WHERE downloaded_at > NOW() - INTERVAL '7 days') as downloads_7d,
  (SELECT COUNT(*) FROM subscriptions WHERE tier != 'free' AND status = 'active') as paid_subscribers;
```

---

## REVENUE & SUBSCRIPTIONS

### Paid subscriber breakdown
```sql
SELECT
  tier,
  status,
  COUNT(*) as count
FROM subscriptions
WHERE tier != 'free'
GROUP BY tier, status
ORDER BY tier, status;
```

### Active paid subscribers with details
```sql
SELECT
  u.email,
  s.tier,
  s.status,
  s.current_period_end,
  s.created_at as subscribed_at
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.tier != 'free' AND s.status = 'active'
ORDER BY s.created_at DESC;
```

### Monthly recurring revenue estimate
```sql
SELECT
  SUM(CASE
    WHEN tier = 'pro' THEN 89.0/12
    WHEN tier = 'premium' THEN 189.0/12
    ELSE 0
  END)::numeric(10,2) as estimated_mrr
FROM subscriptions
WHERE tier != 'free' AND status = 'active';
```

### Churned subscribers (last 30 days)
```sql
SELECT
  u.email,
  s.tier,
  s.current_period_end as churned_at
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.status = 'canceled'
  AND s.current_period_end > NOW() - INTERVAL '30 days'
ORDER BY s.current_period_end DESC;
```

---

## USAGE METRICS

### Uploads by day (last 14 days)
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as uploads,
  COALESCE(SUM(file_size), 0) / 1024 / 1024 as total_mb
FROM uploads
WHERE created_at > NOW() - INTERVAL '14 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Downloads by day (last 14 days)
```sql
SELECT
  DATE(downloaded_at) as date,
  COUNT(*) as downloads
FROM downloads
WHERE downloaded_at > NOW() - INTERVAL '14 days'
GROUP BY DATE(downloaded_at)
ORDER BY date DESC;
```

### Job success rate (last 7 days)
```sql
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
FROM jobs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY status
ORDER BY count DESC;
```

### Average processing time (last 7 days)
```sql
SELECT
  ROUND(AVG(EXTRACT(EPOCH FROM (finished_at - started_at))), 1) as avg_seconds,
  ROUND(MAX(EXTRACT(EPOCH FROM (finished_at - started_at))), 1) as max_seconds,
  ROUND(MIN(EXTRACT(EPOCH FROM (finished_at - started_at))), 1) as min_seconds
FROM jobs
WHERE status = 'succeeded'
  AND created_at > NOW() - INTERVAL '7 days'
  AND finished_at IS NOT NULL
  AND started_at IS NOT NULL;
```

---

## EXCHANGE & JOB ANALYSIS

### Exchange breakdown (from job results JSONB)
```sql
SELECT
  result->>'exchange' as exchange,
  COUNT(*) as job_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
FROM jobs
WHERE created_at > NOW() - INTERVAL '30 days'
  AND result->>'exchange' IS NOT NULL
GROUP BY result->>'exchange'
ORDER BY job_count DESC;
```

### Failed jobs with error details
```sql
SELECT
  j.id,
  j.created_at,
  j.error,
  j.retry_count,
  up.filename,
  u.email
FROM jobs j
JOIN uploads up ON j.upload_id = up.id
JOIN users u ON up.user_id = u.id
WHERE j.status = 'failed'
ORDER BY j.created_at DESC
LIMIT 20;
```

### Jobs with high retry count
```sql
SELECT
  j.id,
  j.retry_count,
  j.last_retry_at,
  j.error,
  up.filename,
  u.email
FROM jobs j
JOIN uploads up ON j.upload_id = up.id
JOIN users u ON up.user_id = u.id
WHERE j.retry_count > 0
ORDER BY j.retry_count DESC, j.last_retry_at DESC
LIMIT 20;
```

---

## USER INSIGHTS

### Most active users (last 30 days)
```sql
SELECT
  u.email,
  s.tier,
  COUNT(DISTINCT up.id) as uploads,
  COUNT(DISTINCT d.id) as downloads
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id
LEFT JOIN uploads up ON u.id = up.user_id AND up.created_at > NOW() - INTERVAL '30 days'
LEFT JOIN jobs j ON up.id = j.upload_id
LEFT JOIN downloads d ON j.id = d.job_id AND d.downloaded_at > NOW() - INTERVAL '30 days'
GROUP BY u.id, u.email, s.tier
HAVING COUNT(up.id) > 0
ORDER BY uploads DESC
LIMIT 15;
```

### Free users hitting download limit (conversion opportunities)
```sql
SELECT
  u.email,
  COUNT(d.id) as downloads_this_month,
  MAX(d.downloaded_at) as last_download
FROM users u
JOIN subscriptions s ON u.id = s.user_id
JOIN downloads d ON d.user_id = u.id
WHERE s.tier = 'free'
  AND d.downloaded_at > DATE_TRUNC('month', NOW())
GROUP BY u.id, u.email
HAVING COUNT(d.id) >= 2
ORDER BY downloads_this_month DESC;
```

### User signups by day (last 30 days)
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as signups
FROM users
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Users who signed up but never uploaded (activation problem)
```sql
SELECT
  u.email,
  u.created_at as signed_up,
  s.tier
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id
LEFT JOIN uploads up ON u.id = up.user_id
WHERE up.id IS NULL
  AND u.created_at > NOW() - INTERVAL '30 days'
ORDER BY u.created_at DESC;
```

---

## TROUBLESHOOTING

### Stuck jobs (older than 10 min)
```sql
SELECT
  j.id,
  j.status,
  j.created_at,
  j.started_at,
  up.filename,
  u.email
FROM jobs j
JOIN uploads up ON j.upload_id = up.id
JOIN users u ON up.user_id = u.id
WHERE j.status IN ('queued', 'running')
  AND j.created_at < NOW() - INTERVAL '10 minutes'
ORDER BY j.created_at;
```

---

## FUNNEL ANALYSIS

### Full funnel (last 30 days)
```sql
SELECT
  (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '30 days') as signups,
  (SELECT COUNT(DISTINCT user_id) FROM uploads WHERE created_at > NOW() - INTERVAL '30 days') as users_uploaded,
  (SELECT COUNT(DISTINCT up.user_id) FROM jobs j JOIN uploads up ON j.upload_id = up.id WHERE j.status = 'succeeded' AND j.created_at > NOW() - INTERVAL '30 days') as users_with_success,
  (SELECT COUNT(DISTINCT user_id) FROM downloads WHERE downloaded_at > NOW() - INTERVAL '30 days') as users_downloaded,
  (SELECT COUNT(*) FROM subscriptions WHERE tier != 'free' AND status = 'active' AND created_at > NOW() - INTERVAL '30 days') as converted_to_paid;
```

---

## TAX SEASON TRACKING (Jan-Apr 2026)

### Daily active users
```sql
SELECT
  DATE(created_at) as date,
  COUNT(DISTINCT user_id) as active_users,
  COUNT(*) as total_uploads
FROM uploads
WHERE created_at > '2026-01-01'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Week-over-week growth
```sql
WITH weekly AS (
  SELECT
    DATE_TRUNC('week', created_at) as week,
    COUNT(*) as uploads,
    COUNT(DISTINCT user_id) as unique_users
  FROM uploads
  WHERE created_at > NOW() - INTERVAL '8 weeks'
  GROUP BY DATE_TRUNC('week', created_at)
)
SELECT
  week,
  uploads,
  unique_users,
  LAG(uploads) OVER (ORDER BY week) as prev_week_uploads,
  ROUND((uploads - LAG(uploads) OVER (ORDER BY week)) * 100.0 /
    NULLIF(LAG(uploads) OVER (ORDER BY week), 0), 1) as upload_growth_pct
FROM weekly
ORDER BY week DESC;
```

---

*Last updated: January 2026*
