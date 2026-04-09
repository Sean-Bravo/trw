# TaxFormatter Reliability Guide

**Date:** 2026-04-09
**Scope:** Operational resilience — retries, timeouts, idempotency, graceful degradation, monitoring.
**Audience:** Engineers on-call for TaxFormatter and anyone touching the payment, AI, or file-processing paths.
**Companion document:** `SECURITY_AUDIT.md` covers security vulnerabilities. This doc covers availability and correctness under failure.

---

## Executive Summary

TaxFormatter's happy path is well built: modern Next.js App Router, clean Lambda handlers, parameterized SQL, proper DLQs on SQS. The gap is **failure-mode engineering**: what happens when Anthropic returns 529, when Neon hiccups, when a Stripe webhook DB write fails halfway through, when a Lambda cold-starts during a traffic spike.

Today, many of those failure modes surface as user-visible 500s, partial state, or silently dropped work. None are catastrophic individually — this app mostly gets away with it because traffic is modest — but together they define a ceiling the product will hit as volume grows.

### The top ten reliability gaps (ordered by blast radius)

| # | Gap | Where | Current behavior | Target |
|---|-----|-------|------------------|--------|
| 1 | **No retry on Anthropic/Gemini/OpenAI calls** | `backend/services/ai_insights.py` | Single attempt; 529 or timeout → error returned | Exponential backoff + model fallback |
| 2 | **In-memory webhook idempotency** | `app/api/webhooks/stripe/route.ts:11` | `Set<string>` lost on deploy; 10k-event cap | Postgres `processed_webhook_events` table |
| 3 | **Webhook DB writes not transactional** | `app/api/webhooks/stripe/route.ts:77-170` | Partial-state if any query fails mid-handler | Single transaction or saga with compensating writes |
| 4 | **In-memory rate limiter** | `lib/rate-limit.ts` | Evaporates on Lambda cold start, not shared across instances | Upstash Redis or DynamoDB-backed |
| 5 | **No `/api/health` endpoint** | — | Uptime monitors can't distinguish "site responds" from "DB reachable" | Dedicated readiness check |
| 6 | **Sentry `tracesSampleRate: 1`** | `sentry.*.config.ts` | 100% tracing = bill + noise; no budget | Sample by route class |
| 7 | **No reserved Lambda concurrency** | `backend/terraform/lambda.tf` | Cold starts during bursts; unbounded upper limit | Reserved on processor + API; provisioned on API |
| 8 | **Manual-only job retry** | `lib/jobs-db.ts`, `upload-client.ts` | User must click retry; no auto-retry counter | Auto-retry with backoff up to 3 attempts |
| 9 | **No timeout override on Stripe SDK** | `lib/stripe.ts:1-9` | SDK default 80s; Vercel route 10s → orphaned calls | Explicit 15s timeout |
| 10 | **Broad `except Exception`** | `backend/handlers/*.py` | Catch-all masks root cause | Narrow exception classes, re-raise unknowns |

---

## 1. External API resilience

### 1.1 Anthropic Claude

**Current state** (`backend/services/ai_insights.py:55-97`):

```python
# single attempt, no retry
message = client.messages.create(
    model=self.model,
    max_tokens=2048,
    messages=[{"role": "user", "content": prompt}],
)
# catches `Exception` broadly
```

Any `overloaded_error` (529), rate-limit (429), transient network blip, or Anthropic incident → immediate failure, returned to the caller as `{"success": False, "error": str(e)}`.

**Why this matters:** Anthropic's `529 overloaded_error` is **expected under normal load**. It means "retry in a few seconds on a different capacity pool." Treating it as fatal is wrong; a retry almost always succeeds.

**Fix:**

```python
import time, random, anthropic

def call_claude_with_resilience(client, *, model, messages, max_tokens, max_attempts=5):
    """Claude call with exponential backoff + jitter + model fallback."""
    fallback_models = [model, "claude-sonnet-4-6", "claude-haiku-4-5-20251001"]
    last_err = None

    for attempt in range(max_attempts):
        current_model = fallback_models[min(attempt // 2, len(fallback_models) - 1)]
        try:
            return client.messages.create(
                model=current_model,
                max_tokens=max_tokens,
                messages=messages,
                timeout=30.0,           # override SDK default
            )
        except anthropic.APIStatusError as e:
            last_err = e
            retryable = e.status_code in (408, 429, 500, 502, 503, 504, 529)
            if not retryable or attempt == max_attempts - 1:
                raise
            delay = min(2 ** attempt + random.uniform(0, 1), 30)
            logger.warning(
                "Claude %s → retrying in %.1fs (attempt %d/%d)",
                e.status_code, delay, attempt + 1, max_attempts,
            )
            time.sleep(delay)
        except (anthropic.APITimeoutError, anthropic.APIConnectionError) as e:
            last_err = e
            if attempt == max_attempts - 1:
                raise
            time.sleep(min(2 ** attempt, 30))

    raise last_err
```

