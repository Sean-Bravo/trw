'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';

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
}

interface UseJobPollingOptions {
  interval?: number;
  enabled?: boolean;
  onSuccess?: (job: JobData) => void;
  onError?: (error: Error) => void;
}

const TERMINAL_STATUSES: JobStatus[] = ['succeeded', 'failed', 'canceled'];

export function useJobPolling(
  jobId: string | null,
  options: UseJobPollingOptions = {}
) {
  const { interval = 2500, enabled = true, onSuccess, onError } = options;

  const [job, setJob] = useState<JobData | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Use refs to avoid stale closures in interval
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  const fetchJob = useCallback(async (id: string): Promise<JobData | null> => {
    const response = await fetch(`/api/jobs/${id}`);
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to fetch job');
    }
    return response.json();
  }, []);

  useEffect(() => {
    if (!jobId || !enabled) {
      setIsPolling(false);
      return;
    }

    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const poll = async () => {
      if (!mounted) return;

      try {
        const data = await fetchJob(jobId);
        if (!mounted || !data) return;

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
  }, [jobId, enabled, interval, fetchJob]);

  return { job, isPolling, error };
}
