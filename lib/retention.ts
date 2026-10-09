/**
 * Retention policy: everything a user sends us is deleted within 30 days.
 * S3 lifecycle rules (backend/terraform/s3.tf) and the daily prune cron
 * (app/api/cron/prune) both derive from this number.
 */
export const RETENTION_DAYS = 30;
