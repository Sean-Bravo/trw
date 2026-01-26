'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useJobPolling, JobData, JobStatus } from '@/hooks/useJobPolling';

interface JobContextValue {
  activeJob: JobData | null;
  jobHistory: JobData[];
  isPolling: boolean;
  setActiveJob: (jobId: string) => void;
  clearActiveJob: () => void;
  refreshJobHistory: () => Promise<void>;
}

const JobContext = createContext<JobContextValue | null>(null);

interface JobProviderProps {
  userId: string;
  initialJobs?: JobData[];
  children: ReactNode;
}

export function JobProvider({ userId, initialJobs = [], children }: JobProviderProps) {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobHistory, setJobHistory] = useState<JobData[]>(initialJobs);

  // Poll the active job
  const { job: polledJob, isPolling } = useJobPolling(activeJobId, {
    onSuccess: (job) => {
      // Update job in history when poll returns
      setJobHistory((prev) => {
        const idx = prev.findIndex((j) => j.jobId === job.jobId);
        if (idx >= 0) {
          const oldJob = prev[idx];
          if (!oldJob) {
            return [job, ...prev];
          }
          const updated = [...prev];
          updated[idx] = job;

          // If job just completed (was running/queued, now succeeded/failed), refresh full list
          const wasProcessing = oldJob.status === 'running' || oldJob.status === 'queued';
          const isNowComplete = job.status === 'succeeded' || job.status === 'failed';
          if (wasProcessing && isNowComplete) {
            // Refresh after a short delay to ensure stats update
            setTimeout(() => refreshJobHistory(), 500);
          }

          return updated;
        }
        // Add to history if not found (new job)
        return [job, ...prev];
      });
    },
  });

  const setActiveJob = useCallback((jobId: string) => {
    setActiveJobId(jobId);
  }, []);

  const clearActiveJob = useCallback(() => {
    setActiveJobId(null);
  }, []);

  const refreshJobHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/jobs');
      if (response.ok) {
        const data = await response.json();
        setJobHistory(data.jobs || []);
      }
    } catch (err) {
      console.error('[JobContext] Failed to refresh job history:', err);
    }
  }, []);

  // Refresh history on mount
  useEffect(() => {
    if (initialJobs.length === 0) {
      refreshJobHistory();
    }
  }, [initialJobs.length, refreshJobHistory]);

  const value: JobContextValue = {
    activeJob: polledJob,
    jobHistory,
    isPolling,
    setActiveJob,
    clearActiveJob,
    refreshJobHistory,
  };

  return <JobContext.Provider value={value}>{children}</JobContext.Provider>;
}

export function useJobContext() {
  const context = useContext(JobContext);
  if (!context) {
    throw new Error('useJobContext must be used within a JobProvider');
  }
  return context;
}
