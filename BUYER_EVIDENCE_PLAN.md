# Fix the Buyer-Facing Evidence Problem

## Context

Developers who land on taxformatter.com today have no way to verify the API works before signing up. `/upload` is a consumer conversion flow — it shows transactions extracted, but never mentions the API. `/docs/api` is text-only documentation for people who already trust the product. Nothing bridges "it worked for my file" to "here's how I'd call it programmatically." Stripe, Twilio, and Resend all solve this with an in-browser sandbox; it measurably lifts developer signup conversion because it removes "will this work for my use case?" friction *before* account creation.

Ship two features:
1. **API-equivalent panel on `/upload` success** — after a file parses, show the exact curl + JSON response that the public API would produce for the *same* file.
2. **Public `/playground` route** — a Stripe-style in-browser sandbox that POSTs to `/v1/parse` with a demo key (no signup) or a user-pasted key, and renders the response inline.

## Implementation status

_Last updated: 2026-04-20. Update this section as work lands._

### Feature 1 — `/upload` API-equivalent panel

Status: **implemented locally, pending browser verification + commit.**

- [x] Create [components/upload/ApiEquivalentPanel.tsx](components/upload/ApiEquivalentPanel.tsx) — tabs (cURL / Node / Python), synthesized response JSON, copy button, CTA to `/signup`.
- [x] Add `uploadedFilename` state to [app/upload/page.tsx](app/upload/page.tsx) (set in `handleFile`, cleared in `reset`).
- [x] Render panel below drop zone on `state === 'success'`.
- [x] `npm run typecheck` clean; no new lint warnings; `GET /upload` compiles under `next dev`.
- [ ] Manual browser verification: upload a real PDF, confirm the panel renders with correct bank name / tx count / filename, tabs switch, format selector updates both curl and JSON reactively.
- [ ] Commit + push.

### Feature 2 — `/playground` route

Status: **not started.** Blocked on external prerequisite.

- [ ] **Blocking:** provision a dedicated `DEMO_API_KEY` on the `api.taxformatter.com` backend (elevated quota, e.g. 500/day — docs free tier is 10/mo, too low for a shared demo endpoint).
- [ ] Create [app/api/playground/parse/route.ts](app/api/playground/parse/route.ts) same-origin proxy with 15s timeout, no server-side retry, global demo-key quota, X-API-Key scrubbing (see `RELIABILITY.md` §9).
- [ ] Create [lib/playground-proxy.ts](lib/playground-proxy.ts) — pure helpers (key selection, global quota, size cap, format allowlist).
- [ ] Extend [lib/rate-limit.ts](lib/rate-limit.ts) with `rateLimiters.playground` (10/hour/IP).
- [ ] Create [app/playground/page.tsx](app/playground/page.tsx) with left (request builder) + right (response viewer) split.
- [ ] Create [components/playground/PlaygroundRequestBuilder.tsx](components/playground/PlaygroundRequestBuilder.tsx) + [components/playground/PlaygroundResponseViewer.tsx](components/playground/PlaygroundResponseViewer.tsx).
- [ ] Add `/playground` to [components/marketing/Header.tsx](components/marketing/Header.tsx) nav.
- [ ] Add `DEMO_API_KEY`, `NEXT_PUBLIC_PLAYGROUND_ENABLED`, `PLAYGROUND_KILLSWITCH` to [.env.example](.env.example).
- [ ] Unit tests in `lib/__tests__/playground-proxy.test.ts` (key selection, size cap, format allowlist, global quota).
- [ ] Security sanity check: grep built client bundle for `DEMO_API_KEY`, `tf_live_`, `tf_demo_` — must be zero hits.
- [ ] Commit + push.

## Key findings from exploration