**Why this shape:**

- **Exponential backoff with jitter.** `2^attempt + random(0,1)` — jitter is essential. Without it, all clients retry at the same tick and the thundering herd re-overloads the fleet.
- **Model fallback.** Attempts 0–1 use the requested model (probably Opus); 2–3 fall back to Sonnet; 4 falls back to Haiku. Users get insights even during Opus-specific outages. For the AI insights use case, all three models produce acceptable output.
- **Explicit 30s timeout.** SDK default is longer; the backend Lambda has a 300s total budget but we want to fail fast on this particular call so the rest of processing continues.
- **Narrow exception types.** `APIStatusError`, `APITimeoutError`, `APIConnectionError` are the retryable class. Everything else (authentication, bad request, etc.) re-raises immediately.

### 1.2 Google Gemini

**Current state** (`backend/services/ai_insights.py:190-267`):

```python
# uses raw urllib.request.urlopen with 60s timeout
# no retry on transient failures
```

**Fix:** Same backoff pattern as Claude. Prefer migrating to the official `google-generativeai` SDK, which provides better error typing. If you want to keep `urllib` (one fewer dependency):

```python
import urllib.error, urllib.request, json, time, random

def call_gemini_with_resilience(url, payload, headers, max_attempts=4):
    for attempt in range(max_attempts):
        try:
            req = urllib.request.Request(
                url, data=json.dumps(payload).encode(),
                headers=headers, method="POST",
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            retryable = e.code in (429, 500, 502, 503, 504)
            if not retryable or attempt == max_attempts - 1:
                raise
            # respect Retry-After header if present
            retry_after = e.headers.get("Retry-After")
            delay = int(retry_after) if retry_after and retry_after.isdigit() else min(2 ** attempt + random.random(), 30)
            time.sleep(delay)
        except urllib.error.URLError:
            if attempt == max_attempts - 1:
                raise
            time.sleep(min(2 ** attempt, 30))
```

**Gemini-specific note:** Gemini returns `429` with a `Retry-After` header when quota is exhausted. Honor it — Google's quota enforcement treats ignored `Retry-After` as abuse.

### 1.3 Multi-provider strategy

The AI insights feature calls Claude, Gemini, and OpenAI in `backend/services/ai_insights.py`. Today these are separate code paths. Consolidate into a single resilient wrapper:

```python
PROVIDERS = [
    ("claude-opus-4-6",           call_claude),
    ("claude-sonnet-4-6",         call_claude),
    ("gemini-1.5-pro",            call_gemini),
    ("claude-haiku-4-5-20251001", call_claude),
]

def generate_insights(prompt):
    for model, fn in PROVIDERS:
        try:
            return fn(model=model, prompt=prompt)
        except Exception as e:
            logger.warning("provider %s failed: %s; trying next", model, e)
    raise AIProvidersExhaustedError("all providers failed")
```

**Design note:** Order matters. First-choice is the highest-quality model; fallbacks descend in quality but rise in availability. Don't fall back to a *more expensive* model on failure — that inverts the cost curve during incidents exactly when you least want it.

### 1.4 Stripe

**Current state** (`lib/stripe.ts:1-9`):

```ts
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
});
```

No explicit timeout; Stripe SDK default is **80 seconds**. Vercel Hobby functions time out at **10 seconds**, Pro at **60 seconds**. If Stripe is slow, your function dies before Stripe responds — leaving Stripe with an open intent and your code with no record.

**Fix:**

```ts
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
  timeout: 15_000,           // 15s — must be less than your Vercel function timeout
  maxNetworkRetries: 3,       // Stripe SDK has built-in retry; just enable it
});
```

