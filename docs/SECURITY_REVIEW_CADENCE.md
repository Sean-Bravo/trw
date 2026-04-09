# Security Review Cadence

A standing schedule for re-running security work so things don't
quietly drift after launch.

---

## Quarterly: full code audit

**Frequency:** every 3 months (next: 2026-07-09)
**Effort:** 1 day for the audit, 1–2 days for triage and fixes
**Owner:** project maintainer

### Run

Re-run the six-agent audit methodology described in `SECURITY_AUDIT.md`.
Each agent gets a single vulnerability class, the full project layout,
a targeted grep checklist, and instructions to cite file:line.

The six scopes:

1. Auth & session — `app/api/auth/**`, `lib/auth-db.ts`, `lib/validation.ts`
2. SQL/ORM injection — `backend/services/**`, `backend/handlers/**`, `lib/*-db.ts`
3. XSS/CSRF/SSRF — `app/**`, `components/**`, `next.config.ts`, `middleware.ts`
4. Secret leakage — `.env*`, `public/**`, `backend/terraform/**`, all source
5. Payments / IDOR — Stripe + webhook routes, user-scoped resources
6. Python injection / traversal — `backend/handlers/**`, `backend/services/**`, dependency pinning

### Triage

For each finding, confirm:
- Is it real? (manually verify against source tree)
- What's the severity per the rubric in `SECURITY_AUDIT.md` §Severity definitions
- Does it duplicate something already in `SECURITY_REMEDIATION_PLAN.md`?

### Output

- Append a new section to `SECURITY_AUDIT.md` (don't overwrite the
  prior audit — the history is valuable)
- Add new rows to `SECURITY_REMEDIATION_PLAN.md`
- Open commits with `fix(security):` prefix per the existing pattern

---

## Monthly: dependency hygiene

**Frequency:** first Monday of every month
**Effort:** 30 minutes
**Owner:** project maintainer

### Run

```bash
npm audit
pip-audit -r backend/requirements-api.txt
pip-audit -r backend/requirements-processor.txt
pip-audit -r backend/requirements-webhook.txt
npm outdated | head -20
```

### Decide

For each high or critical finding:
- Is a fix available (`fixAvailable: { isSemVerMajor: false }`)?
  → Apply with `npm install pkg@version`, run full test suite,
  commit with `fix(deps): bump pkg`
- Is the fix breaking? → Open a tracking note in
  `SECURITY_REMEDIATION_PLAN.md`, tag for next quarterly audit
- Is there no fix at all (transitive dep)? → Note the upstream issue
  link, leave a TODO in CI comments, check again next month

For each Sentry alert in the past 30 days:
- Is it a security-relevant pattern? (auth, crypto, payment)
- File for next audit if so

---

## Weekly: alert review

**Frequency:** Monday morning
**Effort:** 10 minutes
**Owner:** on-call

### Check

- Sentry top errors — any new patterns?
- CloudWatch alarms — any DLQ growth, 5XX spikes?
- Stripe webhook delivery dashboard — any failures past 7 days?
- npm audit count — has it grown?

### Action

Anything that looks security-relevant gets a Slack thread and an
`SR-` (security review) tag. Anything routine gets logged and moved
on.

---

## Yearly: rotate and re-attest

**Frequency:** annually
**Owner:** project maintainer

### Rotate

- All long-lived API keys: Stripe, Anthropic, Gemini, npm, Sentry
- Database password (Neon)
- NEXTAUTH_SECRET (will log out all users — accept this cost)
- AWS IAM access keys for the deploy role

Document each rotation with a date and the rotating user. The audit
finding §C-1 listed every key in the repo at the time of the original
audit; use that as a starting checklist.

### Re-attest

- Verify Neon storage encryption is still on
- Verify Sentry data scrubbing rules are still configured
- Verify the GitHub repo is still private (no accidental flip)
- Verify all outstanding Tier 0 secrets from the original audit have
  been rotated at least once since launch

---

## Trigger-based reviews

These don't have a calendar slot; they fire when the trigger happens.

### After a security incident

Within 48 hours of any confirmed exploit, leaked credential, or
unauthorized data access:

1. Rotate every credential the incident touched (or might touch)
2. Run the relevant audit scope again
3. Write a postmortem: timeline, what failed, what worked, what's
   different now
4. Add the postmortem to `docs/incidents/`

### When adding a new external dependency

Before merging:
- Does the package have known CVEs? (`npm view <pkg> vulnerabilities`)
- Is it maintained? (last commit < 6 months)
- Does it have minimal transitive deps?
- If it touches auth, crypto, or payments — does it need its own
  mini-audit?

### When changing the auth flow

Any PR that touches `app/api/auth/**`, `lib/auth-db.ts`, or
`middleware.ts` requires:
- A specific `Auth-` reviewer tag
- An explicit "what changed about the threat model" line in the PR
  description
- Updated tests covering the changed paths

---

## Tooling status

What's automated today:

- ✅ `npm audit` (warn high, fail critical) on every CI run
- ✅ `pip-audit` against pinned requirements on every CI run
- ✅ Pre-commit hook scanning for credential patterns
- ❌ Sentry security event monitoring — not configured
- ❌ Automated dependency PRs (Dependabot / Renovate) — not configured
- ❌ Static analysis (Semgrep / CodeQL) — not configured

The bottom three are tracked as future improvements but not blocking
launch.
