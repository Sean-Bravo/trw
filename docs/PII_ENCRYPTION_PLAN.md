# PII Encryption at Rest — Plan

**Source:** SECURITY_AUDIT.md §L-11
**Status:** Documentation only — no implementation yet
**Priority:** Low (compliance / defense-in-depth, not actively exploitable)

---

## Current state

TaxFormatter handles regulated data classes:

- **GLBA scope:** bank account holder names, account number suffixes, transaction descriptions, balances, dates
- **Tax-relevant PII:** email addresses, names, sometimes user-uploaded SSNs in transaction memo fields
- **Auth secrets:** password hashes (bcrypt), reset tokens, 2FA secrets, backup codes (hashed)

All of this is stored in Neon Postgres. **Storage-level encryption is on by default in Neon** (AES-256, managed by Neon's storage layer). What we *don't* have today is **application-level encryption** — the rows are plaintext from the perspective of anyone holding the database connection string.

This means:
1. A database dump (legitimate or stolen) shows everything in plaintext.
2. A compromised Neon account / read replica reveals everything.
3. Insider access (Neon employees, future TaxFormatter employees with prod read) sees everything.
4. A SQL injection bug (we have none today, but defense in depth) would expose plaintext.

---

## Threat model

**What encryption-at-rest does protect against:**
- Stolen DB backups
- Compromised storage media (Neon's underlying disks)
- Long-term offline attacks against historical data

**What it does NOT protect against:**
- Live application compromise (the app needs to decrypt on read, so a compromised app server has the keys)
- A SQL injection bug that calls the decrypt function for the attacker
- Stolen Neon credentials with live access

The realistic value is in the *insider* and *backup-leak* scenarios. Storage-level encryption (Neon default) already covers most of those.

---

## Tiered approach

### Tier A — already done (Neon storage encryption)
- AES-256 at the storage layer
- Managed key rotation by Neon
- No code change required
- Covers: stolen disks, lost backup tapes, decommissioned hardware

### Tier B — application-level for highest-sensitivity columns (recommended next step)
Encrypt only the columns where the regulatory exposure is highest:

| Table | Column | Justification |
| --- | --- | --- |
| `users` | `two_factor_secret` | TOTP seed — if leaked, all 2FA codes for that user are predictable |
| `users` | `backup_codes[]` | Already SHA-256 hashed, so technically already at rest. Could be re-encrypted if we ever drop the hash. |
| `users` | `reset_token` | Already short-lived (M-6 fix); encryption adds little. Skip. |
| (future) | `bank_jobs.account_holder_name` | If we add a column for this — currently lives in S3 result objects only |
| (future) | `bank_jobs.account_number_full` | Currently `account_last4` only — full number never stored |

**Implementation pattern:**
- AWS KMS-managed master key
- Per-row data key derivation via `kms.GenerateDataKey` (envelope encryption)
- pgcrypto extension or application-side AES-256-GCM
- Key rotation: rotate the KMS master key annually; existing data stays decryptable via key versions

### Tier C — full transparent column encryption
- Use Neon's `pgcrypto` extension with a master key derived from a Vercel env var
- Encrypt every column containing PII or financial data
- Significantly higher complexity, ~10–20% query overhead
- Justified only if a compliance auditor requires it (PCI DSS, SOC 2 Type II with encryption-at-rest control)

---

## What to do before launch

**Nothing.** Tier A (Neon storage encryption) is already on. Tiers B and C are post-launch hardening, not launch blockers.

---

## What to do post-launch (Sprint 1 after launch)

1. **Confirm Neon's encryption-at-rest is enabled.** Log into the Neon dashboard, check the project's storage settings, take a screenshot, file under `docs/COMPLIANCE/`.
2. **Decide on Tier B scope.** Does the product roadmap include storing full bank account numbers? If yes, Tier B is required before that feature ships. If no, Tier B is optional.
3. **If Tier B is going forward:** create a separate `docs/PII_ENCRYPTION_IMPLEMENTATION.md` with the actual KMS key ARN, the columns to encrypt, the migration plan, and the rollback procedure.

---

## What to do post-launch (Quarter 1 after launch, if needed)

If a compliance audit (SOC 2 Type II, PCI DSS) requires it:
- Implement Tier C with pgcrypto + KMS master key
- Enable Neon's "private link" so the DB is not reachable from the public internet
- Add column-level audit logging via `pgaudit`

---

## Out of scope for this document

- Encryption of S3 result objects (already enabled via `aws_s3_bucket_server_side_encryption_configuration` in Terraform)
- Encryption in transit (already enforced via Neon TLS + HSTS + CSP)
- Backup encryption (Neon-managed)
- Key management process (would be defined when Tier B is scoped)
