# Uploads Filename Fix — Operational Notes

**Source commit:** `2ff5a9c` (code fix) + this migration (data cleanup + constraint)
**Migration:** `db/migrations/012_uploads_filename_constraint.sql`
**Status:** Code shipped. Run migration 012 against prod to clean legacy data and lock in the guard.

---

## What was broken

The crypto-CSV upload flow stored a UUID-shaped string as the filename for at least one row. Bookkeepers and other multi-file users couldn't tell which uploaded file was which in the dashboard.

Reproduction: `app/api/uploads/[uploadId]/confirm/route.ts` parsed the filename out of the S3 key path (`uploads/{jobId}/{filename}`). When anything ever produced a key with fewer than 3 parts, the stored filename was either a slice of a UUID or `'Unknown file'`.

## What got fixed

`fix(uploads): preserve original filename through confirm step` (`2ff5a9c`):

- The upload client (`lib/upload-client.ts`) now passes the user's original `file.name` in the confirm POST body
- The confirm route (`app/api/uploads/[uploadId]/confirm/route.ts`) prefers that value, falls back to S3-key parsing (legacy behavior), then to `'Unknown file'`
- Type-checked, trimmed, and capped at 255 chars; non-string values rejected
- 4 new tests cover the resolution chain
- Full suite: 792/792 passing

**New uploads will display the original filename verbatim** (e.g. `Smith_LLC_Jan_2026.csv`).

---

## DB cleanup — automated via migration 012

`db/migrations/012_uploads_filename_constraint.sql` does two things in
one transaction:

1. **Data cleanup.** For any existing row where `filename` looks like a
   UUID, it re-derives the real name from `s3_key` (the third path
   segment), or falls back to `'unnamed.csv'` / `'unnamed.pdf'`.
2. **Structural guard.** Adds a `CHECK` constraint to both `uploads`
   and `bank_jobs` that rejects any future write with a UUID-shaped
   filename. The bug class can't recur — a regression would fail at
   the DB layer with a clear error instead of corrupting the dashboard.

### Run

Same as the previous migrations — Neon SQL editor or:

```bash
node scripts/run-migration.mjs db/migrations/012_uploads_filename_constraint.sql
```

### Verify

```sql
-- Should return 0 in both:
SELECT count(*) FROM uploads    WHERE filename ~ '^[0-9a-f]{8}-[0-9a-f]{4}';
SELECT count(*) FROM bank_jobs  WHERE filename ~ '^[0-9a-f]{8}-[0-9a-f]{4}';

-- Should show the new constraints:
SELECT conname FROM pg_constraint
 WHERE conname IN (
   'uploads_filename_not_uuid_shaped',
   'bank_jobs_filename_not_uuid_shaped'
 );
```

### If the migration fails

The most likely cause is an existing row whose `s3_key` is also broken
(empty or missing). The migration's COALESCE handles that — but if you
see an unexpected error, run this to inspect:

```sql
SELECT id, filename, s3_key
  FROM uploads
 WHERE filename ~ '^[0-9a-f]{8}-[0-9a-f]{4}'
    OR filename = '';
```
Then fix manually before re-running.

---

## What about the bank-statement flow?

The bank-statement flow stores filename correctly via `app/api/bank/process/route.ts` (which receives `filename: file.name` from the client and inserts it directly). No bug, no cleanup needed.

If you want to confirm:

```sql
SELECT count(*) FROM bank_jobs WHERE filename ~ '^[0-9a-f]{8}-[0-9a-f]{4}';
-- expect: 0
```

---

## Optional future hardening

The schema constraint shipped in migration 012. One more option remains
for post-launch:

- **Lambda S3 metadata as third source:** the upload Lambda already
  stores `original-filename` as S3 object metadata. The confirm route
  could `HeadObject` and read it as a backup if the client didn't send
  a filename. More robust than path-parsing but adds an S3 round-trip.
  Not required — current resolution chain (client body → S3 key parse
  → `'Unknown file'`) is sufficient.

---

## Strategic note (from the conversation that surfaced this)

A bookkeeper-focused advisor pointed out that even with correct filenames, multi-client workflows need a "client/matter" field (e.g. `Smith LLC — Chase — Jan 2026`). **That feature is deferred** until a real bookkeeper asks for it during a sales conversation. Build what customers ask for, not what we anticipate.
