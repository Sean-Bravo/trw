/**
 * A crypto job finishes in seconds and a bank PDF in under a minute, so a job
 * still queued or processing long after upload is stuck, not working. The
 * dashboard shows it as "Timed out" instead of counting it as "Processing"
 * forever (two Oct 22 jobs sat as "Processing" for hours).
 */
export const STALE_AFTER_MS = 30 * 60 * 1000;

interface StalenessInput {
  status: string;
  createdAt: string;
}

export function isTimedOut(job: StalenessInput, now: number = Date.now()): boolean {
  if (job.status !== 'queued' && job.status !== 'processing') return false;
  const created = Date.parse(job.createdAt);
  if (Number.isNaN(created)) return false;
  return now - created > STALE_AFTER_MS;
}
