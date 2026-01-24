# TaxFormatter CEO Dashboard - Neon SQL Cheat Sheet

Copy/paste these queries into Neon console for your weekly metrics review.

---

## 🎯 MONDAY MORNING HEALTH CHECK (Run This First)

```sql
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days') as new_users_7d,
  (SELECT COUNT(*) FROM uploads WHERE created_at > NOW() - INTERVAL '7 days') as uploads_7d,
  (SELECT COUNT(*) FROM jobs WHERE status = 'completed' AND created_at > NOW() - INTERVAL '7 days') as completed_jobs_7d,
  (SELECT COUNT(*) FROM jobs WHERE status = 'failed' AND created_at > NOW() - INTERVAL '7 days') as failed_jobs_7d,
  (SELECT COUNT(*) FROM downloads WHERE downloaded_at > NOW() - INTERVAL '7 days') as downloads_7d,
  (SELECT COUNT(*) FROM subscriptions WHERE tier != 'free' AND status = 'active') as paid_subscribers,
  (SELECT SUM(transaction_count) FROM jobs WHERE created_at > NOW() - INTERVAL '7 days') as transactions_processed_7d;
```

---

## 💰 REVENUE & SUBSCRIPTIONS

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
    WHEN tier = 'pro' THEN 9
    WHEN tier = 'premium' THEN 19
    ELSE 0 
  END) as estimated_mrr
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

## 📊 USAGE METRICS

### Uploads by day (last 14 days)
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as uploads,
  SUM(file_size) / 1024 / 1024 as total_mb
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
WHERE status = 'completed'
  AND created_at > NOW() - INTERVAL '7 days'
  AND finished_at IS NOT NULL 
  AND started_at IS NOT NULL;
```

---

## 🏦 EXCHANGE PARSER PERFORMANCE

### Which exchanges are users uploading (last 30 days)
```sql
SELECT 
  exchange_detected,
  COUNT(*) as job_count,
  SUM(transaction_count) as total_transactions,
  ROUND(AVG(transaction_count), 0) as avg_transactions,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
FROM jobs 
WHERE created_at > NOW() - INTERVAL '30 days'
  AND exchange_detected IS NOT NULL
GROUP BY exchange_detected
ORDER BY job_count DESC;
```

### Failed jobs by exchange (find broken parsers)
```sql
SELECT 
  exchange_detected,
  COUNT(*) as failures,
  ARRAY_AGG(DISTINCT LEFT(error, 100)) as error_samples
FROM jobs
WHERE status = 'failed' 
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY exchange_detected
ORDER BY failures DESC;
```

### Parser success rate by exchange
```sql
SELECT 
  exchange_detected,
  COUNT(*) FILTER (WHERE status = 'completed') as success,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*), 1) as success_rate
FROM jobs 
WHERE created_at > NOW() - INTERVAL '30 days'
  AND exchange_detected IS NOT NULL
GROUP BY exchange_detected
HAVING COUNT(*) >= 3
ORDER BY success_rate ASC;
```

---

## 🤖 AI INSIGHTS PERFORMANCE

### AI model usage breakdown
```sql
SELECT 
  ai_model_name,
  COUNT(*) as usage_count,
  ROUND(AVG(ai_confidence), 2) as avg_confidence
FROM jobs 
WHERE created_at > NOW() - INTERVAL '30 days'
  AND ai_model_name IS NOT NULL
GROUP BY ai_model_name
ORDER BY usage_count DESC;
```

### Low confidence jobs (may need review)
```sql
SELECT 
  j.id,
  j.exchange_detected,
  j.ai_confidence,
  j.ai_model_name,
  u.email,
  j.created_at
FROM jobs j
JOIN users u ON j.user_id = u.id
WHERE j.ai_confidence < 0.7
  AND j.ai_confidence IS NOT NULL
  AND j.created_at > NOW() - INTERVAL '7 days'
ORDER BY j.ai_confidence ASC
LIMIT 20;
```

---

## 👥 USER INSIGHTS

### Most active users (last 30 days)
```sql
SELECT 
  u.email,
  s.tier,
  COUNT(DISTINCT up.id) as uploads,
  COUNT(DISTINCT d.id) as downloads,
  SUM(j.transaction_count) as total_transactions
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

