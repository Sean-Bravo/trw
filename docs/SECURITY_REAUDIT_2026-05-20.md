# TaxFormatter Security Re-Audit — Pre-Launch Verification

**Date:** 2026-05-20
**Scope:** Full codebase at `/Users/sean/Desktop/trw`, `main` @ `d34a0f1`
**Trigger:** Launch-gate verification step 1–2 from [SECURITY_REMEDIATION_PLAN.md](SECURITY_REMEDIATION_PLAN.md) — "re-run the audit methodology; confirm zero Critical, zero High remaining."
**Methodology:** Six parallel agent scans, one per vulnerability class, matching the original [SECURITY_AUDIT.md](SECURITY_AUDIT.md) methodology. Each agent confirmed the prior fixes in its class were still present (not regressed) **and** independently hunted for new issues. The four highest-severity findings were then manually re-verified against the source by the lead before this report.

---

## Executive Summary

| Severity | New this re-audit | Status |
| -------- | ----------------- | ------ |
| **Critical** | 0 | — (one false-positive raised then withdrawn; see §1) |
| **High** | 2 | ✅ both fixed + pushed (PRs B, C) |
| **Medium** | 3 | ⏳ open, non-blocking |
| **Low** | 4 | ⏳ open, non-blocking |

**All 51 original audit findings were confirmed still fixed — zero regressions.**

### Launch-gate verdict

> **Gate met once PRs B and C merge.** Zero Critical. The two new High findings (IDOR on crypto job routes; over-broad CSRF exemption) are remediated and pushed; merging them brings open Critical/High to **0 / 0**. Remaining Medium/Low items are documented accepted risk for a post-launch follow-up.

---

## §1 — Withdrawn Critical: dead keys in `terraform.tfvars.example`

The secret-leakage scan flagged live-format Anthropic + Google Gemini keys in the git-tracked `backend/terraform/terraform.tfvars.example` (lines 13, 15) as **Critical**. On manual review this was **downgraded to Low and withdrawn as a blocker** — the keys are already dead.

Evidence from [`Workstream_2_ report.md`](../Workstream_2_%20report.md):
- `:37` — C-1f Google Gemini: "Old key deleted via aistudio.google.com" ✅
- `:56` — C-2 Anthropic: "Deleted old `taxformatter.com` key via console.anthropic.com" ✅
- `:200` — "Confirm every old secret returns 401 against its provider — **closed 2026-05-04**"
- `:218` — names `terraform.tfvars.example` as the only file with live values that ever entered history; that history was rewritten with `git filter-repo` (501 commits, force-pushed) **before** the repo went public; "every old key value is dead at the provider."

**Why the agent raised it:** an in-repo scan cannot verify out-of-band rotation, so it correctly fails safe and treats any tracked real-format key as live. The lead's miss was not cross-checking the Workstream 2 report before ranking severity.

**Residual (Low):** dead key strings still sit in the working-tree `.example` file — no security impact, but they trip secret scanners and can confuse future contributors. Cleaned up cosmetically in PR A; no rotation or history scrub required (both already done).

---

## §2 — Findings by class

### Auth & session — VERDICT: zero open Critical/High
All prior fixes confirmed: H-5 (`timingSafeEqual`, `lib/validation.ts`), H-6 (rate-limit `verify`), H-7 (account lockout, migration `009`), H-12 (auth columns, migration `010`), H-15 (open-redirect guard, `lib/safe-redirect.ts`), M-4, M-5, M-7, M-8, M-16, M-20, L-4.

New (non-blocking):
- **Medium** — `app/api/auth/reset-password/route.ts` validates the new password with `z.string().min(8)` only, bypassing the `validatePassword` complexity policy enforced at registration. *Fix: call `validatePassword()` in the reset path.*
- **Medium** — `app/api/auth/2fa/disable/route.ts` disables 2FA on session alone, with no password/TOTP re-auth. (The CSRF vector is closed by PR C; re-auth is defense-in-depth.) *Fix: require current password or a valid TOTP/backup code.*
- **Medium** — M-6 password-reset token is not truly single-use; it only shrinks to a 10-min view window. (Known partial per remediation plan.)
- *Note:* the rate-limit store is in-memory per worker; on serverless the IP-layer limits are per-instance. Per-account DB lockout (H-7) still holds. Pre-existing design, not a regression.

### SQL / ORM injection — VERDICT: zero open Critical/High
H-13 (parameterized UPDATE in `lib/jobs-db.ts`) and L-7 (`make_interval()`) confirmed. Parameterized SQL verified throughout: Python `cur.execute(... %s ...)` everywhere, JS via Neon `sql.query(text, params)`. No f-string/format/concat SQL, no dynamic table/column names from input. **No new findings.**