`maxNetworkRetries: 3` is the magic line most teams miss. Stripe SDK already implements idempotent retry with backoff — you just have to turn it on. It retries on network errors and 5xx by default, and it sends an `Idempotency-Key` automatically for mutating calls.

**For checkout session creation specifically** (`app/api/developer/subscribe/route.ts`), pass your own idempotency key so double-clicks don't create duplicate sessions:

```ts
await stripe.checkout.sessions.create(
  { /* ... */ },
  { idempotencyKey: `subscribe-${session.user.id}-${apiKeyId}-${Date.now() >> 16}` }
);
```

The `>> 16` truncates the timestamp to ~65-second buckets so refresh-happy users don't spawn new sessions, but retries within the same bucket are deduped.

### 1.5 Neon Postgres

**Current state** (`lib/db.ts:16-61`):

- Lazy `neon(getDatabaseUrl())` HTTP client
- No explicit connection pooling
- No timeout config (Neon HTTP default is ~30s)
- Errors logged and rethrown; no retry

**Why Neon's HTTP driver is mostly fine:** It's stateless, serverless-friendly, and handles connection pooling at the Neon edge. You don't need `pg-pool` for typical Next.js workloads.

**What to add:**

```ts
import { neon, neonConfig } from '@neondatabase/serverless';

neonConfig.fetchConnectionCache = true;   // reuse connections across cold calls
neonConfig.fetchFunction = (url, opts) =>
  fetch(url, { ...opts, signal: AbortSignal.timeout(10_000) });

const sql = neon(getDatabaseUrl());
```

Add a retry helper for read-only queries (never retry writes without an idempotency key — you'll double-insert):

```ts
export async function queryOneWithRetry<T>(sql: string, params: unknown[]): Promise<T | null> {
  const RETRYABLE = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', '57P03'];  // 57P03 = cannot_connect_now
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await queryOne<T>(sql, params);
    } catch (e: any) {
      if (attempt === 2 || !RETRYABLE.some(code => String(e).includes(code))) throw e;
      await new Promise(r => setTimeout(r, 100 * (attempt + 1) ** 2));
    }
  }
  return null;
}
```

Only use `queryOneWithRetry` for **reads** (SELECT). Never for INSERT/UPDATE/DELETE without a unique constraint catching duplicates.

### 1.6 Resend (transactional email)

**Current state** (`lib/email.ts`): Nodemailer transporter created per call, default timeout, no retry.

**Fix:** Resend is among the most reliable external dependencies, but mail is async-tolerant by nature — fire-and-forget it:

```ts
export async function sendVerificationEmail(to: string, code: string) {
  try {
    await Promise.race([
      transporter.sendMail({ /* ... */ }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('mail timeout')), 8000)),
    ]);
  } catch (e) {
    logger.error('mail send failed', { to, error: String(e) });
    // enqueue for background retry — do NOT fail the API request
    await enqueueEmailRetry({ to, code });
  }
}
```

Users should never see a 500 because email was slow. The verification code is in the DB already — if the mail fails, they click "resend" and try again.

---

## 2. Webhook reliability

### 2.1 Idempotency

**Current state** (`app/api/webhooks/stripe/route.ts:11-57`):

```ts
const processedEvents = new Set<string>();
const MAX_PROCESSED_EVENTS = 10_000;

if (processedEvents.has(event.id)) {
  return NextResponse.json({ received: true, duplicate: true });
}
```

This is broken three ways:

1. **Cold start wipes it.** Vercel spins up new instances on demand; the `Set` is empty each time.
2. **Multiple concurrent instances don't share state.** A retry landing on a different warm instance sees no history.
3. **The 10k cap evicts old events silently.** An event processed 10,001 events ago is treated as fresh again.

**Fix:** Persist to Postgres with atomic check-and-set.

```sql
CREATE TABLE processed_webhook_events (
  id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- Cleanup job: run daily
DELETE FROM processed_webhook_events WHERE processed_at < now() - interval '30 days';
```

```ts
// INSERT ... ON CONFLICT gives atomic check-and-set
const result = await execute(
  `INSERT INTO processed_webhook_events (id, event_type)
   VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
  [event.id, event.type]
);
if (result.rowCount === 0) {
  return NextResponse.json({ received: true, duplicate: true });
}
```

Stripe retains webhook events for 30 days and only retries within that window, so the cleanup cadence matches Stripe's redelivery horizon.

### 2.2 Transactional writes

**Current state** (`app/api/webhooks/stripe/route.ts:77-170`): A single handler issues multiple `execute()` and `queryOne()` calls sequentially. If any one fails mid-stream, you get a half-applied update — API key upgraded but subscription ID not saved, for example.

**Fix:** Wrap the writes in a transaction. Neon HTTP doesn't support multi-statement transactions directly; you need either `neonConfig.fetchConnectionCache = true` with the pooler endpoint, or switch to `@neondatabase/serverless`'s pooled client for this one route:

```ts
import { Pool } from '@neondatabase/serverless';
const pool = new Pool({ connectionString: getDatabaseUrl() });

