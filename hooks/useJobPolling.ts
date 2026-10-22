'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';
export type BankJobStatus = 'processing' | 'completed' | 'failed';
export type JobType = 'crypto' | 'bank';

export interface JobData {
  jobId: string;
  uploadId: string;
  status: JobStatus;
  result: Record<string, unknown> | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  filename: string;
  retryCount?: number;
  lastRetryAt?: string | null;
}

export interface BankJobData {
  jobId: string;
  status: BankJobStatus;
  filename: string;
  detectedBank: string | null;
  transactionCount: number | null;
  outputFormat: string;
  resultKey: string | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface UnifiedJob {
  id: string;
  type: JobType;
  filename: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'canceled';
  createdAt: string;
  error: string | null;
  // Crypto-specific
  result?: Record<string, unknown> | null;
  uploadId?: string;
  // Bank-specific
  detectedBank?: string | null;
  transactionCount?: number | null;
  outputFormat?: string;
  resultKey?: string | null;
}

interface UseJobPollingOptions {
  interval?: number;
  enabled?: boolean;
  /** Consecutive failed polls retried (with backoff) before polling gives up. */
  maxRetries?: number;
  onSuccess?: (job: JobData) => void;
  /** Called once, when polling gives up. */
  onError?: (error: Error) => void;
}

const TERMINAL_STATUSES: JobStatus[] = ['succeeded', 'failed', 'canceled'];

// Retrying these can't succeed: signed out, not the owner, or no such job.
const PERMANENT_HTTP_STATUSES = [401, 403, 404];
const MAX_BACKOFF_MS = 30_000;

class PollError extends Error {
  constructor(message: string, readonly httpStatus?: number) {
    super(message);
  }
}

export function useJobPolling(
  jobId: string | null,
  options: UseJobPollingOptions = {}
) {
  const { interval = 2500, enabled = true, maxRetries = 5, onSuccess, onError } = options;

  const [job, setJob] = useState<JobData | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // Bumped by retry() to restart polling after it gave up.
  const [restartCount, setRestartCount] = useState(0);

  // Use refs to avoid stale closures in interval
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  const fetchJob = useCallback(async (id: string): Promise<JobData | null> => {
    const response = await fetch(`/api/jobs/${id}`);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new PollError(data.error || 'Failed to fetch job', response.status);
    }
    return response.json();
  }, []);

  const retry = useCallback(() => {
    setError(null);
    setRestartCount((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!jobId || !enabled) {
      setIsPolling(false);
      return;
    }

    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    let failures = 0;

    const poll = async () => {
      if (!mounted) return;

      try {
        const data = await fetchJob(jobId);
        if (!mounted || !data) return;

        failures = 0;
        setJob(data);
        setError(null);
        onSuccessRef.current?.(data);

        // Stop polling if job reached terminal state
        if (TERMINAL_STATUSES.includes(data.status)) {
          setIsPolling(false);
          return;
        }

        // Schedule next poll
        timeoutId = setTimeout(poll, interval);
      } catch (err) {
        if (!mounted) return;
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);

        // A single failed poll used to end polling for good, leaving the
        // dashboard on "Processing" for a job that had already finished.
        const status = err instanceof PollError ? err.httpStatus : undefined;
        const permanent = status !== undefined && PERMANENT_HTTP_STATUSES.includes(status);
        failures += 1;
        if (!permanent && failures <= maxRetries) {
          timeoutId = setTimeout(poll, Math.min(interval * 2 ** failures, MAX_BACKOFF_MS));
          return;
        }

        onErrorRef.current?.(error);
        setIsPolling(false);
      }
    };

    // Start polling
    setIsPolling(true);
    poll();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [jobId, enabled, interval, maxRetries, fetchJob, restartCount]);

  return { job, isPolling, error, retry };
}
