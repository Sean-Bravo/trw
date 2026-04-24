# Security Process

This document describes how security work is done on TaxFormatter.
It's the contract between the codebase and any future contributor.

If you find what looks like a security issue, **do not open a public
issue**. Email the owner directly (see `package.json` author field).

---

## What's already in place

TaxFormatter went through a six-agent parallel security audit on
2026-04-09 that found 51 issues. All actionable findings (Critical,
High, Medium, Low) have code fixes in `git log` — search for commits
prefixed `fix(security):`. The full report is in `SECURITY_AUDIT.md`
at the repo root and the remediation tracking is in
`SECURITY_REMEDIATION_PLAN.md`.

The audit findings are organized by category:

| Category | Where to look |
| --- | --- |
| Authentication & sessions | `lib/auth-db.ts`, `app/api/auth/**`, `lib/safe-redirect.ts` |
| Authorization (IDOR) | `app/api/developer/subscribe/route.ts`, `app/api/bank/job/[jobId]/**` |
| CSRF | `middleware.ts` |
| Webhook integrity | `app/api/webhooks/stripe/route.ts`, `db/migrations/011_*.sql` |
| Input validation | `lib/validation.ts`, `backend/services/csv_safety.py`, `backend/services/safe_errors.py` |
| Secrets management | `.gitignore`, `scripts/git-hooks/pre-commit` |
| CSP / headers | `next.config.ts` |
| Rate limiting | `lib/rate-limit.ts` |
| 2FA | `lib/2fa.ts`, `app/api/auth/2fa/**` |
| Account lockout | `db/migrations/009_add_account_lockout.sql` (see [docs/ACCOUNT_LOCKOUT.md](ACCOUNT_LOCKOUT.md)) |

---

## Coding rules (the security parts)

These aren't just "best practices" — each one closes an audit finding.
Breaking them is a regression.

### Authorization

- **Always verify ownership** on routes that access user-scoped
  resources. The pattern is `SELECT user_id FROM <table> WHERE id =
  $1` followed by `if (row.user_id !== session.user.id) return 403`.
  See `H-1`, `H-2`, `H-3`, `M-12`.
- **`getServerSession()` must always pass `authOptions`.** A bare
  call returns null in App Router. See `M-2`.

### Authentication

- **Never use `===` for credential comparisons.** Use
  `constantTimeStringEqual` from `lib/validation.ts` for verification
  codes, 2FA codes, tokens. See `H-5`.
- **Never use `Math.random()` for credentials.** Use
  `crypto.randomInt`, `crypto.randomBytes`, or `crypto.randomUUID`.
  See `L-4`.
- **Reset/verification tokens are short-lived.** Reset tokens shrink
  to a 10-minute window on first view. See `M-6`.

### Webhooks

- **All Stripe webhook handlers must check the persistent idempotency
  table** (`processed_webhook_events`). The in-memory `Set` pattern
  is forbidden — Vercel cold starts wipe it. See `M-1`.
- **All Stripe metadata must be cross-verified against the actual
  subscription's price ID** before acting on a tier change. The
  webhook signature only proves Stripe sent the event, not that the
  metadata is honest. See `M-3`.

### CSV / spreadsheet output

- **All CSV writes must go through `sanitize_csv_records()` /
  `sanitize_csv_row()`** from `backend/services/csv_safety.py`. Bank
  parsers extract attacker-controllable text; an unsanitized cell
  starting with `=` becomes a formula in Excel. See `M-10`.

### Error messages

- **Never return `str(e)` to API clients.** Use `safe_error_message()`
  from `backend/services/safe_errors.py`. Internal exception messages
  leak file paths, library versions, and SQL schema. See `H-9` /
  `M-9`.
- **Never `dangerouslySetInnerHTML` user-supplied error text.** React
  escapes by default; keep it that way.

### CSP

- **Never add `'unsafe-eval'` back** to the script-src directive. See
  `H-8`. `'unsafe-inline'` is grudgingly allowed for now (Next.js
  bootstrap), but a nonce-based migration is tracked as post-launch
  work in `SECURITY_REMEDIATION_PLAN.md`.

### Secrets

