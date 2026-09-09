# Security Policy

TaxFormatter processes financial documents. We take vulnerability reports
seriously and will respond to every one.

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

Two ways to reach us, either is fine:

1. **GitHub private vulnerability reporting** — use the "Report a
   vulnerability" button on the [Security tab](https://github.com/Sean-Bravo/trw/security).
   This keeps the report private until a fix ships.
2. **Email** — <support@taxformatter.com> with `SECURITY` in the subject.

Please include enough detail to reproduce: affected endpoint or page, the
request you sent, what you expected, and what happened instead. A proof of
concept helps but is not required to report.

### What to expect

| | |
| --- | --- |
| First response | within 3 business days |
| Triage decision | within 7 business days |
| Fix for Critical / High | prioritised ahead of feature work |
| Credit | happy to credit you in the fix commit and release notes, or stay anonymous — your choice |

We do not currently run a paid bug bounty.

## Scope

**In scope**
- `www.taxformatter.com` — the web application
- `api.taxformatter.com` — the REST API
- `@taxformatter/mcp-server` and `@taxformatter/sdk` on npm, `taxformatter` on PyPI
- This repository's source

**Out of scope**
- Denial of service and volumetric testing against production
- Findings from automated scanners with no demonstrated impact
- Social engineering, physical access, or attacks on our vendors
- Missing hardening headers with no exploitable consequence
- Vulnerabilities in third-party dependencies that we have no patched
  version available for — report those upstream, though we do want to hear
  if we are exposed

Please test against your own account and data. Do not access, modify, or
retain data belonging to anyone else. If you encounter someone else's data,
stop and tell us.

## Supported versions

TaxFormatter is a hosted service. Only the currently deployed version of
`main` is supported and patched — there are no maintained release branches.
The published client packages are supported at their latest minor version.

## How security work is done here

Engineering process, audit history, and per-finding remediation tracking live
in [`docs/`](docs/):

- [`docs/SECURITY.md`](docs/SECURITY.md) — the working security process
- [`docs/SECURITY_AUDIT.md`](docs/SECURITY_AUDIT.md) — 2026-04-09 audit, 51 findings
- [`docs/SECURITY_REAUDIT_2026-05-20.md`](docs/SECURITY_REAUDIT_2026-05-20.md) — pre-launch re-audit
- [`docs/SECURITY_REMEDIATION_PLAN.md`](docs/SECURITY_REMEDIATION_PLAN.md) — per-finding status
- [`docs/SECURITY_REVIEW_CADENCE.md`](docs/SECURITY_REVIEW_CADENCE.md) — ongoing review schedule

CI enforces a dependency audit on every pull request: `npm audit` at critical
severity and `pip-audit` on the Lambda requirements must both pass before a
branch can merge.
