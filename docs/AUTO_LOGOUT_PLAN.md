# Plan: automatic sign-out after inactivity

Status: built 2026-10-24 (feat/auto-sign-out). Needs migration 020 in Neon before merge.

## Why

TaxFormatter holds tax records. Today a session is a NextAuth JWT that lasts
**7 days** and slides every hour (`app/api/auth/[...nextauth]/route.ts`,
`session.maxAge` / `updateAge`). There is **no inactivity timeout**: anyone
who opens the dashboard on the same device within a week is signed in.

## Decisions

| Question | Decision |
|---|---|
| Default idle limit | **30 minutes**, the NIST SP 800-63B inactivity limit for AAL2. Banks use 10–15 minutes, but they guard money movement and TaxFormatter can't move money. |
| User choices | 15 min · **30 min** · 1 hour · 4 hours · Never |
| Warning | A dialog **2 minutes** before sign-out: countdown, **Stay signed in**, **Sign out now**. WCAG 2.2.1 needs ≥20 s and a way to extend. |
| "Never" | Allowed, behind a warning and a fresh sign-in. The existing **7-day absolute limit still applies**, and the UI says so. |
| Turning it off | Requires a sign-in within the last 5 minutes. That works for password and Google accounts alike (`verifyTwoFactorReauth` needs a 2FA code, so it doesn't). Sends an email: "Automatic sign-out was turned off". |
| Scope | Signed-in app (`/dashboard/*` and the routes it calls). The developer API (`/v1/*`, API keys) is unaffected. |

## How it works: two layers

### 1. Server (enforcement)
The browser can be closed, asleep or tampered with, so the server decides.

- The JWT gains three fields:
  - `lastActivity` (epoch ms)
  - `idleTimeoutMin` (the user's setting; `0` = Never)
  - `authTime` (when the user last actually signed in)
- In the `jwt` callback:
  - **Sign-in:** set `authTime = lastActivity = now`, and load `idleTimeoutMin` from `users`.
  - **`trigger === 'update'` with `{ activity: true }`:** set `lastActivity = now`. The client sends this throttled to **once per 60 s**, and only on real input.
  - **`trigger === 'update'` with `{ idleTimeoutMin }`:** after the settings route saved it, copy it into the token.
  - **Any other call** (page loads, `getServerSession` in API routes, job polling): **do not** touch `lastActivity`. If `idleTimeoutMin > 0` and `now - lastActivity > idleTimeoutMin`, mark the token `idleExpired`.
  - **Old tokens** (no `lastActivity` yet): set it to now, so deploying this signs nobody out.
- In the `session` callback: an `idleExpired` token yields a session **without `user.id`**. Every dashboard page and API route already treats that as signed out (`redirect('/login')` / `401`), so no route changes are needed.
- Background polling (`/api/jobs/[id]` every 2.5 s) goes through `getServerSession` but never sends `update`, so it can't keep a session alive.

### 2. Browser (experience)
`components/auth/IdleTimeout.tsx`, mounted once in a new `app/dashboard/layout.tsx` together with the `SessionProvider` the dashboard lacks today:

- **Activity:** `pointerdown`, `keydown`, `wheel`, `touchstart`, `scroll` and `visibilitychange` → visible.
- **Server refresh:** throttled `update({ activity: true })` at most every 60 s.
- **Across tabs:** activity is shared with a `BroadcastChannel` (`localStorage` event as fallback), so working in one tab keeps the others alive.
- **Warning:** at `limit − 2 min`, a `role="alertdialog"` dialog with a live countdown and focus on **Stay signed in**.
- **Time's up:** `signOut({ callbackUrl: '/login?reason=idle' })`. The login page then shows "You were signed out after N minutes of inactivity."
- **Sleep and wake:** on `visibilitychange`/focus, compare the clock with the last activity, and sign out straight away if the limit has passed.
- **Uploads:** while a file is uploading or a job is running (from `JobContext` / the uploaders), the timer holds, so nobody is signed out mid-upload.

## Data

`db/migrations/020_add_idle_timeout.sql` (same header style as 019):

```sql
ALTER TABLE users
  ADD COLUMN idle_timeout_minutes integer NOT NULL DEFAULT 30
  CHECK (idle_timeout_minutes IN (0, 15, 30, 60, 240));  -- 0 = Never
```

Reversible: `ALTER TABLE users DROP COLUMN idle_timeout_minutes;`

## Settings UI

Settings page → a new **Automatic sign-out** card under Two-Factor Authentication:

- **The choice:** a `<select>` with the five options. Saving anything but Never takes effect immediately.
- **Choosing Never** opens a confirmation: "Anyone with access to this device can open your uploads and download your tax files. Only turn this off on a private device you trust. You'll still be signed out after 7 days."
  - **Signed in more than 5 minutes ago:** the dialog asks the user to sign in again first (the existing sign-in flow, then back to Settings).
- **Route:** `PATCH /api/user/idle-timeout` `{ minutes }`.
  - **Checks:** session required, `minutes` must be one of the allowed values, and `0` requires `now - authTime < 5 min`.
  - **Writes** to `users`, then the client calls `update({ idleTimeoutMin })`.
  - **Emails** on a change to `0`, via a new `sendIdleTimeoutDisabledEmail` in `lib/email.ts`.

## Files

| File | Change |
|---|---|
| `db/migrations/020_add_idle_timeout.sql` | new column |
| `lib/auth-db.ts` | read/write `idle_timeout_minutes` |
| `lib/idle-timeout.ts` | shared constants and pure helpers: options, `isIdleExpired(token, now)`, warning lead time |
| `app/api/auth/[...nextauth]/route.ts` | token fields + `jwt`/`session` callback logic |
| `app/api/user/idle-timeout/route.ts` | new PATCH route |
| `app/dashboard/layout.tsx` | new: `SessionProvider` + `<IdleTimeout />` |
| `components/auth/IdleTimeout.tsx` | timer, cross-tab sync, warning dialog |
| `components/auth/DashboardSession.tsx` | `SessionProvider` + `IdleTimeout` for `/dashboard/*` |
| `lib/idle-hold.ts` | `useIdleHold`: uploads/conversions keep the session alive |
| `components/dashboard/IdleTimeoutSettings.tsx` | the Settings card (kept out of the large `SettingsClient`) |
| `app/dashboard/settings/SettingsClient.tsx` | Automatic sign-out card + Never confirmation |
| `app/login/page.tsx` | `?reason=idle` / `?reason=reauth` messages; a `?next=` return path limited to `/dashboard/*` |
| `lib/email.ts` | disabled-notice email |
| `ARCHITECTURE.md` | new gotcha: idle limit, where it's enforced, what counts as activity |

## Tests

- **`lib/idle-timeout`:** expired/not expired, `0` never expires, a missing `lastActivity` counts as fresh.
- **NextAuth callbacks:**
  - an `update` with `activity` refreshes the timestamp
  - other calls don't (polling can't keep a session alive)
  - an expired token gives a session without a user
  - old tokens don't sign anyone out
- **`PATCH /api/user/idle-timeout`:** 401 when signed out, 400 on a bad value, 403 for Never without a recent sign-in, 200 with an email for Never with one.
- **`IdleTimeout` (fake timers):**
  - the warning appears at limit − 2 min
  - Stay signed in resets it
  - sign-out happens at the limit
  - activity in another tab resets it
  - an active upload holds it
  - a waking device past the limit signs out at once
- **Settings card:** options render, Never shows the warning, saving calls the route.

## Rollout

1. **You:** apply migration 020 in Neon (`npm run migrate`, or the SQL editor). Existing users get 30 minutes.
2. **Merge:** Vercel deploys it. There's no Lambda change.
3. **Existing sessions:** they pick up `lastActivity` on their next request, so nobody is signed out by the deploy itself.
4. **Check on prod:** set 15 minutes, leave a tab idle, see the warning at 13 minutes and the sign-out at 15. Then set Never and confirm the warning, the re-sign-in and the email.

## Out of scope

- **Server-side session list / remote "sign out everywhere":** the JWT sessions have no server store. That's a separate, larger change.
- **Changing the 7-day absolute limit.**

## Open questions

- **Default:** 30 minutes, or the stricter 15?
- **Email:** should turning it **back on** also send one? (Proposed: no, only turning it off.)
