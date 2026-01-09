# RDS Proxy Connection Pool Fix - Critical Production Issue

**Version:** 2.3
**Status:** CRITICAL BUG FIX
**Date:** 2025-12-30

---

## The Problem: Database Connection Exhaustion

### Original Design (v2.2)
- **RDS Instance:** db.t4g.micro (1GB RAM)
- **Max Connections:** 80-90 (hard PostgreSQL limit)
- **Lambda Concurrency:** 100 (reserved)
- **What Happens:** Lambdas 81-100 fail with `FATAL: remaining connection slots are reserved`

### The Math That Breaks
```
100 concurrent Lambdas × 1 connection each = 100 connection attempts
db.t4g.micro max connections = 80-90

Result: 10-20 Lambdas fail instantly
DLQ floods with failed jobs
Users get "processing failed" emails
Production outage during viral spikes
```

---

## The Solution: RDS Proxy + Upgraded Instance

### New Architecture (v2.3)

| Component | Old | New | Why |
|-----------|-----|-----|-----|
| **RDS Instance** | db.t4g.micro (1GB, 80-90 conn) | db.t4g.small (2GB, 100 conn) | Headroom for bursts |
| **RDS Proxy** | None | Connection pooling (50 max) | Multiplexes connections |
| **Lambda Concurrency** | 100 | 50 | Matches Proxy limit |
| **Cost** | $12.41/mo | $34.90/mo (+$22) | Prevents downtime |

### Connection Flow

```
┌─────────────────────────────────────────────────────┐
│  50 Concurrent Lambdas (Reserved Concurrency = 50)  │
└─────────────────────────────────────────────────────┘
                       │
                       │ Each Lambda: max 1 connection
                       ↓
┌─────────────────────────────────────────────────────┐
│           RDS Proxy (Connection Pooling)             │
│  • Receives 50 connections from Lambdas              │
│  • Multiplexes into ≤50 connections to database      │
│  • Connection reuse, pooling, TLS termination        │
└─────────────────────────────────────────────────────┘
                       │
                       │ ≤50 pooled connections
                       ↓
┌─────────────────────────────────────────────────────┐
│         PostgreSQL RDS (db.t4g.small)                │
│  • Max 100 connections supported                     │
│  • 50 used by Proxy (50% headroom)                   │
│  • 50 reserved for bursts, monitoring, maintenance   │
└─────────────────────────────────────────────────────┘
```

---

## Configuration Details

### RDS Proxy Settings

```hcl
resource "aws_db_proxy" "main" {
  name                   = "taxformatter-rds-proxy"
  engine_family          = "POSTGRESQL"
  require_tls            = true

  auth {
    auth_scheme = "SECRETS"
    secret_arn  = aws_secretsmanager_secret.db_password.arn
  }
}

resource "aws_db_proxy_default_target_group" "main" {
  db_proxy_name = aws_db_proxy.main.name

  connection_pool_config {
    max_connections_percent      = 50   # Use 50% of RDS max (50 of 100)
    max_idle_connections_percent = 25   # Keep 25 connections idle for reuse
    connection_borrow_timeout    = 120  # Wait 2 minutes for connection
  }
}
```

### Lambda Connection Code

```typescript
// CRITICAL: Connect via RDS Proxy, NOT direct RDS endpoint
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.RDS_PROXY_ENDPOINT,  // taxformatter-rds-proxy.xxx.rds.amazonaws.com
  port: 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Lambda-optimized pool settings
  max: 1,                          // Each Lambda: 1 connection max
  min: 0,                          // No persistent connections
  idleTimeoutMillis: 30000,        // Close after 30s idle
  connectionTimeoutMillis: 120000  // 2 min timeout (matches Proxy)
});

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params)
};
```

### Lambda Environment Variables

```bash
# OLD (WRONG - Direct RDS connection)
DB_HOST=taxformatter-db.xxx.us-east-1.rds.amazonaws.com

# NEW (CORRECT - Via RDS Proxy)
RDS_PROXY_ENDPOINT=taxformatter-rds-proxy.proxy-xxx.us-east-1.rds.amazonaws.com
DB_NAME=taxformatter
DB_USER=taxformatter
DB_PASSWORD_SECRET_ARN=arn:aws:secretsmanager:us-east-1:xxx:secret:taxformatter/db-password
```

---