// inside the handler
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO processed_webhook_events ...', [event.id, event.type]);
  await client.query('UPDATE api_keys SET tier = $1, stripe_subscription_id = $2 WHERE id = $3',
    [tier, subId, keyId]);
  await client.query('INSERT INTO billing_events ...', [...]);
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

If the transaction fails after the idempotency insert but before the upgrade, the `processed_webhook_events` row rolls back with everything else → Stripe retries → next attempt succeeds. That's exactly what you want.

### 2.3 Webhook return code semantics

Stripe interprets return codes strictly:

| Code | Stripe behavior |
|------|-----------------|
| `2xx` | Accepted, no retry |
| `4xx` | Failed, **no retry** — Stripe assumes your code is broken |
| `5xx` | Failed, **will retry** with exponential backoff over 3 days |

**Do not** return 400 on application errors that you want Stripe to retry. If the DB is down, return 500. If the signature is invalid, return 400 (not a retry situation). If the event type is unknown, return 200 (you handled it by choosing to ignore it).

Current code mostly gets this right, but audit `/app/api/webhooks/stripe/route.ts` to confirm: are any error paths returning 400 when they should be 500?

---

## 3. Rate limiting

**Current state** (`lib/rate-limit.ts`):

```ts
const store: RateLimitStore = {};
// in-memory Map; cleanup every 5 min
```

**Why this fails on Vercel:**
- Every cold start creates a fresh store → first request on a new instance is always allowed
- Vercel runs multiple concurrent instances → limits are per-instance, so actual limit is `configured × instance_count`
- After a traffic dip and re-scale, the limit effectively resets

**For an auth endpoint allowing 5 attempts per 15 minutes, the actual allowed rate is closer to `5 × warm_instance_count` — possibly 50+ during traffic.** Brute-force protection is largely cosmetic today.

**Fix options:**

1. **Upstash Redis** (simplest, serverless-native, has a free tier):
   ```ts
   import { Ratelimit } from '@upstash/ratelimit';
   import { Redis } from '@upstash/redis';

   export const rateLimiters = {
     auth: new Ratelimit({
       redis: Redis.fromEnv(),
       limiter: Ratelimit.slidingWindow(5, '15 m'),
       analytics: true,
     }),
     api: new Ratelimit({
       redis: Redis.fromEnv(),
       limiter: Ratelimit.slidingWindow(100, '1 m'),
     }),
   };
   ```

2. **DynamoDB with conditional writes** — free tier is generous, fits your AWS footprint, but more code to write.

3. **Postgres with `tablefunc` or a simple counter table** — works, but hammers the DB on every request. Acceptable for low-volume endpoints only.

Recommendation: **Upstash.** It's built for this and integrates with Vercel in two env vars.

---

## 4. Graceful degradation

### 4.1 AI insights are optional — verify they stay optional

Processor `backend/handlers/processor.py:294-301` already degrades gracefully: if AI insight generation throws, `quick_stats` is still returned and the job completes. Good.

**But:** the frontend doesn't distinguish "AI insights skipped due to upstream failure" from "AI insights not yet generated" from "AI insights not applicable for this plan tier." User sees the same blank section in all three cases.

**Fix:** Add an `ai_insights_status` enum to the job result: `"success" | "skipped_provider_error" | "skipped_plan_tier" | "skipped_not_applicable"`. Render a small banner explaining the status. A user paying for AI insights needs to know when they didn't get what they paid for.

### 4.2 DB down → API response

Current pattern in API routes:

```ts
try {
  const result = await queryOne(...);
  return NextResponse.json(result);
} catch (e) {
  return NextResponse.json({ error: 'Internal error' }, { status: 500 });
}
```