### Free users hitting download limit (🔥 conversion opportunities)
```sql
SELECT 
  u.email,
  COUNT(d.id) as downloads_this_month,
  MAX(d.downloaded_at) as last_download
FROM users u
JOIN subscriptions s ON u.id = s.user_id
JOIN jobs j ON j.user_id = u.id
JOIN downloads d ON d.job_id = j.id
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
  COUNT(*) as signups,
  COUNT(*) FILTER (WHERE email_verified = true) as verified
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

## 🚨 TROUBLESHOOTING

### Recent failed jobs with details
```sql
SELECT 
  j.id,
  j.created_at,
  j.exchange_detected,
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

### Stuck/pending jobs (older than 10 min)
```sql
SELECT 
  j.id,
  j.status,
  j.progress_stage,
  j.created_at,
  j.started_at,
  up.filename,
  u.email
FROM jobs j
JOIN uploads up ON j.upload_id = up.id
JOIN users u ON up.user_id = u.id
WHERE j.status IN ('pending', 'processing')
  AND j.created_at < NOW() - INTERVAL '10 minutes'
ORDER BY j.created_at;
```

### Jobs with high retry count
```sql
SELECT 
  j.id,
  j.exchange_detected,
  j.retry_count,
  j.last_retry_at,
  j.error,
  u.email
FROM jobs j
JOIN users u ON j.user_id = u.id
WHERE j.retry_count > 0
ORDER BY j.retry_count DESC, j.last_retry_at DESC
LIMIT 20;
```

---

## 📈 FUNNEL ANALYSIS

### Full funnel (last 30 days)
```sql
SELECT
  (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '30 days') as signups,
  (SELECT COUNT(DISTINCT user_id) FROM uploads WHERE created_at > NOW() - INTERVAL '30 days') as users_uploaded,
  (SELECT COUNT(DISTINCT j.user_id) FROM jobs j WHERE j.status = 'completed' AND j.created_at > NOW() - INTERVAL '30 days') as users_with_success,
  (SELECT COUNT(DISTINCT d.user_id) FROM downloads d JOIN jobs j ON d.job_id = j.id WHERE d.downloaded_at > NOW() - INTERVAL '30 days') as users_downloaded,
  (SELECT COUNT(*) FROM subscriptions WHERE tier != 'free' AND status = 'active' AND created_at > NOW() - INTERVAL '30 days') as converted_to_paid;
```

### Upload to download conversion by exchange
```sql
SELECT 
  j.exchange_detected,
  COUNT(DISTINCT j.id) as total_jobs,
  COUNT(DISTINCT d.job_id) as downloaded,
  ROUND(COUNT(DISTINCT d.job_id) * 100.0 / NULLIF(COUNT(DISTINCT j.id), 0), 1) as download_rate
FROM jobs j
LEFT JOIN downloads d ON j.id = d.job_id
WHERE j.created_at > NOW() - INTERVAL '30 days'
  AND j.status = 'completed'
GROUP BY j.exchange_detected
HAVING COUNT(DISTINCT j.id) >= 3
ORDER BY download_rate DESC;
```

---

## 🗓️ TAX SEASON TRACKING (Jan-Apr 2026)

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

### Transactions processed (cumulative)
```sql
SELECT 
  DATE(created_at) as date,
  SUM(transaction_count) as daily_transactions,
  SUM(SUM(transaction_count)) OVER (ORDER BY DATE(created_at)) as cumulative_transactions
FROM jobs
WHERE created_at > '2026-01-01'
  AND status = 'completed'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Quick Reference: Your Tables

| Table | Key Columns |
|-------|-------------|
| users | id, email, created_at, email_verified, two_factor_enabled |
| subscriptions | user_id, tier, status, stripe_customer_id, current_period_end |
| uploads | id, user_id, filename, s3_key, status, file_size |
| jobs | upload_id, status, exchange_detected, transaction_count, error, ai_model_name, ai_confidence |
| downloads | user_id, job_id, downloaded_at |
| transactions | user_id, upload_id, posted_at, amount_cents, currency, merchant |
| exchange_configs | fingerprint, exchange_name, mapping_config, usage_count |

### Status Enums (likely values)
- **jobs.status**: pending, processing, completed, failed
- **uploads.status**: pending, confirmed, processing, completed
- **subscriptions.tier**: free, pro, premium
- **subscriptions.status**: active, canceled, past_due

---

*Last updated: January 2026*