### XSS / CSRF / SSRF — VERDICT: 1 open High (fixed in PR C)
- **HIGH (new)** — `middleware.ts` exempted the entire `/api/auth/` prefix from the CSRF Origin check, on the assumption NextAuth protects it. But NextAuth only protects its own `[...nextauth]` endpoints; custom routes under that prefix (`2fa/disable`, `2fa/setup`, `2fa/regenerate-codes`, `register`, `forgot-password`, `reset-password`, `resend-code`, `verify`) had **no** CSRF protection and were forgeable cross-site. Most damaging: a cross-site POST could silently disable a victim's 2FA. **Fixed in PR C** — exemption narrowed to NextAuth core endpoints only.
- Confirmed fixed: H-8 (`unsafe-eval` removed from prod CSP), H-11 (CORS allowlist, `backend/handlers/api.py`), M-14 (`API_GATEWAY_URL` SSRF allowlist, `lib/lambda-client.ts`), M-21 (`Referrer-Policy`).
- **Low (info)** — JSON-LD via `dangerouslySetInnerHTML` in SEO components (`components/seo/*`); inputs are static MDX/hardcoded, no user data path. Not exploitable.

### Secret leakage — VERDICT: zero live secrets; one Low hygiene item
See §1 (withdrawn Critical → Low). Confirmed fixed: L-5 (Gemini key via header, `backend/services/ai_insights.py`), M-17 (no SMTP logging), M-18 (Docker Compose requires `POSTGRES_PASSWORD`), M-19 (E2E creds in gitignored `.env.test.local`). Pre-commit secret hook present (`scripts/git-hooks/pre-commit`). `.env.local` / `.env.test.local` / `.env.sentry-build-plugin` all gitignored & untracked.

### Payments / IDOR — VERDICT: 2 open High (fixed in PR B)
- **HIGH (new)** — `app/api/jobs/[jobId]/download/route.ts`: authenticated but never verified job ownership; `jobId` passed straight to Lambda. Any logged-in user could download **any** user's tax CSV. **Fixed in PR B.**
- **HIGH (new)** — `app/api/jobs/[jobId]/insights/route.ts`: same gap on AI insights. **Fixed in PR B.**
- Both fixed by adding the `getJobById` + `upload.user_id` ownership guard already used by the bank download route (H-2) and the crypto job status route.
- Confirmed fixed: H-1, H-2, H-3, M-1 (webhook idempotency in Postgres, migration `011`), M-2, M-3, M-12, M-13, M-15, L-1. Webhook signature verification present; no client-supplied price/amount/tier trusted.

### Python injection / traversal — VERDICT: zero open Critical/High
H-9 / M-9 (`backend/services/safe_errors.py`), M-10 (CSV formula sanitizer, `csv_safety.py`), M-11 (pinned deps + `pip-audit` in CI) confirmed. No `eval`/`exec`/`pickle`/`yaml.load`/`os.system`/`subprocess`/`shell=True`. **Filename traversal traced end-to-end and confirmed safe** — client `filename` is used only for length/extension checks; file content stays in-memory (`io.StringIO` / `BytesIO`), never written to a path built from input.

New (non-blocking):
- **Low** — `backend/handlers/webhook.py:451,889` return raw exception text to the client (the BFF, not the public `/v1` API). *Fix: route through `safe_error_message`.*
- **Low (info)** — `webhook.py` confirm-upload / bank-process use a client-supplied S3 `key` directly (bucket fixed server-side) — bounded IDOR within one bucket. *Fix: validate `key` shape or derive server-side from `jobId`.*
- **Low (info)** — dev-only `requirements.txt` still uses loose `>=` pins and is not covered by `pip-audit`. Deployed Lambda manifests are pinned & scanned; no deployment impact.

---

## §3 — Remediation shipped this session

| PR | Branch | Severity | Change | Verification |
| -- | ------ | -------- | ------ | ------------ |
| **A** | `fix/security-redact-tfvars-example` | Low (cosmetic) | Replace dead key strings in `terraform.tfvars.example` with placeholders | matches file style; keys already dead |
| **B** | `fix/security-jobs-idor-ownership` | High ×2 | Add `getJobById` ownership guard to crypto job `download` + `insights` routes | `tsc --noEmit` clean; mirrors approved H-2 pattern |
| **C** | `fix/security-csrf-auth-exemption` | High | Narrow CSRF exemption to NextAuth core paths; custom auth routes now get the Origin check | 75 middleware tests pass incl. new regression cases; `tsc` clean |

PR A is optional cleanup (no rotation or history scrub needed — both completed 2026-04-30). PRs **B and C are the launch blockers**; merging them meets the gate.

---

## §4 — Remaining launch-gate steps

Per [SECURITY_REMEDIATION_PLAN.md](SECURITY_REMEDIATION_PLAN.md) lines 133–142:

- [x] Re-run the 6-class audit methodology (this report)
- [x] Confirm zero Critical / zero High — **met once PRs B + C merge**
- [x] Confirm Medium count acceptable — 3 open Mediums documented above as accepted post-launch risk
- [ ] Run full test suite (`npm test`, `pytest`) — backend `pytest` green this session; run full JS suite after B/C merge
- [ ] Cross-browser smoke test
- [ ] **Then** launch

## §5 — Post-launch follow-up backlog (non-blocking)

1. `reset-password` complexity-policy bypass (Medium)
2. `2fa/disable` step-up re-auth (Medium)
3. M-6 truly single-use reset token (Medium)
4. `webhook.py` raw exception text → `safe_error_message` (Low)
5. `webhook.py` client-supplied S3 key validation (Low)
6. Dev `requirements.txt` pinning / `pip-audit` coverage (Low)
7. JSON-LD `<` escaping in SEO components if they ever render user data (Low)
8. Playground demo-key decoupling from the customer quota model (separate task, filed)
