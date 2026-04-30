# TaxFormatter — Workstream 2 Completion Report
**Date:** April 30, 2026  
**Status:** ✅ Complete  
**Scope:** Secret rotation, git history scrub, infrastructure hardening

---

## Summary

All critical secrets rotated across 10+ providers, Vercel environment updated, git history scrubbed of 501 commits, repo force-pushed with clean history. AWS keys rotated as bonus (were not on original checklist but flagged in Vercel). Stripe keys rotated as bonus (also flagged). Repository is now ready to go public.

---

## Rotations Completed

### C-1a — NEXTAUTH_SECRET ✅
- Generated new secret: `openssl rand -base64 32`
- Updated `NEXTAUTH_SECRET` in Vercel

### C-1b — Neon Database Password ✅
- Rotated via: console.neon.tech → Branches → production → Roles & Databases → Reset password
- Updated `NEON_DATABASE_URL` in Vercel with new password in connection string

### C-1c — Google OAuth Client Secret ✅
- Rotated via: console.cloud.google.com → APIs & Services → Credentials → Regenerate secret
- Updated `GOOGLE_CLIENT_SECRET` in Vercel

### C-1d — Resend API Key ✅
- Created new key `taxformatter-production` via resend.com → API Keys
- Revoked old key
- Updated `SMTP_PASSWORD` in Vercel

### C-1e — Mailchimp API Key ✅ (skipped — not in use)
- Mailchimp was removed from the stack; no env var present in Vercel or `.env.local`

### C-1f — Google Gemini API Key ✅
- Old key deleted via aistudio.google.com
- Key was a local backup only — not in Vercel production env
- Not replaced (not needed in production)

### C-1g — npm Token ✅
- Old token `npm_NkCN3Kz86...` was already expired — deleted
- Created new Granular Access Token `Taxformatter-Production`
  - Type: Granular
  - Permissions: Read and write on packages
  - No expiration
- Updated `~/.npmrc`: `//registry.npmjs.org/:_authToken=NEW_TOKEN`
- Removed old token entry from `.npmrc`

### C-1h — TaxFormatter tf_live_ Key ✅
- Revoked old key via taxformatter.com/dashboard/developer
- Created new key
- Not used in `.env.local` or Vercel — internal use only

### C-2 — Anthropic API Key ✅
- Deleted old `taxformatter.com` key via console.anthropic.com
- Created new key `taxformatter-production`
- Added `ANTHROPIC_API_KEY` to Vercel (was missing — added as new var)
- `matchformatter` key left untouched (different project)

### C-4 — Sentry Auth Token ✅
- Found 2 tokens: one active (used 7 days ago), one never used
- Revoked never-used token immediately
- Created new token
- Revoked old active token
- Added `SENTRY_AUTH_TOKEN` to Vercel (was missing — added as new var)

---

## Bonus Rotations (Flagged in Vercel — Not on Original Checklist)

### AWS Access Keys ✅
- Found 2 active keys in IAM:
  - `AKIAVQ37CCG76JE4MD5H` — last used 112 days ago (ses-smtp)
  - `AKIAVQ37CCG7UIU53GOY` — never used, already inactive
- Deleted inactive key
- Created new access key (use case: Application running outside AWS)
- Updated `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in Vercel
- Deactivated and deleted old active key

### Stripe Secret Key ✅
- Rotated via Stripe Dashboard → Developers → API keys → Roll key
- Expiration: now (immediate)
- Updated `STRIPE_SECRET_KEY` in Vercel

### Stripe Webhook Secret ✅
- Rotated via Stripe Dashboard → Developers → Webhooks → Roll secret
- Expiration: immediately
- Updated `STRIPE_WEBHOOK_SECRET` in Vercel

---

## Vercel Redeploy ✅
- Single redeploy triggered after all env vars updated
- All new secrets activated in production simultaneously
- Deployment went green ✅

---

## Git History Scrub ✅

### Backup created
```bash
git branch backup/pre-history-scrub
git push origin backup/pre-history-scrub
```

### Tools installed
```bash
pip install git-filter-repo --break-system-packages
```

### Secrets in scope for scrub
Old values from `.env.local` that were committed at any point:
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_SECRET`
- `NEON_DATABASE_URL` (password portion)
- `SMTP_PASSWORD` (Resend key)
- `GOOGLE_GEMINI_API_KEY`
- `MAILCHIMP_API_KEY`

