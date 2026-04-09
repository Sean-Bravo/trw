# Security Remediation Plan

**Created:** 2026-04-09
**Source:** `SECURITY_AUDIT.md` (51 findings: 4 Critical, 15 High, 21 Medium, 11 Low)
**Owner directive:** No launch until all 51 issues are fixed.

---

## Tier 0 — Emergency: Rotate leaked secrets

**Nothing else matters until these keys are rotated.** Each one currently exposes live production access. These must be done in provider dashboards by the owner.

| ID  | Action                                  | Where                                              | Status |
| --- | --------------------------------------- | -------------------------------------------------- | ------ |
| C-1 | Rotate `NEXTAUTH_SECRET`                | `openssl rand -base64 32` → Vercel env             | [ ]    |
| C-1 | Rotate Neon DB password                 | Neon dashboard → update Vercel env                 | [ ]    |
| C-1 | Rotate Google OAuth client secret       | console.cloud.google.com                           | [ ]    |
| C-1 | Rotate Resend API key                   | resend.com                                         | [ ]    |
| C-1 | Rotate Mailchimp API key                | mailchimp.com                                      | [ ]    |
| C-1 | Rotate Google Gemini API key            | console.cloud.google.com                           | [ ]    |
| C-1 | Rotate npm token                        | npmjs.com → Access Tokens                          | [ ]    |
| C-1 | Rotate TaxFormatter live API key        | own dashboard                                      | [ ]    |
| C-2 | Rotate Anthropic API key                | console.anthropic.com                              | [ ]    |
| C-3 | Rotate Gemini key (same as C-1)         | already covered above                              | [ ]    |
| C-4 | Rotate Sentry auth token                | sentry.io → Settings → Auth Tokens                 | [ ]    |
| —   | Scrub git history with `git filter-repo` | local + force-push                                 | [ ]    |
| —   | Audit access logs at every provider     | Neon, Resend, Mailchimp, GCP, Stripe, Sentry, npm | [ ]    |

```bash
pip install git-filter-repo
git filter-repo \
  --path .env.local \
  --path .env.sentry-build-plugin \
  --path backend/terraform/terraform.tfvars.example \
  --invert-paths
git push --force-with-lease origin main
```

---

## Tier 1 — Directly exploitable bugs

These enable real user harm: financial loss, PII theft, account takeover.

| ID    | Fix                                                                 | Files | Status |
| ----- | ------------------------------------------------------------------- | ----- | ------ |
| H-1   | Add ownership check in `/api/developer/subscribe`                   | 1     | [x]    |
| H-2   | Require auth + ownership in `/api/bank/job/[jobId]/download`        | 1     | [x]    |
| H-3   | Add ownership check in `/api/bank/job/[jobId]`                      | 1     | [x]    |
| H-12  | Verify auth columns exist; add migration `010_add_auth_columns.sql` | 1 SQL | [x] (note: 009 used for H-7) |
| H-15  | Fix open redirect in NextAuth `redirect` callback                   | 1     | [x]    |
| M-2   | Pass `authOptions` to `getServerSession()` in customer-portal       | 1     | [x]    |
| M-3   | Cross-verify Stripe price ID in webhook (companion to H-1)          | 1     | [x]    |

---

## Tier 2 — High-risk hardening

| ID    | Fix                                                                 | Status |
| ----- | ------------------------------------------------------------------- | ------ |
| H-5   | Use `crypto.timingSafeEqual` for verification/2FA codes             | [x]    |
| H-6   | Add rate limit to `/api/auth/verify`                                | [x]    |
| H-7   | Add account lockout after 5 failed logins                           | [x] (see [docs/ACCOUNT_LOCKOUT.md](docs/ACCOUNT_LOCKOUT.md)) |
| H-8   | Remove `unsafe-eval` from CSP, nonce inline scripts                 | [x] partial — `unsafe-eval` removed; nonce-based inline scripts is post-launch |
| H-9   | Sanitize error text at the Python source                            | [x]    |
| H-10  | Set `sendDefaultPii: false`, drop session replays in 3 Sentry configs | [x]  |
| H-11  | CORS allowlist on Lambda handlers (replace `*`)                     | [x]    |
| H-13  | Refactor dynamic UPDATE pattern in `jobs-db.ts`                     | [x]    |
| H-14  | Fix hardcoded path in `run-migration.mjs`                           | [x]    |
| H-4   | Add CSRF validation middleware to state-changing routes             | [x]    |
| M-1   | Move webhook idempotency to Postgres                                | [x] (migration 011) |
| M-7   | Add rate limit to `/api/auth/2fa/login-verify`                      | [x]    |
| M-20  | Delete/guard `BYPASS_RATE_LIMIT` env var                            | [ ]    |

