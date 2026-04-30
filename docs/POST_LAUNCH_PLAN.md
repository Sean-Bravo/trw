# Post-launch plan: content fix, secret rotation, MCP registration

## Context

Three parallel workstreams, each blocking a different outcome:

1. **Content rendering is broken in production.** `contentlayer2@0.5.8` + `next-contentlayer2@0.5.8` are unmaintained; their `useMDXComponent` runtime evaluates compiled MDX via `new Function(...)` using React internals that changed in React 19. Blog posts throw into the root [app/error.tsx](app/error.tsx) ("Something went wrong") and docs throw into [components/docs/MDXErrorBoundary.tsx](components/docs/MDXErrorBoundary.tsx) ("Error Loading Content") on client hydration. Local `next dev` masks the failure; prod fails consistently. Most customer-visible bug right now.
2. **Launch is blocked on secret rotation.** [SECURITY_AUDIT.md](SECURITY_AUDIT.md) has 51 findings — 42 are remediated in code. The remaining 9 are all CRITICAL, all owner-action: rotate at provider dashboards, scrub git history, audit provider access logs. No code change unblocks launch until this sequence runs.
3. **MCP server isn't discoverable.** [@taxformatter/mcp-server v0.1.0](https://www.npmjs.com/package/@taxformatter/mcp-server) is live on npm but not submitted to Smithery / mcp.run / Glama — the three directories Claude Code / Cursor / Windsurf users browse first. Distribution surface is empty.

Execution order: (1) content fix → customer-facing bug first. (2) secret rotation → launch blocker. (3) MCP submission → distribution, depends on product being up.

_Full plan in `~/.claude/plans/fix-the-buyer-facing-evidence-lively-toucan.md`. Tick boxes here as each item lands; commit updates alongside the code they reflect._

---

## Workstream 1 — Migrate off `contentlayer2`

Status: **shipped on 2026-04-23 (commits `7c75e64` → `e85a774`).** All 40 content URLs render on production with syntax highlighting; error boundaries are dormant.

Replace with `next-mdx-remote-client`. Content is simple (all 40 files — 15 blog + 25 docs — are frontmatter + markdown/code blocks only; no custom JSX inside bodies). Keeps content in `content/`, no routing restructure, preserves `remark-gfm` + `rehype-highlight`.

> **Import path matters** — pick this once and stick with it:
> ```ts
> // ✅ Use — Server Component, serializes + renders in one step
> import { MDXRemote } from 'next-mdx-remote-client/rsc'
>
> // ❌ Don't — Client Component, needs a separate serialize step,
> //    only necessary if MDX bodies use useState / useEffect (they don't here)
> import { MDXRemote } from 'next-mdx-remote-client/csr'
> ```
> The docs page's `CopyButton` is passed via the `components` prop (not embedded inside MDX bodies), so it stays a client component without forcing the whole page to client-render. RSC is correct for both blog and docs.

Critical files: [components/blog/MDXContent.tsx](components/blog/MDXContent.tsx), [app/docs/[...slug]/mdx-content.tsx](app/docs/[...slug]/mdx-content.tsx) (preserve custom `pre` → [CopyButton](components/docs/CopyButton.tsx) wrapper), [next.config.ts](next.config.ts), [contentlayer.config.ts](contentlayer.config.ts). Five call sites need import swap: [app/sitemap.ts](app/sitemap.ts), [app/blog/page.tsx](app/blog/page.tsx), [app/blog/[slug]/page.tsx](app/blog/[slug]/page.tsx), [app/docs/[...slug]/page.tsx](app/docs/[...slug]/page.tsx), [lib/docs-utils.ts](lib/docs-utils.ts).

