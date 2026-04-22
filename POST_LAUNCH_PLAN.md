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

Status: **not started.**

Replace with `next-mdx-remote-client`. Content is simple (all 40 files — 15 blog + 25 docs — are frontmatter + markdown/code blocks only; no custom JSX inside bodies). Keeps content in `content/`, no routing restructure, preserves `remark-gfm` + `rehype-highlight`.

Critical files: [components/blog/MDXContent.tsx](components/blog/MDXContent.tsx), [app/docs/[...slug]/mdx-content.tsx](app/docs/[...slug]/mdx-content.tsx) (preserve custom `pre` → [CopyButton](components/docs/CopyButton.tsx) wrapper), [next.config.ts](next.config.ts), [contentlayer.config.ts](contentlayer.config.ts). Five call sites need import swap: [app/sitemap.ts](app/sitemap.ts), [app/blog/page.tsx](app/blog/page.tsx), [app/blog/[slug]/page.tsx](app/blog/[slug]/page.tsx), [app/docs/[...slug]/page.tsx](app/docs/[...slug]/page.tsx), [lib/docs-utils.ts](lib/docs-utils.ts).

- [ ] `npm install next-mdx-remote-client gray-matter reading-time`
- [ ] `npm uninstall contentlayer2 next-contentlayer2`
- [ ] Create `lib/content/types.ts` exporting `Post` and `Doc` interfaces matching current shapes (from `contentlayer.config.ts`)
- [ ] Create `lib/content/posts.ts` — reads `content/blog/*.mdx`, parses with `gray-matter`, computes `readingTime`, exports `allPosts: Post[]` sorted by date desc
- [ ] Create `lib/content/docs.ts` — reads `content/docs/**/*.{md,mdx}`, computes `section`/`url`, exports `allDocs: Doc[]`
- [ ] Rewrite `components/blog/MDXContent.tsx` — swap `useMDXComponent(code)` → `<MDXRemote source={raw} options={{ mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeHighlight] } }} />`
- [ ] Rewrite `app/docs/[...slug]/mdx-content.tsx` — same swap, preserve the `pre` → `<CopyButton>` wrapper via the `components` prop
- [ ] Update all 5 call sites to import from `@/lib/content/posts` / `@/lib/content/docs`; pass `post.body.raw` not `post.body.code`
- [ ] Delete `contentlayer.config.ts`
- [ ] Edit `next.config.ts` — remove `withContentlayer(...)` wrapper + Turbopack `contentlayer/generated` alias
- [ ] Edit `package.json` build script — drop the `rm -rf .contentlayer && contentlayer2 build && ` prefix
- [ ] `npm run typecheck` clean; `npm run lint` no new errors; `npm run build` + `npm start` succeed
- [ ] Smoke-test all 40 content URLs locally via `curl` loop — must return 200; `grep -c "Error Loading Content"` must be 0
- [ ] Browser verify: [/blog/three-ways-to-use-taxformatter](https://www.taxformatter.com/blog/three-ways-to-use-taxformatter) and [/docs/exporting-your-data/zenledger-integration](https://www.taxformatter.com/docs/exporting-your-data/zenledger-integration) — code blocks highlighted, docs CopyButton works, no error boundary flash
- [ ] `/sitemap.xml` still lists all posts and docs
- [ ] Commit + push; confirm Vercel deploy green; retest both URLs on production

---

## Workstream 2 — Complete security-audit remediation

Status: **not started.** Owner-action only (no code changes).

Each rotation: (a) rotate at provider dashboard, (b) update Vercel env, (c) redeploy, (d) confirm old value rejected, (e) tick box below with timestamp.

### Rotations

- [ ] **C-1a** `NEXTAUTH_SECRET` — `openssl rand -base64 32` → Vercel env
- [ ] **C-1b** Neon database password → Vercel `NEON_DATABASE_URL`
- [ ] **C-1c** Google OAuth client secret (console.cloud.google.com → Credentials)
- [ ] **C-1d** Resend API key (resend.com → API Keys)
- [ ] **C-1e** Mailchimp API key (mailchimp.com → Account → Extras → API keys)
- [ ] **C-1f** Google Gemini API key (aistudio.google.com → API keys)
- [ ] **C-1g** npm token (npmjs.com → Access Tokens — generate new, revoke old)
- [ ] **C-1h** TaxFormatter `tf_live_` key (own dashboard → Developer)
- [ ] **C-2** Anthropic API key (console.anthropic.com → API keys)
- [ ] **C-4** Sentry auth token (sentry.io → Settings → Account → API → Auth Tokens)

### Post-rotation (DESTRUCTIVE — take `git branch backup/pre-history-scrub` first)

- [ ] **C-1i** Scrub git history: prepare `rotation-replacements.txt` (`OLDVALUE==>***REDACTED***` per secret); `git filter-repo --replace-text rotation-replacements.txt`; force-push to `origin/main`
- [ ] **C-1j** Audit provider access logs across the rotation window (Neon, Resend, Mailchimp, GCP, Sentry, npm, Stripe). Flag anything outside known client IPs / time windows
- [ ] Tick the CRITICAL section in [SECURITY_AUDIT.md](SECURITY_AUDIT.md); update progress marker in [SECURITY_REMEDIATION_PLAN.md](SECURITY_REMEDIATION_PLAN.md)
- [ ] Enable Sentry project-level data-scrubbing rules (Sentry → Security & Privacy → Data Scrubbers)

---

## Workstream 3 — MCP directory registration

Status: **not started.** Package already on npm.

- [ ] Verify tests: `cd packages/mcp-server && npm test`. If 0 tests, author smoke tests per tool (`parse`, `list_sources`, `get_usage`) + one error-path test (invalid API key → `TaxFormatterError`)
- [ ] Author `packages/mcp-server/mcp-manifest.json` — `name`, `description`, `tools[]` (3 entries matching `packages/mcp-server/src/tools/*.ts`), `env[]` (`TAXFORMATTER_API_KEY` required, `TAXFORMATTER_API_URL` optional), `homepage`, `license`, `install` command
- [ ] Add `packages/mcp-server/logo.svg` (512×512; reuse brand mark from [components/ui/Logo.tsx](components/ui/Logo.tsx))
- [ ] Record a 30-second demo (Claude Code calling parse end-to-end); host somewhere linkable
- [ ] **Smithery** (smithery.ai) — submit via GitHub connection; add their badge to [packages/mcp-server/README.md](packages/mcp-server/README.md)
- [ ] **mcp.run** — submit via web form / GitHub integration
- [ ] **Glama** (glama.ai/mcp/servers) — submit via web form
- [ ] Update [TAXFORMATTER_RELEASE_STATUS.md](TAXFORMATTER_RELEASE_STATUS.md) lines 99 & 209 with the three directory-listing URLs once accepted
- [ ] (Optional) `.github/workflows/publish-npm.yml` — version-tag-triggered `npm publish` for mcp-server + sdk-node; eliminates manual publish for future versions
- [ ] Announce: short `/blog` post linking to each directory listing (reuse context from [three-ways-to-use-taxformatter.mdx](content/blog/three-ways-to-use-taxformatter.mdx))

---

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
