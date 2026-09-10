# Build Report — Site Audit, RCE Patching, and Repository Hardening

**Date:** 2026-09-08 → 2026-09-09
**Scope:** `main` @ `bf29d45` → `b6b2375` (31 commits, 6 PRs)
**Trigger:** Visual audit of the live site at 1380 / 1020 / 486px, plus every page in the nav and footer. Dependency work was unplanned — it surfaced because the audit branch failed CI's `npm audit` gate.
**Methodology:** Every claim verified against the running application in-browser (computed styles, contrast ratios, canonical tags, HTTP status codes, page height) or against the codebase before any fix was written. Findings that did not survive that check were dropped, not silently fixed — see §4.

---

## Executive Summary

| Workstream | Result |
| ---------- | ------ |
| **Site audit** | 21 findings raised → **15 real and fixed**, 6 not reproducible (§4) |
| **Critical CVEs** | **4 → 0**, including two unauthenticated RCEs live in production |
| **WCAG AA contrast failures (homepage)** | **21 → 0** |
| **Dependabot alerts** | 58 → 0 (PR #60, open) |
| **GitHub community health** | **28% → 85%** |
| **Branches** | 26 → 8 (18 merged branches deleted) |

### Headline

The audit was the brief; the security work was not. Pulling on a red CI check found **two unauthenticated remote code execution advisories affecting the deployed application**, one of them on a code path this repo explicitly enables. Both are patched and deployed.

---

## 1. Unplanned: critical dependency advisories

Neither round came from the audit. Advisories published during the four months since the previous commit took CI red on the audit branch; a second batch landed mid-session, after the first fix had already gone green.

### 1.1 Next.js — two critical RCEs (PR #37)

| Advisory | Severity | Applicability |
| -------- | -------- | ------------- |
| [GHSA-2xp9-vwfh-vxw4](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) | **Critical** | Unauthenticated RCE in the Image Optimization API **when AVIF is used**. `next.config.ts` explicitly sets `formats: ["image/avif", "image/webp"]`. No component imports `next/image`, but `/_next/image` is served regardless. |
| [GHSA-p293-qw3h-jr36](https://github.com/advisories/GHSA-p293-qw3h-jr36) | **Critical** | Unauthenticated RCE on Windows-hosted servers. In range; not applicable to a Vercel deployment. |

The same advisory set carried eight highs, including **three middleware/proxy bypasses** and two SSRFs. Those matter here specifically because `middleware.ts` enforces the CSRF exemption boundary (narrowed in the 2026-05-20 re-audit) and the authenticated route guard.

`next` `^16.2.3` → `^16.3.4`. No source changes required.

### 1.2 next-auth and vitest (PR #35)

- **`next-auth` 4.24.13 → 4.24.15** — Auth.js email normalizer validated the address *before* Unicode normalization, allowing a homoglyph `@` bypass (critical), plus an uncaught `getToken()` exception on malformed Bearer headers and unbound OAuth `state`/`nonce`/PKCE cookies.
  **Note:** this is a patch bump, not a v5 migration. Auth.js v5 ships under the `beta` dist-tag; `latest` is still `4.24.x`.
- **`vitest` removed** — carried a critical (UI server arbitrary file read and execute) and nothing used it. No `vitest.config.*`, absent from `jest.config.js` and `playwright.config.ts`. A dead devDependency.

### 1.3 The 58 Dependabot alerts (PR #60 — open)

58 alerts resolved to **20 distinct packages**, each carrying several advisories. None critical (32 high, 24 medium, 2 low); all 20 had patches; **18 of 20 were transitive**. A plain non-breaking `npm audit fix` cleared 26 of 28 local findings by bumping lockfile entries alone.

Two required judgement:

**`nodemailer` 7.0.13 → 10.0.2 (major).** Ten advisories: SMTP command injection via unsanitized `envelope.size`; CRLF injection through transport names (EHLO/HELO) and `List-*` header comments; improper TLS certificate validation during OAuth2 token fetch; `disableFileAccess`/`disableUrlAccess` bypasses enabling arbitrary file read and full-response SSRF; IDN/punycode and RFC 5322 comment parsing bypasses delivering mail to attacker-controlled domains. `lib/email.ts` is the only consumer and uses only `createTransport` and `sendMail`, unchanged in v10.

**`next-auth`** was flagged only *via* nodemailer and clears with that bump.

> ### ⚠️ Do not run `npm audit fix --force` on this repo
>
> Its proposed fix for the next-auth alert is **`next-auth@1.12.1`** — a downgrade from 4.24.15 that would tear out the auth stack.
>
> The same trap applies to the intuitive fix for the resulting `npm ci` failure. next-auth 4.24.15 declares `peerOptional nodemailer@"^7.0.7"`, which v10 does not satisfy. **Pinning nodemailer back to 7.x trades a red CI check for ten live vulnerabilities.** It is resolved *upward* instead, via an `overrides` entry — safe here because `app/api/auth/[...nextauth]/route.ts` registers only `GoogleProvider` and `CredentialsProvider`, so next-auth never loads `providers/email.js` and never calls nodemailer.
>
> **If an `EmailProvider` (magic links) is ever added, this override needs revisiting.**

---

## 2. Site audit — findings fixed

### Tier 1 — bugs (PR #34)

| # | Finding | Verified result |
| - | ------- | --------------- |
| 1 | **Dark mode never worked.** Tailwind v4 compiles `dark:` under `prefers-color-scheme` by default, so all 124 `dark:` utilities ignored the `dark` class next-themes set on `<html>`. Dark styling rendered only for visitors whose OS was already dark. | Bound the variant to the class and pinned `dark` on `<html>`; dropped the toggle rather than maintain a light theme no marketing page was designed for. Verified with the OS forced to **light**: `body` = `rgb(2,6,23)`. |
| 2 | **Wordmark invisible on dark.** `components/ui/Logo.tsx` defaulted to `variant="dark"` (`#1a365d`). Every call site relying on the default sits on a dark surface — six auth pages plus `DashboardHeader` (`bg-[#030712]`). | Measured **1.66:1**. Default flipped to the light variant. |
| 3 | **Every page declared the homepage as canonical.** Root layout set `alternates: { canonical: "/" }`; App Router inherits metadata per-field, so 9 routes advertised `/` as canonical. | Per-page canonicals added; host corrected in §2.2. |
| 4 | **Titles doubled or missing.** Pages hard-coded `| TaxFormatter` while the root template appends it (`About | TaxFormatter | TaxFormatter`). `/docs`, `/playground`, `/login`, `/signup` shipped the generic homepage title. | 15 routes, all unique and single-branded. |
| 5 | **`/playground` had no header or footer** — no logo, no nav, no way back except browser-back. | Route layout added; 6 nav links, 11 footer links. |
| 7 | **Dead links.** Footer "Features" → a `#features` anchor that did not exist; `/exchanges` 404'd despite being a nav label; the 404 page's own "Contact support" and "Browse the docs" pointed at non-existent anchors. | `/exchanges` → **308** → `/#capabilities`. All internal homepage links resolve. |
| 8 | **Pricing CTAs misaligned.** | Cause was the Free tier's trailing note consuming 24px of column height — *not* differing feature counts. Free's button 751px → 775px, matching Starter and Business. |

### Tier 2 — visual coherence (PR #34)

| # | Finding | Verified result |
| - | ------- | --------------- |
| 9 | Light/dark patchwork across pages | Resolved as a consequence of #1; blog, 404 and auth pages converted. |
| 10 | **Four unrelated blacks on one scroll** — `#0b1121`, `#0d1425`, `#020617`, `#0a0a0a`. The last is a neutral grey-black with no blue in it, which is why the FAQ read as a different site. | **4 → 2** surface tokens (`--color-surface-base`, `--color-surface-alt`) plus a card token. |
| 11 | **The same signup action rendered in four colours** — blue in the nav, emerald in the hero and footer, indigo gradient in pricing. All three off-brand ones were `!`-overrides fighting `Button`'s primary variant, which was already correct. | **4 → 1** (`#635bff`). White-on-accent **3.68:1 → 4.70:1**. Twelve arbitrary card/FAQ accents collapsed to indigo + emerald. |
| 12 | "Engineered for Paranoia" used an all-caps rainbow-gradient headline and mono `STATUS:` terminal badges | Header and badges brought into the page's language; cards, animations and data panels untouched. |
| 13 | Vertical dead space | One 80px rhythm replacing 96/112/128. See §4 for the correction to the claimed benefit. |
| 14 | Hero headline orphan from a forced `<br>` | Break removed, `text-balance` applied. |

### Tier 3 — UX and copy (PR #34)

| # | Finding | Verified result |
| - | ------- | --------------- |
| 15 | **Secondary text failed AA.** slate-500 body copy at **3.62:1**, slate-600 helper text at **2.27:1** — all of it real content (feature and pricing descriptions, MCP helper line, exchange format tags). | Both tiers → slate-400 (**7.38:1**). Homepage measures **0 failures**. Playground later found and fixed separately (6 nodes at 3.07:1). |
| 16 | **Docs sold the old product.** The Developer API was not buried one level down — `lib/docs-config.ts` had **no entry for it at all**, so neither the sidebar nor the `/docs` index linked to it. | Added as the first section and first card. |
| 17 | Pricing leaked AI vendor names — "Gemini / Claude Sonnet / Claude Opus AI insights" | Replaced with outcome-based wording. Guard test added so a vendor name reappearing fails CI. |
| 18 | Exchange grid: unexplained checkmarks, `7+` against exactly seven banks | Legend added (checks encode `status: 'tested'` vs `'config'`); `+` dropped. |
| 19 | Mobile nav barely visible on dark | Resolved by #1; menu `slate-950/95`, hamburger slate-300. |
| 20 | Hero stated the same numbers twice | Subhead trimmed; pill bar keeps the figures. |
| 21 | No outbound developer signal | GitHub and npm links plus a live downloads badge for `@taxformatter/mcp-server`. |

### 2.2 Canonical host (PR #36)

`taxformatter.com` returns a redirect to `www.taxformatter.com`, but every canonical, `og:url`, JSON-LD `url`, the sitemap's own entries and `robots.txt`'s sitemap pointer named the **non-www** host — so each canonical pointed at a URL that redirects, and the sitemap listed 99 URLs that all bounce.

32 occurrences across 12 files, replaced with an anchored pattern so two things were untouched:

- `noreply@taxformatter.com` in `lib/email.ts` is an **email address**, not a URL.
- `https://api.taxformatter.com` is a different host and must not gain a `www`.

`lib/__tests__/safe-redirect.test.ts` is deliberately unchanged: it is the H-15 open-redirect suite, its base host is arbitrary, and its assertions exist to prove *other* subdomains are rejected.

**Still outstanding:** the redirect is a **307**, not a 301. Temporary redirects do not consolidate link equity. That is Vercel domain configuration, not code.

---

## 3. Repository hardening (PR #38)

GitHub scored the community profile at **28%**. The code and README were in good shape; everything around them was missing, which reads as abandoned on a public repo that the npm and MCP registries link back to.

| Added | Detail |
| ----- | ------ |
| `LICENSE` | Source-available, all rights reserved — matching what the README already claimed. Published npm and PyPI client packages carved out; they are licensed separately in their own package directories. |
| `SECURITY.md` (root) | Private reporting path, response-time expectations, scope in/out. |
| `.github/dependabot.yml` | All six manifests. Minor and patch group into one PR; **majors stay separate** so a breaking framework bump is never bundled with routine noise. |
| Issue templates | Route security reports to private advisories, warn against attaching real financial data to public issues, separate parsing bugs from everything else. |
| `CONTRIBUTING.md` | Bug reports welcome; outside PRs not accepted; local dev and test commands including the `cd backend` requirement for pytest. |
| PR template | Verification checklist plus a reminder that the backend does **not** auto-deploy. |
| `package.json` | `description`, `license`, `author`, `homepage`, `repository`, `bugs` — all previously absent. |

### Two defects found while doing this

1. **A vulnerability reporter had no contact path.** `docs/SECURITY.md` said *"Email the owner directly (see `package.json` author field)"* — and `package.json` had no author field. It also pointed at `SECURITY_AUDIT.md` "at the repo root"; the file is in `docs/`. Both pointers fixed.
2. **Nothing was watching dependencies.** Both advisory rounds above were found by CI going red, days after publication. Dependabot alerts, security updates and version updates are now all enabled.

### Repository settings changed

- Description and 10 topics set (the About box was empty).
- Private vulnerability reporting **enabled**.
- Dependabot alerts and automated security fixes **enabled**.
- **18 merged branches deleted**, each verified as an ancestor of `main` first.

### ⚠️ Unresolved: `backup/pre-history-scrub`

The public branch `backup/pre-history-scrub` (tip `f9f3e9d`, 482 commits not in `main`) still holds live-format `sk-ant-` and `AIza` keys in `backend/terraform/terraform.tfvars.example`. `main` has none — the filter-repo scrub worked, and **this branch quietly preserves what it removed, in public**.

Per [SECURITY_REAUDIT_2026-05-20.md](SECURITY_REAUDIT_2026-05-20.md) those keys were rotated 2026-04-30 and 401-verified 2026-05-04, so this is near-certainly dead credentials. The exposure is nonetheless real, and "we scrubbed the history" is not true while the branch exists.

**Recommended:** clone it somewhere private, then `git push origin --delete backup/pre-history-scrub`. **Do this before any repository transfer** — a transfer carries every branch and all history with it.

---

## 4. Findings that did not survive inspection

Each was checked in the codebase or the browser before any fix was attempted. Recording them matters as much as the fixes: without this section, someone later goes looking for changes that were deliberately never made.

| # | Claim | What was actually true |
| - | ----- | ---------------------- |
| 6 | "The Python snippet's `<pre>` is clipped on mobile with no way to scroll." | **Not a bug.** The wrapper is already `overflow-x: auto`; `scrollWidth` 490 vs `clientWidth` 378, and it scrolls 111.5px. **No change made.** |
| 8 | "CTAs misalign because feature counts differ and Free has a note under its button." | Real, but misdiagnosed. Cards already used `flex flex-col` with `flex-1` on the feature list. The cause was solely the trailing note. Growth's remaining 6px is its intentional `md:-translate-y-2` featured lift, not a defect. |
| 13 | "Cutting section padding removes ~20% of the scroll." | It removes **4.3%** — 8847px → 8463px at 1280 wide. Padding was never where the height lived; TrustEngine, the exchange grid and the FAQ are tall because of their content. |
| 15 | "Secondary → slate-400, helper → slate-500." | slate-500 is itself **3.62:1** — still failing AA. No slate step between it and slate-400 passes, so both tiers went to slate-400 and hierarchy moved to size and weight. |
| 17 | "'One plan, two ways to use it' — followed by four plans." | **Not a contradiction.** It refers to dashboard vs API access, and the subhead says so directly. Only the vendor names were a real problem. |
| 18 | "Explain the checkmarks or remove them; kill the ENGINE divider." | The checkmarks encode `status: 'tested'` vs `'config'` — they needed a **legend**, not removal. The divider is the middle of a deliberate Input → Engine → Output pipeline visual and communicates the section's structure. **Kept.** |

---

## 5. Pull requests

| PR | Scope | Commits | Files | Diff | State |
| -- | ----- | ------- | ----- | ---- | ----- |
| [#34](https://github.com/Sean-Bravo/trw/pull/34) | Site audit — theming, SEO metadata, coherence, contrast | 22 | 36 | +445 / −366 | Merged |
| [#35](https://github.com/Sean-Bravo/trw/pull/35) | next-auth + vitest criticals | 1 | 2 | +44 / −358 | Merged |
| [#36](https://github.com/Sean-Bravo/trw/pull/36) | Canonical URLs on the www host | 1 | 12 | +32 / −32 | Merged |
| [#37](https://github.com/Sean-Bravo/trw/pull/37) | Next.js RCE advisories | 1 | 2 | +232 / −221 | Merged |
| [#38](https://github.com/Sean-Bravo/trw/pull/38) | Community health files | 1 | 11 | +381 / −7 | Merged |
| [#60](https://github.com/Sean-Bravo/trw/pull/60) | All 58 Dependabot alerts | 2 | 3 | +1225 / −1587 | **Open** |

Branches were rebased rather than merge-committed, keeping `main`'s history linear. Verification on every PR: `tsc --noEmit` clean, full Jest suite with zero project failures, production build, and in-browser measurement of the specific claim.

### Note on the test suite

`npm test` reports failing suites that are **not** project failures — they are stale copies under `.claude/worktrees/` (agent scratch worktrees) running old components against old tests. The project's own suites are green. Excluding `/.claude/` from `testPathIgnorePatterns` in `jest.config.js` would make a clean run recognisable.

### New test coverage

`__tests__/lib/email.test.ts` (PR #60). Every existing email test mocks `@/lib/email` wholesale, so nothing exercised the nodemailer calls themselves — a signature change across the 7.x → 10.x major bump would have broken account verification and password reset **silently, with a green suite**. The new test mocks nodemailer directly and asserts transport options, the port-465 implicit-TLS branch, the `sendMail` message shape, and that an unconfigured SMTP environment reports `success: false` rather than looking like a delivered email.

---

## 6. Open items

| Item | Owner | Notes |
| ---- | ----- | ----- |
| Merge PR #60 | Owner | Clears the last 58 alerts. Close the 16 routine Dependabot PRs afterwards — most target packages it already bumped. |
| Delete `backup/pre-history-scrub` | Owner | Clone privately first. **Before** any repo transfer. |
| Vercel redirect 307 → 301 | Owner | Project → Domains. The code half is live; only a permanent redirect consolidates ranking. |
| Auth + cross-browser smoke test | Owner | Outstanding launch-gate item since 2026-05-21, now more warranted since `next-auth`, `next` and `nodemailer` all moved. |
| MCP Server documentation | Next | The homepage sells it and `content/docs/` has no page for it at all. Highest-value remaining work. |
| `/docs` landing on the API reference | Next | The Developer API is now first in the sidebar, but `/docs` still opens on the index — the "at least" half of finding #16. |

---

## Caveat

The figures in this report are measurements: contrast ratios, computed backgrounds, canonical tags, HTTP status codes, page heights, advisory ranges. The **design judgements are judgements** — whether the Tier 2 accent and spacing work actually reads better is a matter of taste assessed from screenshots, and is worth reviewing directly.

## Related

- [SECURITY_AUDIT.md](SECURITY_AUDIT.md) — 2026-04-09, 51 findings
- [SECURITY_REAUDIT_2026-05-20.md](SECURITY_REAUDIT_2026-05-20.md) — pre-launch re-audit
- [SECURITY_REMEDIATION_PLAN.md](SECURITY_REMEDIATION_PLAN.md) — per-finding status
- [../ARCHITECTURE.md](../ARCHITECTURE.md) — system design, including the dark-only theming and nested-layout metadata gotchas recorded during this work