- **Never commit `.env*` files** other than `.env.example` and
  `.env.test.local.example`. The pre-commit hook in
  `scripts/git-hooks/pre-commit` enforces this — install with
  `npm run hooks:install`.
- **Never log API keys, tokens, passwords, or full SMTP credentials.**
  Even partial logs (host/user) are gated behind a debug env var.
  See `M-17`.

### Open redirect

- **NextAuth `redirect` callback uses `safeRedirect`** from
  `lib/safe-redirect.ts`. Don't add ad-hoc URL handling that calls
  `url.startsWith('/')` — `//attacker.com` matches that. See `H-15`.

### Migrations

- **All schema changes go in `db/migrations/`** with sequential
  numbering. Don't drop ad-hoc SQL into `scripts/`. See `H-12`.
- **Run migrations against prod manually before deploying** the code
  that depends on them. There is no automatic migration runner.
  `node scripts/run-migration.mjs db/migrations/N_name.sql` works
  locally if you set `NEON_DATABASE_URL`.

---

## Adding a new API route

Before merging, verify the checklist in
`SECURITY_AUDIT.md` Appendix A. The short version:

- [ ] Auth check (`getServerSession(authOptions)`)
- [ ] Ownership check for user-scoped resources
- [ ] Input validation via Zod or `lib/validation.ts`
- [ ] Rate limit if it touches credentials, file I/O, or external APIs
- [ ] CSRF: state-changing routes are covered automatically by the
      Origin/Referer middleware. If you add a new exempt path, justify
      it in `middleware.ts`.
- [ ] Errors: scrub via `safe_error_message` (Python) before returning
- [ ] Test: at least one test for the auth-fail path, not just happy

---

## Reviewing a PR

Skim `git diff` for these red flags. If you see one, it gets a comment.

| Pattern | Why it's a flag |
| --- | --- |
| `process.env.NODE_ENV !== 'production'` guarding security logic | The guard might flip in CI. Use a positive-list allowlist instead. |
| `if (!user) return null` followed by `where user_id = $1` | Missing ownership check. |
| `Math.random()` near anything called "code", "token", "secret", or "key" | CSPRNG required. |
| `=== code` or `=== token` | Use constant-time. |
| `${API_GATEWAY_URL}/something` declared inline | Use the centralized one from `lib/lambda-client.ts`. |
| New `<a href={...}>` or `redirect(...)` with user input | Check it goes through `safeRedirect`. |
| Any new `console.log` containing `password`, `token`, `key`, `secret` | Strip it or guard behind a debug flag. |
| `dangerouslySetInnerHTML` | Almost always wrong. |
| New SQL string concatenation | Use parameterized queries — no exceptions. |

---

## Running the audit yourself

The original audit used six parallel Claude `Explore` sub-agents,
each scoped to one vulnerability class:

1. Auth & session
2. SQL/ORM injection
3. XSS/CSRF/SSRF
4. Secret leakage
5. Payments / IDOR
6. Python injection / traversal

Outputs were cross-referenced and deduplicated, then the high-impact
findings were manually verified against the source tree before being
written up. The full methodology is in `SECURITY_AUDIT.md` §Methodology.

We aim to re-run this every quarter (see [docs/SECURITY_REVIEW_CADENCE.md](SECURITY_REVIEW_CADENCE.md)).

---

## Out of scope for the codebase audit

These need separate engagements:

- **AWS IAM review** — least-privilege on Lambda execution roles, VPC
  posture, security group rules
- **npm supply chain SCA** — beyond `npm audit`
- **Live penetration testing** — exercises real Stripe flows, real
  email deliverability, real network behavior
- **Compliance certifications** — SOC 2, PCI DSS, GLBA controls
  (some findings touch these but a compliance review is separate)
- **Mobile clients** (if/when they exist)
- **CI/CD pipeline security** — branch protection, secret handling in
  GitHub Actions

---

## Reporting a vulnerability

Don't open a public GitHub issue. Email the owner directly with:
- A description of the issue
- Steps to reproduce (or a proof of concept)
- The affected file/route/version
- Your contact info

Expect an acknowledgement within 72 hours. Critical findings get a
fix within a week; high findings within two weeks. We'll coordinate
disclosure timing with you.