---

## Tier 3 — Medium hardening & hygiene

| ID    | Fix                                                          | Status |
| ----- | ------------------------------------------------------------ | ------ |
| M-4   | Constant-time response on `/api/auth/resend-code`            | [x]    |
| M-5   | Reduce JWT session to 7 days (with sliding refresh)          | [x]    |
| M-6   | Make password reset tokens single-use                        | [x] (10-min view window) |
| M-8   | Bump 2FA backup codes to 48 bits                             | [x]    |
| M-9   | Scrub verbose Python exception messages                      | [x] (covered by H-9 commit `4dc9191`) |
| M-10  | Add CSV formula injection sanitizer                          | [x]    |
| M-11  | Pin `pdfplumber` version, generate lockfile, add `pip-audit` | [x] (3 requirements files + CI step) |
| M-12  | Require auth on `/api/uploads/[uploadId]/confirm`            | [x]    |
| M-13  | Tighten presigned S3 URL expiry to 5–15 minutes              | [x] (download 1h → 15 min) |
| M-14  | Add `API_GATEWAY_URL` allowlist                              | [x] (centralized in `lib/lambda-client.ts`) |
| M-15  | Lower anonymous upload limits, enforce byte quota            | [x] (anon 3/hr, authed 10/hr; byte quota deferred) |
| M-16  | Explicit NextAuth cookie config                              | [x]    |
| M-17  | Remove SMTP config logging                                   | [ ]    |
| M-18  | Docker Compose default password fix                          | [ ]    |
| M-19  | Move E2E credentials out of `.env.local`                     | [ ]    |
| M-21  | Set `Referrer-Policy: strict-origin-when-cross-origin`       | [ ]    |

---

## Tier 4 — Low findings & polish

| ID    | Fix                                                          | Status |
| ----- | ------------------------------------------------------------ | ------ |
| L-1   | Move `api_tier` out of URL query param                       | [ ]    |
| L-2   | Trim DoubleClick from `connect-src` if unused                | [ ]    |
| L-3   | HSTS preload — already done ✓                                | ✓      |
| L-4   | Bump verification codes to 8-char alphanumeric               | [ ]    |
| L-5   | Move Gemini API key from query string to header              | [ ]    |
| L-6   | Remove dead `MAX_PROCESSED_EVENTS` after M-1                 | [ ]    |
| L-7   | Use `make_interval()` in usage query                         | [ ]    |
| L-8   | `X-Powered-By` removed — already done ✓                      | ✓      |
| L-9   | Verify `productionBrowserSourceMaps: false`                  | [ ]    |
| L-10  | OAuth state default — accepted as-is                         | ✓      |
| L-11  | Document PII-at-rest encryption plan                         | [ ]    |

---

## Ongoing / Process

- [ ] Add `detect-secrets` (or `git-secrets`) pre-commit hook
- [ ] Add `pip-audit` to CI; fail builds on high/critical
- [ ] Add `npm audit --audit-level=high` to CI (currently warns only — see CI)
- [ ] Document security review in `docs/SECURITY.md`
- [ ] Schedule quarterly re-audit using same six-agent methodology
- [ ] Configure Sentry data-scrubbing rules at the project level

---

## Verification before launch

After every fix lands:

1. Re-run `SECURITY_AUDIT.md` methodology (6 parallel agents)
2. Confirm zero Critical, zero High remaining
3. Confirm Medium count is acceptable (or documented as accepted risk)
4. Run full test suite (`npm test`, `pytest`)
5. Run cross-browser smoke test
6. **Then** launch
