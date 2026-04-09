# Account Lockout

**Source fix:** SECURITY_AUDIT.md §H-7
**Implemented in:** `lib/auth-db.ts` (verifyPassword), `db/migrations/009_add_account_lockout.sql`

---

## Why we have it

IP-based rate limiting alone is bypassable by an attacker rotating residential proxies — 1,000 IPs × 5 attempts per 15 min = 5,000 attempts per 15 min per account. That's more than enough to brute-force a weak password in hours.

Per-account lockout closes that gap by counting failures **on the user row**, not on the requesting IP. The attacker can rotate IPs all they want; the counter still climbs.

This is required defense-in-depth for any app handling financial data. Without it, IP-rate-limiting is largely cosmetic against a determined attacker.

---

## How it works

| Setting | Value | Where |
| --- | --- | --- |
| Failure threshold | 5 consecutive failures | `MAX_LOGIN_ATTEMPTS` in `lib/auth-db.ts` |
| Lockout duration | 30 minutes | `LOCKOUT_DURATION_MIN` in `lib/auth-db.ts` |
| Reset trigger | Successful login | `verifyPassword()` |
| Persisted in | `users.failed_login_attempts`, `users.locked_until` | migration 009 |

**Logic flow inside `verifyPassword()`:**

1. Look up the user by email.
2. If `locked_until > now()`, return `null` (same as "invalid password" — see *Why we don't tell the user* below).
3. Compare the bcrypt hash.
4. **On failure:** atomic `UPDATE` increments `failed_login_attempts` and sets `locked_until = now() + 30 min` if the new count is at or above threshold.
5. **On success:** reset `failed_login_attempts = 0`, `locked_until = NULL`.

The increment + lock check is one SQL statement using `CASE WHEN`, so two concurrent failures cannot both slip past the threshold.

---

## What the user sees

A locked user sees the **same** error message as someone typing the wrong password: "Invalid credentials." We do not say "your account is locked."

### Why we don't tell the user

If we showed "Account locked" only on real accounts and "Invalid credentials" on fake ones, an attacker could enumerate which emails are real users by triggering 5 failures and seeing which response changes. That's a known user-enumeration vector (see SECURITY_AUDIT.md §M-4).

The trade-off: a legitimate user who fat-fingers their password 5 times will keep seeing "Invalid credentials" for 30 minutes, even after they remember the right one. They have three options:

1. **Wait 30 minutes** and try again.
2. **Reset their password** via the forgot-password flow (this does *not* clear the lock — see *Limitation* below).
3. **Contact support**, which can manually unlock.

### Limitation: password reset does not unlock

Currently, completing the password reset flow does **not** clear `locked_until`. A user who reset their password during a lockout window will still hit the lock when they try to log in with the new password. They have to wait out the 30 minutes.

This is a tracked follow-up — when M-6 lands (single-use reset tokens), the reset flow should also clear the lock columns.

---

## Admin: how to unlock an account

Manual unlock requires direct DB access (Neon dashboard or `psql`). There is no admin UI today.

### Find locked users

```sql
SELECT
  id,
  email,
  failed_login_attempts,
  locked_until,
  EXTRACT(EPOCH FROM (locked_until - now())) / 60 AS minutes_remaining
FROM users
WHERE locked_until IS NOT NULL
  AND locked_until > now()
ORDER BY locked_until DESC;
```

### Unlock a single user by email

```sql
UPDATE users
SET failed_login_attempts = 0,
    locked_until = NULL
WHERE email = 'user@example.com';
```

Verify it worked:

```sql
SELECT email, failed_login_attempts, locked_until
FROM users
WHERE email = 'user@example.com';
```

Both columns should now be `0` and `NULL`.

### Unlock all currently-locked users (use sparingly)

```sql
UPDATE users
SET failed_login_attempts = 0,
    locked_until = NULL
WHERE locked_until > now();
```

Only do this if you have evidence the lockouts are false positives (e.g. you just tightened the threshold, or a legit batch script hammered the login endpoint). Mass-unlocking after a real attack restores the brute-force window.

### Audit a suspicious lockout

If a user contacts support saying "I was locked out and I don't know why," check whether failed attempts are clustered in time (legitimate fat-fingering) or spread across hours (likely an attacker hitting their account).

```sql
-- Recent auth attempts visible in logs are not stored in the DB —
-- check Sentry / CloudWatch for the relevant time window.
```

There is no `auth_attempts` table today. If lockout audits become routine, add one.

---

## Operational notes

- **Rolling out:** the migration adds two columns with defaults, so existing rows backfill cleanly. No downtime.
- **Migration order:** `db/migrations/009_add_account_lockout.sql` must run **before** the application code referencing `locked_until` is deployed. The Neon HTTP driver will throw `column "locked_until" does not exist` otherwise.
- **Disabling temporarily:** set `MAX_LOGIN_ATTEMPTS` to a very high number (e.g. 1_000_000) and redeploy. Do **not** comment out the lock check — that ships dead code and confuses future readers.
- **Tuning:** if support is fielding many false-positive lockout tickets, raise the threshold to 10 or shorten the duration to 15 min. If you start seeing brute-force attempts in Sentry, lower the threshold to 3 and lengthen the duration to 60 min.

---

## Future improvements

These are tracked but not implemented today:

- **Capacity for support to unlock without DB access** — admin UI page or a `POST /api/admin/users/:id/unlock` endpoint guarded by an admin role check.
- **Email user when locked** — privacy-respecting notification: "Several failed login attempts on your account. If this wasn't you, change your password." Deliberately does not say "you're locked" so the user-enumeration side stays closed.
- **CAPTCHA escalation** — show a CAPTCHA after 3 failures (per email) before reaching the hard lock at 5. Reduces support burden from real fat-fingering while still breaking automated attacks.
- **Password reset clears lock** — after a successful password reset, also clear `locked_until` and `failed_login_attempts`. Tracked with M-6.