Note: Stripe, AWS keys were commented out in `.env.local` — never stored there.

### Scrub executed
```bash
git filter-repo --replace-text rotation-replacements.txt --force
```

Output:
```
Parsed 501 commits
New history written in 2.95 seconds
Repacking your repo and cleaning out old unneeded objects
HEAD is now at c957002
Total 4649 (delta 2664), reused 4641 (delta 2656)
Completely finished after 4.47 seconds.
```

### Remote re-added and force pushed
```bash
git remote add origin https://github.com/Sean-Bravo/trw.git
git push origin main --force
```

Output:
```
Total 4471 (delta 2614)
main -> main (forced update)
```

---

## .gitignore Updates ✅

Added to `.gitignore`:
- `rotation-replacements.txt` — secret rotation artifacts never committed
- Untracked `.next/` build artifacts removed from git tracking
- `.env.local`, `.env.sentry-build-plugin`, `.env.test.local`, `.mcp.json`, `.DS_Store` untracked

```bash
git rm -r --cached .next/ .DS_Store .env.local .env.sentry-build-plugin .env.test.local .mcp.json
git add .gitignore
git commit -m "chore: update gitignore, remove tracked artifacts"
git push
```

---

## Sentry Issues Noted (Fix Post-Launch)

Two unresolved issues in Sentry — 0 users affected, not launch blockers:

| Issue | Location | Last Seen | Events |
|-------|----------|-----------|--------|
| `EvalError` — Refused to evaluate string as JS ('unsafe-eval') | `/` | 1 day ago | 3 |
| `InvariantError` — Manifests singleton not initialized | `/docs/[...slug]/page` | 1 week ago | 8 |

**EvalError** is likely a CSP header issue.  
**InvariantError** may be a leftover from the contentlayer migration.

---

## Post-Rotation Verification

| Check | Status |
|-------|--------|
| All env vars updated in Vercel | ✅ |
| Single Vercel redeploy triggered | ✅ |
| Vercel deployment green | ✅ |
| git history scrubbed (501 commits) | ✅ |
| Force push to origin/main | ✅ |
| backup/pre-history-scrub branch on remote | ✅ |
| .gitignore updated | ✅ |
| rotation-replacements.txt excluded from git | ✅ |

---

## Remaining Post-Rotation Tasks

- [ ] Confirm every old secret returns 401 against its provider
- [ ] Audit provider access logs — Neon, Resend, GCP, Sentry, npm, Stripe. Flag anything outside known IPs/time windows
- [ ] Enable Sentry data scrubbing rules → sentry.io → Security & Privacy → Data Scrubbers
- [ ] Tick CRITICAL section in `SECURITY_AUDIT.md` and update `SECURITY_REMEDIATION_PLAN.md`
- [ ] Update `.env.local` with new rotated values for local development
- [ ] Fix Sentry EvalError (CSP unsafe-eval)
- [ ] Fix Sentry InvariantError on `/docs/[...slug]/page`

---

## Next Steps — After Repo Goes Public

1. **Resubmit Glama** → glama.ai/mcp/servers (rejected previously because repo was private)
2. **Publish to official MCP Registry** → `mcp-publisher login github` → `mcp-publisher publish`
3. **PulseMCP** → pulsemcp.com → Submit form
4. **mcp.so** → Submit GitHub repo URL
5. **mcp.run** → Submit form

---

## Environment Variables Status

| Variable | Status |
|----------|--------|
| `NEXTAUTH_SECRET` | ✅ Rotated |
| `NEON_DATABASE_URL` | ✅ Rotated |
| `GOOGLE_CLIENT_SECRET` | ✅ Rotated |
| `SMTP_PASSWORD` (Resend) | ✅ Rotated |
| `AWS_ACCESS_KEY_ID` | ✅ Rotated |
| `AWS_SECRET_ACCESS_KEY` | ✅ Rotated |
| `STRIPE_SECRET_KEY` | ✅ Rotated |
| `STRIPE_WEBHOOK_SECRET` | ✅ Rotated |
| `ANTHROPIC_API_KEY` | ✅ Added (was missing) |
| `SENTRY_AUTH_TOKEN` | ✅ Added (was missing) |
| `GOOGLE_GEMINI_API_KEY` | ✅ Deleted (not needed) |