# Sentry Setup Guide

This guide will help you set up Sentry error tracking for TaxReadyWallet.

## 1. Create a Sentry Account

1. Go to [sentry.io](https://sentry.io) and sign up for a free account
2. Create a new organization (or use an existing one)
3. Create a new project:
   - Choose **Next.js** as the platform
   - Name it `taxreadywallet` (or your preferred name)

## 2. Get Your Sentry DSN

After creating the project, you'll see your DSN (Data Source Name). It looks like:
```
https://abc123def456@o123456.ingest.sentry.io/7891011
```

## 3. Generate an Auth Token

For uploading source maps during builds:

1. Go to Settings → Account → API → Auth Tokens
2. Click "Create New Token"
3. Select scopes:
   - `project:read`
   - `project:releases`
   - `org:read`
4. Copy the token (you won't see it again!)

## 4. Configure Environment Variables

### Local Development (.env.local)

Create a `.env.local` file (or add to existing):

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://abc123def456@o123456.ingest.sentry.io/7891011
SENTRY_AUTH_TOKEN=your-sentry-auth-token-here
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=taxreadywallet

# Optional: Enable Sentry in development
SENTRY_DEV_MODE=false
```

### Vercel Production

Add these environment variables in your Vercel dashboard:

1. Go to Project Settings → Environment Variables
2. Add the following variables for **Production**:

```bash
NEXT_PUBLIC_SENTRY_DSN=https://abc123def456@o123456.ingest.sentry.io/7891011
SENTRY_AUTH_TOKEN=your-sentry-auth-token-here
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=taxreadywallet
```

**Important:** `NEXT_PUBLIC_SENTRY_DSN` is public and safe to expose. `SENTRY_AUTH_TOKEN` should be kept secret.

## 5. Configuration Files

The following files are already configured:

### ✅ `sentry.client.config.ts`
- Captures client-side errors
- Session replay for debugging
- Filters out browser extensions and irrelevant errors
- Disabled in development (unless `SENTRY_DEV_MODE=true`)

### ✅ `sentry.server.config.ts`
- Captures server-side errors
- Removes sensitive headers (authorization, cookies)
- Filters sensitive query parameters

### ✅ `sentry.edge.config.ts`
- Captures errors in Edge Runtime (middleware, edge functions)

### ✅ `next.config.ts`
- Wrapped with `withSentryConfig`
- Automatic source map uploading
- React component annotations for better debugging
- `/monitoring` tunnel route to bypass ad-blockers

### ✅ `app/global-error.tsx`
- Global error boundary that sends all React errors to Sentry
- Shows user-friendly error page

## 6. Using Sentry in Your Code

### Automatic Error Tracking

Errors are automatically captured:
- Unhandled exceptions
- Promise rejections
- React component errors
- API route errors (when using try/catch)

### Manual Error Tracking

Use the helper functions from `lib/sentry.ts`:

```typescript
import { captureException, captureMessage, addBreadcrumb, setUser } from '@/lib/sentry'

// Capture an exception with context
try {
  await riskyOperation()
} catch (error) {
  captureException(error, {
    operation: 'CSV Processing',
    userId: user.id
  })
}

// Log informational messages
captureMessage('User upgraded to Pro plan', 'info')

// Add breadcrumbs for debugging
addBreadcrumb('Started CSV upload', { fileName: 'transactions.csv' })

// Set user context (call after authentication)
setUser({
  id: user.id,
  email: user.email
})
```

### Example: API Route with Sentry

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { captureException, setContext } from '@/lib/sentry'

export async function POST(request: NextRequest) {
  try {
    // Your API logic here
    const result = await processData()
    return NextResponse.json({ success: true, result })
  } catch (error) {
    // Add context before capturing
    setContext('api', {
      endpoint: '/api/upload',
      method: 'POST',
    })
    captureException(error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## 7. Verify Setup

### Test Error Tracking

Add a test button to trigger an error:

```typescript
'use client'

export function TestSentry() {
  return (
    <button onClick={() => {
      throw new Error('Test Sentry Error!')
    }}>
      Test Sentry
    </button>
  )
}
```

After clicking, check your Sentry dashboard to see the error appear.

### Test API Error

```bash
# In your browser console or using curl
fetch('/api/checkout', {
  method: 'POST',
  body: JSON.stringify({ plan: 'invalid' })
})
```

## 8. Sentry Features to Explore

### Session Replay
- Watch video replays of user sessions where errors occurred
- See exactly what the user was doing when the error happened
- Configured to mask sensitive text and block media

### Performance Monitoring
- Track API response times
- Identify slow database queries
- Monitor frontend performance

### Release Tracking
- Each deployment creates a new release in Sentry
- Track which errors are new vs recurring
- See which releases introduced bugs

### Alerts
Set up alerts in Sentry:
1. Go to Alerts → Create Alert
2. Configure for:
   - New errors (critical issues)
   - Error spike detection
   - Performance degradation

## 9. Sample Rates (Configured)

```typescript
// Performance monitoring
tracesSampleRate: 0.1  // 10% in production, 100% in dev

// Session replay
replaysSessionSampleRate: 0.1   // 10% of all sessions
replaysOnErrorSampleRate: 1.0    // 100% of error sessions
```

**Cost Optimization:**
- Free tier: 5,000 errors/month + 500 replay sessions
- Adjust sample rates based on traffic
- Use `ignoreErrors` to filter out noise

## 10. Monitoring Tunnel

The `/monitoring` route proxies Sentry requests to bypass ad-blockers:

```typescript
// Automatically configured in next.config.ts
tunnelRoute: "/monitoring"
```

This ensures error tracking works even when users have ad-blockers enabled.

## 11. Troubleshooting

### Errors not appearing in Sentry?

1. **Check environment variables:**
   ```bash
   echo $NEXT_PUBLIC_SENTRY_DSN
   ```

2. **Verify DSN is correct:**
   - Should start with `https://`
   - Contains `@` and `ingest.sentry.io`

3. **Enable debug mode:**
   ```typescript
   // In sentry.client.config.ts
   debug: true
   ```

4. **Check browser console:**
   - Look for Sentry initialization messages
   - Check Network tab for requests to Sentry

### Source maps not uploading?

1. **Verify auth token has correct scopes:**
   - `project:read`
   - `project:releases`
   - `org:read`

2. **Check build logs:**
   ```bash
   npm run build
   # Look for "Uploading source maps" messages
   ```

3. **Verify org and project names:**
   ```bash
   SENTRY_ORG=your-actual-org-slug
   SENTRY_PROJECT=your-actual-project-name
   ```

## 12. Best Practices

### ✅ DO:
- Set user context after authentication
- Add breadcrumbs before complex operations
- Use `setContext()` to add operation-specific data
- Filter out PII (personally identifiable information)
- Use meaningful error messages

### ❌ DON'T:
- Send passwords or API keys in error context
- Capture every single error (filter noise)
- Enable 100% sampling in production (too expensive)
- Log sensitive user data in breadcrumbs

## 13. Production Checklist

Before deploying:

- [ ] `NEXT_PUBLIC_SENTRY_DSN` is set in Vercel
- [ ] `SENTRY_AUTH_TOKEN` is set in Vercel (for source maps)
- [ ] `SENTRY_ORG` and `SENTRY_PROJECT` match your Sentry settings
- [ ] Test error tracking works in staging
- [ ] Configure alerts for critical errors
- [ ] Set up Slack/email notifications (optional)
- [ ] Review sample rates for your traffic volume
- [ ] CSP headers allow `*.sentry.io` (already configured)

## 14. Cost Estimation

**Free Tier:**
- 5,000 errors/month
- 500 session replays/month
- 10,000 performance transactions/month

**Typical Usage (with configured sample rates):**
- 10,000 monthly users
- 10% performance sampling = ~1,000 transactions/month ✅
- 10% replay sampling = ~1,000 sessions/month (may exceed free tier)
- Errors depend on code quality

**If you exceed free tier:**
- Errors: $26/month for 50k errors
- Replays: $20/month for 5k replays
- Consider reducing sample rates or upgrading

## Resources

- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Dashboard](https://sentry.io)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Session Replay](https://docs.sentry.io/product/session-replay/)