This is correct but there's no differentiation. If Neon is down for 30 seconds (a routine Neon autoscale pause), every user sees a generic 500. Better UX:

```ts
catch (e) {
  if (isDatabaseConnectionError(e)) {
    return NextResponse.json(
      { error: 'Service temporarily unavailable, please retry in a few seconds' },
      { status: 503, headers: { 'Retry-After': '5' } }
    );
  }
  captureException(e);
  return NextResponse.json({ error: 'Internal error' }, { status: 500 });
}
```

`503 + Retry-After` tells well-behaved clients (and browsers) to retry automatically. It also keeps Sentry signal clean — 503s are a known failure class, 500s are unknown bugs.

### 4.3 Read-your-writes consistency during Neon failover

Neon's HTTP driver routes to the primary. During a failover (rare but happens), reads may briefly lag writes. For operations where the user expects immediate visibility (just uploaded a file, expects it in the list), add a short retry loop with a brief delay:

```ts
async function waitForJob(jobId: string, timeoutMs = 2000): Promise<Job | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const job = await queryOne<Job>('SELECT * FROM jobs WHERE id = $1', [jobId]);
    if (job) return job;
    await new Promise(r => setTimeout(r, 100));
  }
  return null;
}
```

Use sparingly — only on paths where eventual consistency would confuse the user.

---

## 5. Health checks and monitoring

### 5.1 Add `/api/health`

There is no health endpoint today. Every uptime monitor watching TaxFormatter can only tell you the marketing page loads. Add:

```ts
// app/api/health/route.ts
export async function GET() {
  const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};

  // DB — fast, reads only
  const dbStart = Date.now();
  try {
    await queryOne('SELECT 1 as ok');
    checks.db = { ok: true, latencyMs: Date.now() - dbStart };
  } catch (e) {
    checks.db = { ok: false, error: String(e).slice(0, 200) };
  }

  // Stripe — skip in health (hits their rate limit); rely on webhook observability

  const allOk = Object.values(checks).every(c => c.ok);
  return NextResponse.json(
    { status: allOk ? 'healthy' : 'degraded', checks, timestamp: new Date().toISOString() },
    { status: allOk ? 200 : 503 }
  );
}
```

**Do not** hit external APIs from the health endpoint. Health checks should exercise *your* dependencies, not partners' — otherwise partners' slowness paints you as unhealthy.

Point a BetterStack / UptimeRobot / AWS Route53 check at this URL every 60 seconds. Alert on 2 consecutive failures.

### 5.2 Sentry sampling

**Current state:** `tracesSampleRate: 1` (100%) in all three Sentry configs. Every request is a traced transaction. On a busy day this gets expensive fast and drowns signal in noise.

**Fix:**

```ts
Sentry.init({
  // ...
  tracesSampler(samplingContext) {
    const url = samplingContext.request?.url || '';
    if (url.includes('/api/health')) return 0;              // never trace health
    if (url.includes('/api/webhooks/')) return 1;           // always trace webhooks
    if (url.includes('/api/auth/')) return 0.5;             // half of auth
    if (samplingContext.parentSampled === true) return 1;   // continue traces
    return 0.1;                                             // 10% of everything else
  },
});
```

Health endpoint at 0% (pure spam otherwise); webhooks at 100% (critical business logic, low volume); everything else at 10% (representative sample).

### 5.3 Structured logging

**Current state:** Python backend uses `logger.info()` / `logger.error()` with plain strings. Next.js uses `console.log()`.

**Fix (Python):**

```python
import logging, json, os

class JsonFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({
            'ts': self.formatTime(record, '%Y-%m-%dT%H:%M:%S.%f'),
            'level': record.levelname,
            'msg': record.getMessage(),
            'logger': record.name,
            'request_id': getattr(record, 'request_id', None),
            'job_id': getattr(record, 'job_id', None),
            'user_id': getattr(record, 'user_id', None),
            **(record.extra if hasattr(record, 'extra') else {}),
        })

handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
logging.basicConfig(handlers=[handler], level=os.environ.get('LOG_LEVEL', 'INFO'))
```

CloudWatch Logs Insights parses JSON automatically — queries like `fields @timestamp, msg | filter request_id = 'req_xyz'` become trivial.

**Fix (Next.js):** Use `pino` or similar:

```ts
import pino from 'pino';
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: { level: (label) => ({ level: label }) },
  timestamp: pino.stdTimeFunctions.isoTime,
});
```

