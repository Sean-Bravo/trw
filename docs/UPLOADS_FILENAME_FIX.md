# Uploads Filename Fix — Operational Notes

**Source commit:** `2ff5a9c` (fix(uploads): preserve original filename through confirm step)
**Status:** Code fix shipped. Manual DB cleanup pending.

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

## ⚠️ Manual DB cleanup pending

The fix only affects uploads going forward. **Existing rows with UUID-shaped filenames need to be cleaned up manually.**

### Step 1 — Find affected rows

Open the Neon SQL editor and run:

```sql
SELECT id, user_id, filename, s3_key, created_at
FROM uploads
WHERE filename ~ '^[0-9a-f]{8}-[0-9a-f]{4}'
ORDER BY created_at DESC;
```

### Step 2 — Decide per row

For each result, decide:

| Situation | Action |
| --- | --- |
| Row has a usable `s3_key` like `uploads/{jobId}/real-name.csv` | Re-derive: `UPDATE uploads SET filename = split_part(s3_key, '/', 3) WHERE id = '<id>';` |
| Row's `s3_key` is also broken (no third part) | `UPDATE uploads SET filename = 'unnamed.csv' WHERE id = '<id>';` |
| Row is an orphan (no associated job, or the user can't remember it) | `DELETE FROM uploads WHERE id = '<id>';` (cascade removes the job too) |

### Step 3 — Verify

Run the same SELECT query again. Should return 0 rows.

```sql
SELECT count(*) FROM uploads WHERE filename ~ '^[0-9a-f]{8}-[0-9a-f]{4}';
-- expect: 0
```

---

## What about the bank-statement flow?

The bank-statement flow stores filename correctly via `app/api/bank/process/route.ts` (which receives `filename: file.name` from the client and inserts it directly). No bug, no cleanup needed.

If you want to confirm:

```sql
SELECT count(*) FROM bank_jobs WHERE filename ~ '^[0-9a-f]{8}-[0-9a-f]{4}';
-- expect: 0
```

---

## Future-proofing (optional, post-launch)

Two small additions would make this class of bug impossible to recur:

1. **Schema constraint:** `ALTER TABLE uploads ADD CONSTRAINT filename_not_uuid_shaped CHECK (filename !~ '^[0-9a-f]{8}-[0-9a-f]{4}');` — rejects writes that would store a UUID-shaped string. Belt-and-suspenders against future code regressions.

2. **Lambda S3 metadata as third source:** the upload Lambda already stores `original-filename` as S3 object metadata. The confirm route could `HeadObject` and read it as a backup if the client didn't send a filename. More robust than path-parsing but adds an S3 round-trip.

Neither is required to close the bug — both are post-launch hardening.

---

## Strategic note (from the conversation that surfaced this)

A bookkeeper-focused advisor pointed out that even with correct filenames, multi-client workflows need a "client/matter" field (e.g. `Smith LLC — Chase — Jan 2026`). **That feature is deferred** until a real bookkeeper asks for it during a sales conversation. Build what customers ask for, not what we anticipate.
