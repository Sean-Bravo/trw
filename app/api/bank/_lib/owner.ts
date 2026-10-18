import { createHash } from 'crypto';

/**
 * Owner of a bank job (security report issue #2). /api/bank/presigned-url
 * records it in bank_job_uploads (migration 017) and /api/bank/process only
 * processes a job recorded for the same owner.
 */
export interface BankJobOwner {
  /** users.id for a logged-in caller, else null. */
  userId: string | null;
  /** SHA-256 hex of the rate-limit identity for a logged-out caller, else null. */
  anonIdHash: string | null;
  /** Value of the S3 object's x-amz-meta-user-id, which the Lambda checks. */
  metadataUserId: string;
}

export function bankJobOwner(sessionUserId: string | undefined | null, identifier: string): BankJobOwner {
  if (sessionUserId) {
    return { userId: sessionUserId, anonIdHash: null, metadataUserId: sessionUserId };
  }
  return {
    userId: null,
    anonIdHash: createHash('sha256').update(identifier).digest('hex'),
    metadataUserId: `anon-${identifier}`,
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isJobId(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}