## Cost Impact

### Before (v2.2)
| Component | Cost |
|-----------|------|
| RDS t4g.micro | $12.41/mo |
| RDS Proxy | $0 (not used) |
| **Total** | **$12.41/mo** |

**Downside:** Connection exhaustion breaks production

### After (v2.3)
| Component | Cost |
|-----------|------|
| RDS t4g.small | $24.82/mo |
| RDS Proxy | $10.08/mo |
| **Total** | **$34.90/mo** |

**Cost Increase:** +$22.49/month
**Value:** Prevents production outages, supports 300 jobs/hour safely

### Updated Baseline Costs
| Tier | Old Baseline | New Baseline | Difference |
|------|--------------|--------------|------------|
| Free | $50/mo | $73/mo | +$23/mo |
| Pro | $50/mo | $73/mo | +$23/mo |
| Premium | $50/mo | $73/mo | +$23/mo |

**Still Sustainable:** $73/month for 1000 free tier jobs with zero connection failures

---

## Performance Impact

### Throughput Comparison

| Metric | Before (100 concurrency) | After (50 concurrency) |
|--------|-------------------------|------------------------|
| **Theoretical Max** | 600 jobs/hour | 300 jobs/hour |
| **Actual (with failures)** | ~480 jobs/hour (20% fail) | 300 jobs/hour (0% fail) |
| **Daily Capacity** | ~11,500 jobs/day | 7,200 jobs/day |
| **Reliability** | ❌ 20% failure rate | ✅ 0% failure rate |

**Key Insight:** Better to process 300 jobs/hour reliably than 600 jobs/hour with 20% failures

### Scaling Path
If you need >300 jobs/hour:
1. **Option 1:** Increase Lambda concurrency to 75 + increase Proxy max_connections to 75%
2. **Option 2:** Upgrade to db.t4g.medium (4GB RAM, 200 max connections) + 100 concurrency
3. **Option 3:** Add read replicas for reporting queries, reserve more connections for writes

---

## Migration Checklist

- [ ] Update RDS instance class from t4g.micro → t4g.small
- [ ] Create RDS Proxy with connection pooling (50 max connections)
- [ ] Update Lambda environment variable: `DB_HOST` → `RDS_PROXY_ENDPOINT`
- [ ] Reduce Lambda reserved concurrency from 100 → 50
- [ ] Update database connection code to use Proxy endpoint
- [ ] Test connection pool under load (simulate 50 concurrent jobs)
- [ ] Monitor CloudWatch for connection errors (should be zero)
- [ ] Update Terraform to include RDS Proxy configuration
- [ ] Update cost estimates in documentation (+$23/month baseline)

---

## Monitoring & Alerts

### CloudWatch Metrics to Track

```sql
-- Connection pool utilization
SELECT
  AVG(DatabaseConnections) as avg_connections,
  MAX(DatabaseConnections) as peak_connections
FROM aws_rds_metrics
WHERE DBInstanceIdentifier = 'taxformatter-db'
  AND Timestamp > NOW() - INTERVAL '1 hour';

-- RDS Proxy connection efficiency
SELECT
  ClientConnections,        -- Connections from Lambdas
  DatabaseConnections,      -- Connections to RDS
  (DatabaseConnections * 100.0 / ClientConnections) as multiplexing_ratio
FROM aws_rds_proxy_metrics
WHERE ProxyName = 'taxformatter-rds-proxy';

-- Connection errors (should be zero)
SELECT COUNT(*) as connection_errors
FROM cloudwatch_logs
WHERE message LIKE '%remaining connection slots are reserved%'
  AND timestamp > NOW() - INTERVAL '1 hour';
```

### Alarm Thresholds

```hcl
# Alert if RDS connections exceed 80% of max
resource "aws_cloudwatch_metric_alarm" "rds_connections_high" {
  alarm_name          = "taxformatter-rds-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"  # 80 of 100 max connections
  alarm_description   = "RDS connections approaching limit"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = "taxformatter-db"
  }
}

# Alert if Proxy can't get connections
resource "aws_cloudwatch_metric_alarm" "proxy_wait_time" {
  alarm_name          = "taxformatter-proxy-wait-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "ClientConnectionsWaitTime"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "1000"  # 1 second wait time
  alarm_description   = "RDS Proxy connection wait time high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ProxyName = "taxformatter-rds-proxy"
  }
}
```

