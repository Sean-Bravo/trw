# Google Ads Funnel — Incident & Fix (2026-02-12)

## Problem

The `/upload` Google Ads landing page was live and receiving paid traffic, but **uploads were silently failing** — every user who tried to upload a CSV hit a `401 Unauthorized` response.

### Root Cause

Two API route files were edited locally to allow anonymous (no-auth) uploads but **were never committed or deployed**:

- `app/api/uploads/presigned-url/route.ts`
- `app/api/uploads/[uploadId]/confirm/route.ts`

The landing page commit (`8c81786`) only included the new page files (`app/upload/page.tsx`, `app/upload/layout.tsx`, `ARCHITECTURE.md`). The API route changes existed only as uncommitted working tree edits.

### Additional Issue

Vercel's deployed version was stuck at commit `9233f94` (from Jan 31), 9 commits behind `origin/main`. The `/upload` page itself was returning a **404 "Page not found"** to all Google Ads traffic. An empty commit push (`ce38494`) triggered a fresh Vercel build and resolved the 404.

### Impact

- **All Google Ads traffic from campaign launch through Feb 12 landed on a 404 or broken upload**
- Day 2 stats: $3.79 spent, 14 clicks, 0 uploads received
- 96% of traffic was mobile (users unlikely to have a CSV on phone regardless)

## Fix

### 1. Trigger Vercel Deploy (commit `ce38494`)

Empty commit pushed to `main` to force Vercel to rebuild from the latest code. This fixed the 404 — the `/upload` landing page started rendering correctly.

### 2. Commit Anonymous Upload Fix (commit `98866ec`)

Committed and pushed the two API route changes that remove the auth gate:

**`app/api/uploads/presigned-url/route.ts`** — Before:
```typescript
const session = await getServerSession(authOptions);
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
const userId = session.user.id;
```

After:
```typescript
const session = await getServerSession(authOptions);
const userId = session?.user?.id || `anon-${identifier}`;
```

**`app/api/uploads/[uploadId]/confirm/route.ts`** — Same pattern: removed 401 gate, added `anon-${identifier}` fallback using IP from `getClientIdentifier(request)`.

### Verification

```bash
# Before fix
curl -s -X POST "https://www.taxformatter.com/api/uploads/presigned-url" \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.csv","fileSize":100}'
# {"error":"Unauthorized"}  (HTTP 401)

# After fix
# Returns presigned S3 URL with x-amz-meta-user-id=anon-{ip}  (HTTP 200)
```

## Lessons

1. **Always verify uncommitted changes before declaring a task complete.** Run `git status` after every multi-file change to catch orphaned edits.
2. **Smoke-test the deployed URL, not just local.** A `curl` to the production endpoint would have caught both the 404 and the 401 immediately.
3. **Vercel auto-deploy can silently stall.** When 9 commits were pushed without a corresponding deploy, there was no alert. Consider adding a deploy verification step or monitoring.

## Current State

- `/upload` landing page: **live and functional**
- Anonymous uploads: **working** (S3 key prefix: `uploads/{jobId}/{filename}`, userId stored as `anon-{ip}`)
- Google Ads funnel: **end-to-end operational**
- Known limitation: anonymous uploads create orphan jobs that can't be linked to accounts created later (intentional — deferred until after parser validation)
