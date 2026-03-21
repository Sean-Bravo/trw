# Coding Standards Audit

**Date:** March 19, 2026
**Audited against:** `coding-standards.md`

---

## TypeScript

| Standard | Status | Notes |
|----------|--------|-------|
| Strict mode enabled | ✅ | `tsconfig.json` — `strict: true` + `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature` |
| No `any` types | ✅ | 0 occurrences across all `.ts`/`.tsx` files |
| Interfaces for props, API responses, data models | ✅ | Consistent — `ButtonProps`, `DashboardClientProps`, `JobData`, `UseJobPollingOptions`, etc. |

---

## React

| Standard | Status | Notes |
|----------|--------|-------|
| Functional components only | ⚠️ | 1 class component: `MDXErrorBoundary.tsx` — justified, React requires class components for Error Boundaries |
| Hooks for state and side effects | ✅ | Used throughout |
| One job per component | ✅ | Components are focused and single-purpose |
| Custom hooks for reusable logic | ✅ | `useJobPolling.ts`, `useCheckout.ts`, `useScrollAnimation.ts` in `hooks/` |

---

## Next.js

| Standard | Status | Notes |
|----------|--------|-------|
| Server components by default | ✅ | ~66% server components, ~34% client (only interactive components use `'use client'`) |
| `'use client'` only when needed | ✅ | 43 of 127 component files — all justified (interactivity, hooks, browser APIs) |
| Server Actions for form submissions | ❌ | Not used — all server-side logic goes through API routes. Acceptable but not matching the standard. |
| API routes for webhooks, uploads, etc. | ✅ | 40 API routes — webhooks, uploads, checkout, developer keys, auth |
| Dynamic routes for item/collection pages | ✅ | `[jobId]`, `[slug]`, `[keyId]`, `[...slug]` |

---

## Tailwind CSS v4

| Standard | Status | Notes |
|----------|--------|-------|
| No `tailwind.config.ts` / `.js` | ✅ | None exists — correct for v4 |
| `@theme` directive in `globals.css` | ✅ | Full theme definition (colors, fonts, shadows, transitions) at lines 4–108 |
| `@import "tailwindcss"` | ✅ | Line 1 of `globals.css` |
| No JavaScript-based config | ✅ | All config is CSS-based |

---

## File Organization

| Standard | Status | Notes |
|----------|--------|-------|
| `components/[feature]/ComponentName.tsx` | ✅ | `ui/`, `dashboard/`, `marketing/`, `layout/`, `docs/`, `blog/`, `seo/`, `analytics/`, `premium/` |
| `app/[route]/page.tsx` | ✅ | App Router throughout |
| `lib/[utility].ts` | ✅ | `auth-db.ts`, `jobs-db.ts`, `api-keys.ts`, `stripe.ts`, `validation.ts`, `email.ts` |
| `hooks/` directory | ✅ | 3 custom hooks |

---

## Naming

| Standard | Status | Notes |
|----------|--------|-------|
| Components: PascalCase | ✅ | `ApiKeyManager.tsx`, `AIInsightsPanel.tsx`, `TaxSoftwareSelector.tsx` |
| Functions: camelCase | ✅ | `createApiKey()`, `getJobById()`, `handleDownload()` |
| Constants: SCREAMING_SNAKE_CASE | ✅ | `API_VERSION`, `MAX_FILE_SIZE` |
| Types/Interfaces: PascalCase, no prefix | ✅ | `DbUser`, `JobData`, `ButtonProps` (no `I` prefix) |

---

## Database

| Standard | Status | Notes |
|----------|--------|-------|
| Use Prisma ORM | ❌ | **Not used.** Project uses `@neondatabase/serverless` with direct SQL and a typed wrapper (`lib/db.ts`). Prisma stub exists only for NextAuth build compatibility. |
| `prisma migrate dev` for schema changes | ❌ | Uses raw SQL migrations in `db/migrations/` instead |
| `prisma migrate deploy` in production | ❌ | Migrations run manually against Neon |

> **Note:** The coding standard specifies Prisma, but the project intentionally uses direct Neon SQL for performance (serverless cold starts) and simplicity (11 tables, sole developer). The custom `query<T>()` / `queryOne<T>()` / `execute()` abstraction in `lib/db.ts` provides type safety without Prisma overhead. This is a deliberate architectural decision, not an oversight.

---

## Data Fetching

| Standard | Status | Notes |
|----------|--------|-------|
| Server components fetch directly | ✅ | Dashboard pages fetch data in server components |
| Client components use Server Actions | ❌ | Client components call API routes instead of Server Actions |
| Validate all inputs with Zod | ✅ | `lib/validation.ts` — `emailSchema`, `passwordSchema`, `fileUploadSchema`, etc. Used in auth and API routes. |

---

## Error Handling

| Standard | Status | Notes |
|----------|--------|-------|
| try/catch in server logic | ✅ | All API routes and server functions use try/catch |
| `{ success, data, error }` return pattern | ⚠️ | Most API routes return `{ error }` on failure and data directly on success — close but not standardized |
| User-friendly error messages via toast | ✅ | Toast notifications used in dashboard for upload/download errors |

---

## Code Quality

| Standard | Status | Notes |
|----------|--------|-------|
| No commented-out code | ✅ | Only explanatory doc comments found |
| No unused imports or variables | ✅ | Clean across all sampled files |
| Functions under 50 lines | ⚠️ | Most functions are concise. Some API route handlers and `engine.py` parsers exceed 50 lines — acceptable for complex orchestration logic. |

---

## Styling

| Standard | Status | Notes |
|----------|--------|-------|
| Tailwind CSS for all styling | ✅ | No CSS modules, no styled-components |
| shadcn/ui components | ⚠️ | Custom UI components in `components/ui/` — not using shadcn/ui directly but follows similar patterns |
| No inline styles | ✅ | None found |
| Dark mode first | ✅ | Dark theme is default across all pages |

---

## Summary

| Category | Pass | Warn | Fail |
|----------|------|------|------|
| TypeScript | 3 | 0 | 0 |
| React | 3 | 1 | 0 |
| Next.js | 4 | 0 | 1 |
| Tailwind v4 | 4 | 0 | 0 |
| File Organization | 4 | 0 | 0 |
| Naming | 4 | 0 | 0 |
| Database | 0 | 0 | 3 |
| Data Fetching | 2 | 0 | 1 |
| Error Handling | 2 | 1 | 0 |
| Code Quality | 2 | 1 | 0 |
| Styling | 3 | 1 | 0 |
| **Total** | **31** | **4** | **5** |

**Score: 31/40 passing (77.5%)**

### Deliberate Deviations

The 5 failures are all in two areas:

1. **Prisma** (3 failures) — Intentionally not used. Direct Neon SQL with typed wrappers chosen for serverless performance and simplicity. Not worth changing.

2. **Server Actions** (2 failures) — All server logic uses API routes instead. This is fine architecturally — the API routes serve both the web frontend and future mobile/CLI clients. Server Actions would only help for simple form submissions.

### Evaluated & Declined

- **Response standardization** — Error responses are already consistent (`{ error: "..." }` everywhere). Success shapes vary by route but each is consumed by a specific frontend component. Refactoring 40+ routes + all consumers for a convention change is high churn, low value. Decision: apply `{ success, data, error }` to new routes only going forward.
- **Server Actions** — Evaluated for auth forms. No performance improvement over API routes, and API routes already serve both web and future mobile/CLI clients. Not adopting.