### 5.4 Request correlation

Every request should have a `X-Request-Id` header that flows from the frontend → Next.js API route → Lambda → DB query logs. Today each system generates its own ID (or doesn't) and there's no way to trace a single user interaction across the stack.

Add Next.js middleware:

```ts
// middleware.ts
export function middleware(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  const res = NextResponse.next({ request: { headers: new Headers(req.headers) } });
  res.headers.set('x-request-id', requestId);
  return res;
}
```

Pass `X-Request-Id` through to Lambda calls; log it everywhere. This is the single highest-leverage investment in debugging productivity.

---

## 6. Lambda capacity and cold starts

### 6.1 Reserved concurrency

**Current state** (`backend/terraform/lambda.tf`): No `reserved_concurrent_executions` on any function. Cold starts bite on every scale event.

**Fix:**

```hcl
resource "aws_lambda_function" "processor" {
  # ...
  reserved_concurrent_executions = 10   # minimum guaranteed capacity
}

resource "aws_lambda_function" "api" {
  # ...
  reserved_concurrent_executions = 20
}
```

"Reserved" means two things: (1) guaranteed capacity — no other function in your account can starve it — and (2) a hard ceiling — it won't scale above this number, which bounds runaway costs.

### 6.2 Provisioned concurrency for the API Lambda

Users notice API latency. Processors can cold-start without users caring.

```hcl
resource "aws_lambda_provisioned_concurrency_config" "api" {
  function_name                     = aws_lambda_function.api.function_name
  provisioned_concurrent_executions = 2
  qualifier                         = aws_lambda_alias.api_live.name
}
```

Two warm instances costs ~$15/month and eliminates cold-start latency (~500ms → ~5ms) for the first two concurrent users. Scale up if you see cold-start tail latency in Sentry traces.

### 6.3 Lambda timeouts align with Vercel function timeouts

Vercel API routes have their own timeouts (10s Hobby, 60s Pro, 800s Pro with `maxDuration` override). When a Vercel route calls a Lambda, the shorter of the two wins — and if Vercel times out first, you get an orphaned Lambda execution still running in the background.

Current Lambda timeouts:
- Webhook: 60s
- Scanner: 300s
- Processor: 300s
- API Lambda: 120s

If your Vercel function is Pro (60s default) and calls the API Lambda (120s), you can hit a state where Vercel gives up, returns 504 to the user, but the Lambda is still running and eventually updates the DB — the user thinks their operation failed and retries, now you have two Lambdas doing the same work.

**Fix:**
1. Document Vercel function timeouts in one place.
2. Set Lambda timeouts to **less than** the Vercel route timeout minus a buffer.
3. Use `AbortSignal.timeout(vercelTimeout - 1000)` on `fetch()` calls to Lambda from Next.js routes — fail fast if Lambda isn't responding.

### 6.4 DLQ monitoring

**Current state:** SQS DLQ configured with `maxReceiveCount = 3`, alarm on depth > 0. Good.

**Gap:** No automated replay. When a message lands in the DLQ, someone has to notice and manually redrive. Add a scheduled Lambda that replays DLQ messages on a cadence (every 30 min) up to N attempts, then gives up permanently. AWS has built-in redrive now (`redrive_allow_policy`) — use it.

---

## 7. Job retry and state machine

### 7.1 Persist retry counter

**Current state** (`lib/jobs-db.ts`): Jobs have `status` but no `attempts` counter or `last_error` tracking for retries.

**Fix:**

```sql
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS attempts integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz;
```

A state machine:

```
queued → running → succeeded
       ↘       ↘ failed (attempts < 3) → queued (next_retry_at = now + backoff)
         ↘              ↘ failed (attempts >= 3) → failed_permanent
```

### 7.2 Distinguish user-retriable from permanently-failed

Not every failure deserves auto-retry. A corrupt file will fail 3 times in a row and waste your budget. Categorize:

```python
class ParseError(Exception): pass         # user file is bad → no retry
class TransientError(Exception): pass     # upstream hiccup → retry
class ConfigError(Exception): pass        # our bug → alert, no retry
```

In the handler:

```python
try:
    result = engine.process_file(key)
except ParseError as e:
    mark_job_failed_permanent(job_id, str(e))
except (TransientError, anthropic.APIStatusError) as e:
    mark_job_for_retry(job_id, str(e))
except Exception as e:
    logger.exception("unknown error processing job")
    sentry_sdk.capture_exception(e)
    mark_job_failed_permanent(job_id, "internal error")
```

**Principle:** only retry errors you have evidence are transient. Retrying unknown errors burns money and noise without improving success rate.

---

## 8. Budget enforcement (cost reliability)

An often-overlooked form of reliability: **what keeps a bad actor from running up your AI bill?**

TaxFormatter calls Claude/Gemini per bank statement processed. If an attacker finds a way to trigger processing in a loop (see `SECURITY_AUDIT.md` §M-15 on weak anonymous rate limits), they can burn through your monthly AI budget in hours.

**Fix: enforce a per-user budget at the application layer.**

```sql
CREATE TABLE user_ai_usage (
  user_id uuid NOT NULL,
  date date NOT NULL,
  tokens_input integer DEFAULT 0,
  tokens_output integer DEFAULT 0,
  cost_usd numeric(10, 4) DEFAULT 0,
  PRIMARY KEY (user_id, date)
);
```

Before each AI call:

```python
def check_budget(user_id):
    daily_usage = get_daily_usage(user_id)
    if daily_usage.cost_usd >= PLAN_LIMITS[user.plan]['daily_ai_budget']:
        raise BudgetExceededError(f"Daily AI budget exhausted")
```

After each AI call, record the actual cost from the response's usage metadata.

**Plan limits:**

| Plan | Daily AI budget |
|------|-----------------|
| Free | $0.50 |
| Starter | $2.00 |
| Growth | $10.00 |
| Business | $50.00 |

These numbers are hypothetical — size them against your observed cost per statement and your pricing.

---

## 9. Runbook: common incidents

### Incident: "Anthropic returns 529 burst"

**Symptoms:** AI insight generation fails for 10% of jobs; Sentry shows `overloaded_error`.

**Response:**
1. Check https://status.anthropic.com — is there an active incident?
2. If yes: let the retry logic handle it. Monitor `ai_insights_status` distribution in logs.
3. If persistent (>15 min), temporarily force model fallback to Haiku by setting `AI_INSIGHTS_FALLBACK_ONLY=true` environment variable (add this toggle to `ai_insights.py`).
4. Post-incident: review whether model fallback kicked in correctly. Failing forward to Haiku should be transparent to users.

### Incident: "Stripe webhooks failing"

**Symptoms:** Stripe dashboard shows webhook delivery failures. Sentry shows 500s in `/api/webhooks/stripe`.

**Response:**
1. Check `/api/health` — is DB healthy?
2. Check Sentry transaction for the failing webhook: what's the actual error?
3. Common: DB connection issue → Stripe will retry automatically over 3 days.
4. Less common: code bug → roll back the last deploy; Stripe will redeliver the backlog.
5. Use Stripe dashboard "Resend" for webhooks from before the current retry horizon.

**Important:** Do not manually "mark as handled" on the Stripe dashboard unless you've verified the work happened via a DB query. Stripe dashboard's resolve button is a lie; it doesn't call your code.

### Incident: "Job stuck in running state"

**Symptoms:** User reports a job has been "running" for >10 minutes.

**Response:**
1. Check CloudWatch: did the processor Lambda invocation complete?
2. If Lambda completed but DB wasn't updated: the failure happened in the last step (result write). Check CloudWatch logs for the exception.
3. If Lambda is still running: wait for the 300s timeout. AWS will fail it and SQS will retry per `maxReceiveCount`.
4. If Lambda failed and retried through to DLQ: fix the underlying issue, redrive the DLQ.

Manual resolution: `UPDATE jobs SET status = 'failed', error = 'Manual intervention — see incident XXX' WHERE id = 'xxx'` and email the user.

### Incident: "Neon is slow or unreachable"

**Symptoms:** API responses >5s; Sentry shows `ETIMEDOUT` from Neon.

**Response:**
1. Check https://neonstatus.com.
2. Neon occasionally pauses idle compute endpoints — first query after idle can take 2-5s. Verify you're seeing first-query latency, not persistent slowness.
3. If persistent: fail fast — most API routes should 503 within 2s so user can retry.
4. Check if autoscale settings are too conservative; upgrade compute size in the Neon dashboard.

---

## 10. Reliability roadmap

### Sprint 1 — fix the foundation

1. Webhook idempotency → Postgres (§2.1)
2. Webhook writes → transaction (§2.2)
3. Stripe SDK `maxNetworkRetries: 3` + 15s timeout (§1.4)
4. `/api/health` endpoint (§5.1)

### Sprint 2 — external API resilience

5. Claude retry + backoff + model fallback (§1.1)
6. Gemini retry + Retry-After honoring (§1.2)
7. Multi-provider wrapper consolidation (§1.3)
8. Neon read retry helper (§1.5)

### Sprint 3 — infrastructure and observability

9. Rate limiter → Upstash Redis (§3)
10. Sentry sampling strategy (§5.2)
11. Structured logging Python + Next.js (§5.3)
12. Request ID correlation (§5.4)
13. Lambda reserved concurrency (§6.1)
14. Provisioned concurrency on API Lambda (§6.2)

### Sprint 4 — job lifecycle and budget

15. Jobs table retry counter + state machine (§7.1)
16. Error categorization: transient / permanent / user-fault (§7.2)
17. Per-user AI budget enforcement (§8)
18. DLQ automated replay

### Ongoing

- Quarterly load test the happy path + key failure modes
- Review Sentry top errors weekly
- Check CloudWatch alarm noise ratio monthly — tune thresholds
- Dependency updates monthly (Anthropic SDK, Stripe SDK, Neon SDK) — these are the APIs that change meaningfully

---

## Appendix A — The reliability checklist for new endpoints

When adding a new API route, verify:

- [ ] Timeout: explicit `AbortSignal.timeout()` on all external calls
- [ ] Retry: retryable classes identified, backoff implemented for each
- [ ] Idempotency: mutations are safe to retry (unique constraint, idempotency key, or transaction)
- [ ] Error classification: transient vs permanent vs user-fault
- [ ] Return codes: 4xx for client bugs, 5xx for server bugs, 503 + Retry-After for transient unavailability
- [ ] Logging: structured, includes request_id, does NOT log secrets or PII (see `SECURITY_AUDIT.md`)
- [ ] Sentry: `captureException` on unknown errors, `setContext` with relevant request data
- [ ] Rate limit: appropriate limiter applied (`rateLimiters.auth`, `rateLimiters.api`, etc.)
- [ ] Auth: ownership check for user-scoped resources (see `SECURITY_AUDIT.md` §H-1, §H-2)
- [ ] Timeouts ladder: external timeout < Lambda timeout < Vercel function timeout
- [ ] Test: at least one test for the error path, not just the happy path

---

## Appendix B — Useful external references (no links — verify before using)

- **Anthropic:** SDK automatically retries 408/429/500/502/503/504/529; configurable via `max_retries`. Check the current SDK docs for the exact retry config.
- **Stripe:** Idempotency keys are idempotent for 24 hours; SDK supports `maxNetworkRetries` with built-in backoff. Signature verification requires the raw request body — App Router needs `runtime: 'nodejs'`.
- **Neon:** HTTP driver supports connection caching via `neonConfig.fetchConnectionCache`. Pooled pg client available for transaction workloads.
- **Upstash:** Serverless Redis with REST API; Ratelimit package provides sliding window, token bucket, and fixed window out of the box.
- **Vercel:** Function timeout depends on plan (10s Hobby, 60s Pro default, up to 800s on Pro with `maxDuration`). Regional functions have lower latency than edge for DB-heavy workloads.
- **AWS Lambda:** Reserved concurrency is both a guarantee and a ceiling. Provisioned concurrency eliminates cold starts but costs even when idle.

Always verify specifics against current docs — these APIs evolve.

---

## Appendix C — What's NOT in this document

- **Security vulnerabilities** — see `SECURITY_AUDIT.md`
- **Architecture / system design** — see `ARCHITECTURE.md`
- **Deployment pipeline reliability** (CI/CD flakiness, rollback procedures) — separate doc
- **Incident response process** (who gets paged, escalation, postmortem template) — separate doc
- **Load testing methodology** — separate doc
- **Disaster recovery** (cross-region failover, backup restoration rehearsal) — separate doc
- **Compliance controls** (SOC 2, GLBA, state privacy laws) — separate doc

---

**End of reliability guide.**

*Grounded in a direct scan of the codebase on 2026-04-09. Recommendations are based on what actually exists today — verify against the current code before implementing any change.*