- [x] `npm install next-mdx-remote-client gray-matter reading-time` (`7c75e64`)
- [x] `npm uninstall contentlayer2 next-contentlayer2` (`f9cef12`; vuln count dropped 20 → 12)
- [x] Create `lib/content/types.ts` (`b857c65`)
- [x] Create `lib/content/posts.ts` (`b857c65`; sorted by date desc at module load)
- [x] Create `lib/content/docs.ts` (`b857c65`, with `/index` strip in `a09adac` to match old route behavior)
- [x] Rewrite `components/blog/MDXContent.tsx` as Server Component using `next-mdx-remote-client/rsc` (`34e478b`)
- [x] Rewrite `app/docs/[...slug]/mdx-content.tsx` as Server Component; `pre` → `<CopyButton>` wrapper preserved (`34e478b`)
- [x] Update all 5 call sites to `@/lib/content/*`; pass `post.body.raw` (`34e478b`; also swapped `post._id` → `post.slug` for React keys)
- [x] Delete `contentlayer.config.ts` (`12ab784`)
- [x] Remove `withContentlayer(...)` + Turbopack alias from `next.config.ts` (`12ab784`)
- [x] Drop `rm -rf .contentlayer && contentlayer2 build && ` from `package.json` build script (`12ab784`)
- [x] Both MDX components are pure Server Components (no `'use client'`) — RSC mode works as designed
- [x] `npm run typecheck` clean; `npm run lint` clean after `7076661` (swapped `performance.now()` → `Date.now()` in playground page + added `**/.venv/**` to eslint ignores)
- [x] `next build` + `npm start` locally: succeeded on fresh build
- [x] Smoke-tested all 40 content URLs locally — all 200, zero `Error Loading Content` / `Something went wrong` matches
- [x] Browser verify on production: blog + docs render, hljs tokens colored (github-dark theme imported in `e85a774`), no error-boundary flashes
- [x] `/sitemap.xml` lists all posts + docs
- [x] Commit + push; Vercel deploy green; prod URLs confirmed rendering correctly

### Rollback criteria

- [ ] If `next build` fails after migration, or prod deploy breaks a page that worked before → `git revert` the migration commits and pin React/react-dom to `^18.3.1` (add `"overrides": { "react": "^18.3.1", "react-dom": "^18.3.1" }` to `package.json`) as a temporary unblock. Root-cause the migration failure offline before retrying.

---

## Workstream 2 — Complete security-audit remediation

Status: **closed out on 2026-04-30.** Full report in [Workstream_2_ report.md](../Workstream_2_%20report.md). Repository is now ready to go public.

**What landed:**

- [x] **C-1a** `NEXTAUTH_SECRET` rotated; Vercel env updated
- [x] **C-1b** Neon database password rotated; `NEON_DATABASE_URL` updated
- [x] **C-1c** Google OAuth client secret rotated; `GOOGLE_CLIENT_SECRET` updated
- [x] **C-1d** Resend API key rotated (new key `taxformatter-production`); old revoked; `SMTP_PASSWORD` updated
- [x] **C-1e** Mailchimp — N/A, removed from stack
- [x] **C-1f** Google Gemini API key deleted (was local-only, not needed in prod)
- [x] **C-1g** npm token: old expired, new Granular Access Token issued; `~/.npmrc` updated
- [x] **C-1h** TaxFormatter `tf_live_` key rotated
- [x] **C-2** Anthropic API key rotated; `ANTHROPIC_API_KEY` added to Vercel (was missing)
- [x] **C-4** Sentry auth token rotated; `SENTRY_AUTH_TOKEN` added to Vercel (was missing)
- [x] **Bonus rotations** flagged in Vercel: AWS access keys, Stripe secret key, Stripe webhook secret
- [x] Single Vercel redeploy after all env vars updated; deployment green
- [x] **C-1i** Backup branch `backup/pre-history-scrub` pushed to remote; `git filter-repo` ran clean over 501 commits; force-pushed to `origin/main`
- [x] `.gitignore` updated; `rotation-replacements.txt`, `.next/`, `.env.local`, `.env.sentry-build-plugin`, `.env.test.local`, `.mcp.json`, `.DS_Store` untracked