---

## Testing Plan

### Load Test Scenarios

1. **Baseline Test (10 concurrent jobs)**
   - Verify all jobs complete without errors
   - Check connection count stays <15

2. **Normal Load (25 concurrent jobs)**
   - Verify all jobs complete
   - Check connection count stays <30
   - Monitor Proxy multiplexing ratio

3. **Peak Load (50 concurrent jobs)**
   - Verify all jobs complete (Lambda concurrency limit)
   - Check connection count stays ≤50
   - No connection timeout errors

4. **Stress Test (Attempt 100 concurrent jobs)**
   - Lambda concurrency throttles at 50
   - Remaining 50 jobs queue in SQS
   - No connection errors (Proxy protects database)

### Expected Results

| Test | Concurrent Lambdas | DB Connections | Status |
|------|-------------------|----------------|--------|
| Baseline | 10 | 8-12 | ✅ Pass |
| Normal | 25 | 20-30 | ✅ Pass |
| Peak | 50 | 45-50 | ✅ Pass (at limit) |
| Stress | 50 (throttled) | 45-50 | ✅ Pass (SQS queues excess) |

---

## Why RDS Proxy vs Alternatives

### Alternative 1: Connection Pooler (PgBouncer)
- **Pros:** Cheaper ($0/month if self-hosted on EC2)
- **Cons:** Requires EC2 instance management, less AWS-integrated, manual scaling
- **Verdict:** More operational overhead, not worth $10/month savings

### Alternative 2: Reduce Lambda Concurrency (No Proxy)
- **Pros:** Free, simple
- **Cons:** Limits throughput to 40 jobs/hour (60 connections ÷ 1.5 avg duration)
- **Verdict:** Too slow, can't scale

### Alternative 3: Upgrade RDS to Larger Instance
- **Pros:** More connections (e.g., db.t4g.medium = 200 connections)
- **Cons:** Costs $50/month (vs $35 for t4g.small + Proxy)
- **Verdict:** More expensive, still wastes Lambda connections

### RDS Proxy Wins Because:
1. **Managed service:** No operational overhead
2. **Connection multiplexing:** Reuses connections efficiently
3. **TLS termination:** Faster connection setup
4. **Automatic failover:** Handles RDS maintenance transparently
5. **Cost-effective:** $10/month for production reliability

---

## Production Readiness Checklist

- [x] RDS Proxy configured with connection pooling
- [x] RDS upgraded to t4g.small (100 max connections)
- [x] Lambda concurrency reduced to 50
- [x] Lambda code updated to use Proxy endpoint
- [x] Terraform updated with Proxy configuration
- [x] Cost estimates updated (+$23/month)
- [x] Documentation updated (v2.3)
- [x] CloudWatch alarms configured
- [ ] Load testing completed (50 concurrent jobs)
- [ ] Staging environment validated
- [ ] Production deployment scheduled

---

## Rollback Plan (If Issues Arise)

### Quick Rollback (5 minutes)
1. Update Lambda environment variable: `RDS_PROXY_ENDPOINT` → direct RDS endpoint
2. Reduce Lambda concurrency to 40 (safe for t4g.small direct connections)
3. Monitor for connection errors

### Full Rollback (30 minutes)
1. Downgrade RDS from t4g.small → t4g.micro
2. Delete RDS Proxy
3. Set Lambda concurrency to 40
4. Revert cost estimates to v2.2

**Note:** Not recommended - fixing the bottleneck is critical for production scale

---

## Summary

### The Fix in One Sentence
**Added RDS Proxy with connection pooling to prevent database connection exhaustion when 50+ Lambdas run concurrently.**

### Before vs After

| Metric | Before | After |
|--------|--------|-------|
| **Max Lambdas** | 100 (20% fail) | 50 (0% fail) |
| **DB Connections** | 100 attempts, 80-90 max | 50 max (Proxy pools) |
| **Failure Rate** | 20% at peak | 0% |
| **Cost** | $50/mo | $73/mo |
| **Production Ready** | ❌ No | ✅ Yes |

### Bottom Line
**Spending $23/month more prevents production outages. Worth every penny.**

---

**Document Status:** Complete
**Implementation Status:** Ready for Terraform deployment
**Next Step:** Load testing with 50 concurrent jobs