- **Upload flow is internal, not the public API.** [app/upload/page.tsx](app/upload/page.tsx) uses a 3-step internal path (presigned S3 → PUT → `/api/bank/process`), not `POST /v1/parse`. The public API lives at `https://api.taxformatter.com/v1/parse` — an *external* backend. The "API equivalent" panel must therefore be constructed client-side, not lifted from the internal response.
- **Public API shape is documented and stable.** [content/docs/api/index.md:44-79](content/docs/api/index.md#L44-L79) defines request (`{file_content: <base64>, filename, output_format, exchange?}` + `X-API-Key` header) and response (`{status, summary, detected_source, source_type, output_format, transactions[], warnings[], metadata}`).
- **Docs advertise a free tier** (10 files/mo, 10 rpm, no credit card) but it's still gated by signup today — which is exactly the friction the playground is meant to remove.
- **No `/v1/parse` proxy and no demo key exist in this repo.** Both must be added.
- **Reusable UI**: [components/marketing/APIDemo.tsx](components/marketing/APIDemo.tsx) has a tabbed Python/Node/cURL code block with copy button — pattern to adapt. [components/docs/CopyButton.tsx](components/docs/CopyButton.tsx) is the reusable copy button.
- **Samples exist**: [public/samples/](public/samples/) ships real Coinbase / Koinly / TurboTax / Form8949 CSVs — perfect "try a sample" fodder for the playground.
- **Rate limiting exists**: [lib/rate-limit.ts](lib/rate-limit.ts) has IP-based limiters; a new `rateLimiters.playground` slots in alongside `fileUploadAnon`.

## Security + launch prerequisite

Memory flags launch as blocked on `SECURITY_AUDIT.md` remediation. Both features expand anonymous attack surface. Specifically:
- [SECURITY_AUDIT.md](SECURITY_AUDIT.md) §M-15 notes IP-based rate limits are bypassable via IP rotation — so the playground proxy must also enforce a **global daily cap on the demo key**, not just per-IP.
- The playground must ship behind a `NEXT_PUBLIC_PLAYGROUND_ENABLED` flag so it can be toggled off if abuse patterns appear post-launch.

## Feature 1: `/upload` API-equivalent panel

### User decision
Synthesize the API response from real parse data (bank, tx count, output_format) — no second backend call, no extra cost.

### Changes

**Create [components/upload/ApiEquivalentPanel.tsx](components/upload/ApiEquivalentPanel.tsx)**
- Props: `{ detectedSource: string, sourceType: 'bank_statement' | 'crypto_exchange', transactionCount: number, outputFormat: string, filename: string }`
- Renders two stacked (mobile) / side-by-side (≥md) cards:
  - **Request** card: tabs for cURL / Node / Python (reuse [components/marketing/APIDemo.tsx](components/marketing/APIDemo.tsx) styling — tab bar, dark `bg-[#111b2e]`, copy button). Templates substitute the user's real `filename` and `outputFormat`.
  - **Response** card: JSON block showing the synthesized response that `/v1/parse` would return, matching the shape in [content/docs/api/index.md:64-79](content/docs/api/index.md#L64-L79). Use real `detected_source`, `transaction_count`, `output_format`; keep `transactions: [/* ... array of N transactions */]` as a placeholder comment rather than fabricating fake rows (honesty).
- Header: "This is how you'd call it programmatically"
- Footer CTA: link to `/signup` with copy "Get your free API key →"
- Reuses [CopyButton.tsx](components/docs/CopyButton.tsx) for each code block.

**Modify [app/upload/page.tsx](app/upload/page.tsx)**
- At [line 356](app/upload/page.tsx#L356) (end of success block, before Error block), render `<ApiEquivalentPanel>` with values from component state (`detectedBank`, `transactionCount`, `selectedFormat`, and the uploaded filename).
- Gate behind a simple "Show API equivalent" disclosure on mobile (optional, to keep the primary download CTA above the fold).

## Feature 2: `/playground` route

### User decision
Server-side demo key + BYOK (Stripe pattern). Anonymous visitors get a working try immediately; power users can paste their own key.

### Changes

**Create [app/api/playground/parse/route.ts](app/api/playground/parse/route.ts)** — same-origin proxy to `api.taxformatter.com/v1/parse`
- `POST` handler accepting `{ file_content: string, filename: string, output_format?: string, exchange?: string, api_key?: string }`.
- Validation:
  - Reject if `file_content` base64 byte length > 1 MB (Next.js default JSON body cap; document this as a playground-only limit — the full API supports 10 MB).
  - Reject unknown `output_format` values.
- Rate limiting:
  - Per-IP via `rateLimiters.playground` (new, see below) — 10/hour.
  - Global daily cap on demo key (new helper in [lib/playground-proxy.ts](lib/playground-proxy.ts)) — 500/day, stored via existing rate-limit primitive keyed on `'playground:demo:global'`.
- Key selection:
  - If `api_key` present in body → forward as `X-API-Key` header (BYOK, user assumes quota cost).
  - Else → attach `process.env.DEMO_API_KEY` server-side. Never echo back.
- Forward to `https://api.taxformatter.com/v1/parse`, stream the response back unchanged (status + JSON). Strip the `X-API-Key` request header from any logging.

**Create [lib/playground-proxy.ts](lib/playground-proxy.ts)** — pure helpers for key selection, quota enforcement, size cap. Keeps the route handler thin and unit-testable.

**Extend [lib/rate-limit.ts](lib/rate-limit.ts)** — add `rateLimiters.playground` with 10 req/hour per IP, matching the `fileUploadAnon` pattern already in the file.

**Create [app/playground/page.tsx](app/playground/page.tsx)** — public, unauthenticated route
- Two-column layout (stacked on mobile):
  - **Left — request builder** ([components/playground/PlaygroundRequestBuilder.tsx](components/playground/PlaygroundRequestBuilder.tsx)):
    - Mode toggle: `Demo key` (default) / `Use my key` (shows input, format validation `tf_live_…`).
    - File source: "Try a sample" dropdown populated from [public/samples/](public/samples/) (Coinbase CSV pre-selected) + "Upload your own" file input (1 MB cap matching proxy).
    - Output format: `koinly | turbotax | coinledger | zenledger`.
    - Live "cURL preview" below — mirrors the exact request that will be sent, updated reactively.
    - `Send request` button.
  - **Right — response viewer** ([components/playground/PlaygroundResponseViewer.tsx](components/playground/PlaygroundResponseViewer.tsx)):
    - Status pill (200 green / 4xx amber / 5xx red) + latency ms.
    - JSON body, monospace, copy button.
    - Empty state: "Send a request to see the response here."
- Footer CTA: "Ready to integrate? [Get your API key →](/signup)".
- Gate the whole route on `process.env.NEXT_PUBLIC_PLAYGROUND_ENABLED === 'true'` (render a `/docs/api` redirect notice otherwise).

**Modify [components/marketing/Header.tsx:34](components/marketing/Header.tsx#L34)** — add `{ href: '/playground', label: 'Playground' }` to `navLinks`, between existing items.

**Modify [.env.example](.env.example)** — add:
```
# Server-only free-tier key used by /playground when visitor provides no key
DEMO_API_KEY=
# Gate /playground rendering (set to "true" to enable)
NEXT_PUBLIC_PLAYGROUND_ENABLED=false
```

### External prerequisite (blocking)
`DEMO_API_KEY` must be provisioned on the `api.taxformatter.com` backend as a dedicated free/demo-tier key with elevated quota (e.g., 500/day) — the documented 10/mo free tier is too low to keep the playground useful. Flag this to whoever owns that backend before merge.

## Files to create / modify

**Create**
- [components/upload/ApiEquivalentPanel.tsx](components/upload/ApiEquivalentPanel.tsx)
- [app/playground/page.tsx](app/playground/page.tsx)
- [components/playground/PlaygroundRequestBuilder.tsx](components/playground/PlaygroundRequestBuilder.tsx)
- [components/playground/PlaygroundResponseViewer.tsx](components/playground/PlaygroundResponseViewer.tsx)
- [app/api/playground/parse/route.ts](app/api/playground/parse/route.ts)
- [lib/playground-proxy.ts](lib/playground-proxy.ts)
- `lib/__tests__/playground-proxy.test.ts`

**Modify**
- [app/upload/page.tsx](app/upload/page.tsx) (render new panel in success state)
- [components/marketing/Header.tsx](components/marketing/Header.tsx) (nav link)
- [lib/rate-limit.ts](lib/rate-limit.ts) (new limiter)
- [.env.example](.env.example) (two new vars)

**Reuse (no change)**
- [components/docs/CopyButton.tsx](components/docs/CopyButton.tsx)
- [components/marketing/APIDemo.tsx](components/marketing/APIDemo.tsx) — visual pattern reference
- [public/samples/](public/samples/)
- [lib/rate-limit.ts](lib/rate-limit.ts) `checkRateLimit()` helper

## Verification

### Upload panel
1. Start dev server; upload a sample bank PDF at `/upload`.
2. Confirm: success UI renders download button (regression check), AND API-equivalent panel appears below with (a) curl command containing the real filename and selected output format, (b) JSON response containing the real bank name and transaction count.
3. Change output format via selector; confirm both curl and JSON update reactively.
4. Click each tab (cURL / Node / Python); confirm copy button copies the active snippet.

### Playground
1. Set `NEXT_PUBLIC_PLAYGROUND_ENABLED=true` and `DEMO_API_KEY=<provisioned>` in `.env.local`.
2. Visit `/playground`; click "Try sample — Coinbase" → "Send request". Confirm a real `200` with parsed transactions from the external API.
3. Open DevTools Network tab; verify the browser calls only `/api/playground/parse` (same origin) — **no** direct `api.taxformatter.com` call, **no** `DEMO_API_KEY` visible in any request/response.
4. Toggle to "Use my key", paste an invalid key (`tf_live_bogus`); confirm proxy returns the upstream 401 unchanged.
5. Upload a 2 MB file; confirm the proxy rejects with a clear 400 before forwarding upstream.
6. Hit the endpoint 11 times from the same IP within an hour (script or repeated clicks); confirm the 11th returns 429.
7. Set `NEXT_PUBLIC_PLAYGROUND_ENABLED=false`; confirm `/playground` no longer renders the sandbox.

### Automated
- New unit tests in `lib/__tests__/playground-proxy.test.ts` covering: key selection (BYOK vs demo), size cap, unknown `output_format` rejection, global-quota hit path.
- Run existing `npm test` + type-check; confirm no regressions.

### Security sanity
- `grep` the built client bundle for `DEMO_API_KEY` and `tf_demo_` / `tf_live_` — must return zero hits in any `_next/static/**/*.js`.
- Confirm [SECURITY_AUDIT.md](SECURITY_AUDIT.md) M-15 mitigation notes are updated to reference the new global-quota layer.