**Carried forward (post-launch, non-blocking):**

- [ ] Confirm each old secret returns 401 against its provider (spot-check)
- [ ] Provider access-log audit window: Neon, Resend, GCP, Sentry, npm, Stripe — flag anomalies
- [ ] Enable Sentry project-level data-scrubbing rules (Sentry → Security & Privacy → Data Scrubbers)
- [ ] Update `.env.local` with the new rotated values for local dev
- [ ] Fix Sentry **EvalError** at `/` (CSP `unsafe-eval` follow-up — `last seen 1 day ago`, 3 events)
- [ ] Investigate Sentry **InvariantError** at `/docs/[...slug]/page` (manifests singleton; `last seen 1 week ago`, 8 events — likely pre-migration noise that will age out)

---

## Workstream 3 — MCP directory registration

Status: **not started.** Package already on npm.

- [ ] Verify tests: `cd packages/mcp-server && npm test`. If 0 tests, author smoke tests per tool (`parse`, `list_sources`, `get_usage`) + one error-path test (invalid API key → `TaxFormatterError`)
- [ ] Author `packages/mcp-server/mcp-manifest.json` — `name`, `description`, `tools[]` (3 entries matching `packages/mcp-server/src/tools/*.ts`), `env[]` (`TAXFORMATTER_API_KEY` required, `TAXFORMATTER_API_URL` optional), `homepage`, `license`, `install` command
- [ ] Create `smithery.yaml` in repo root — Smithery's required format, alongside the existing untracked `glama.json`
- [ ] Add `packages/mcp-server/logo.svg` (512×512; reuse brand mark from [components/ui/Logo.tsx](components/ui/Logo.tsx))
- [ ] _(Optional)_ Record a 30-second demo (Claude Code calling parse end-to-end); host somewhere linkable. None of the three directories require this — moves the needle on conversion, not submission
- [ ] **Smithery** (smithery.ai) — submit via GitHub connection; add their badge to [packages/mcp-server/README.md](packages/mcp-server/README.md)
- [ ] **mcp.run** — submit via web form / GitHub integration
- [ ] **Glama** (glama.ai/mcp/servers) — submit via web form
- [ ] Update [TAXFORMATTER_RELEASE_STATUS.md](TAXFORMATTER_RELEASE_STATUS.md) lines 99 & 209 with the three directory-listing URLs once accepted
- [ ] (Optional) `.github/workflows/publish-npm.yml` — version-tag-triggered `npm publish` for mcp-server + sdk-node; eliminates manual publish for future versions
- [ ] Announce: short `/blog` post linking to each directory listing (reuse context from [three-ways-to-use-taxformatter.mdx](content/blog/three-ways-to-use-taxformatter.mdx))

---

## Suggested daily order

Workstream 1 first thing in the morning — most technically complex, tackle while fresh. Workstream 2 mid-day when you need a break from code (pure dashboard work). Workstream 3 end of day — lightest work, good to close out on.

## Gate criteria

| # | Workstream | Est. effort | Gate |
|---|------------|-------------|------|
| 1 | Contentlayer migration | ~3–4 h | All 40 content URLs return 200 on prod after Vercel deploy |
| 2 | Secret rotation | ~2 h owner time | All 10 old secrets rejected; git history scrubbed; provider logs clean |
| 3 | MCP directory submission | ~3 h | Accepted in at least 2 of Smithery / mcp.run / Glama |

## End-to-end verification

- [ ] Prod `/blog/*` and `/docs/*` all render with zero error-boundary flashes over a 5-minute crawl
- [ ] `npm audit --audit-level=critical` still exits 0 after the contentlayer swap
- [ ] curl against each rotated provider endpoint returns 401 with the OLD key (confirms revocation)
- [ ] `@taxformatter/mcp-server` appears in at least two MCP directory searches
- [ ] `npx @taxformatter/mcp-server` in a fresh shell with `TAXFORMATTER_API_KEY=<new>` starts and answers a `parse` call
