'use client';

import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { useJobPolling, JobData, BankJobData, UnifiedJob } from '@/hooks/useJobPolling';

interface JobContextValue {
  activeJob: JobData | null;
  jobHistory: JobData[];
  bankJobs: BankJobData[];
  unifiedHistory: UnifiedJob[];
  isPolling: boolean;
  setActiveJob: (jobId: string) => void;
  clearActiveJob: () => void;
  refreshJobHistory: () => Promise<void>;
  refreshBankJobs: () => Promise<void>;
  refreshAll: () => Promise<void>;
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
  const [bankJobs, setBankJobs] = useState<BankJobData[]>([]);

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

  const refreshBankJobs = useCallback(async () => {
    try {
      const response = await fetch('/api/bank/jobs');
      if (response.ok) {
        const data = await response.json();
        setBankJobs(data.jobs || []);
      }
    } catch (err) {
      console.error('[JobContext] Failed to refresh bank jobs:', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshJobHistory(), refreshBankJobs()]);
  }, [refreshJobHistory, refreshBankJobs]);

  // Merge crypto and bank jobs into unified history
  const unifiedHistory = useMemo((): UnifiedJob[] => {
    const cryptoJobs: UnifiedJob[] = jobHistory.map((job) => ({
      id: job.jobId,
      type: 'crypto' as const,
      filename: job.filename,
      status: job.status === 'running' ? 'processing' : job.status === 'succeeded' ? 'completed' : job.status,
      createdAt: job.createdAt,
      error: job.error,
      result: job.result,
      uploadId: job.uploadId,
    }));

    const bankJobsUnified: UnifiedJob[] = bankJobs.map((job) => ({
      id: job.jobId,
      type: 'bank' as const,
      filename: job.filename,
      status: job.status,
      createdAt: job.createdAt,
      error: job.error,
      detectedBank: job.detectedBank,
      transactionCount: job.transactionCount,
      outputFormat: job.outputFormat,
      resultKey: job.resultKey,
    }));

    // Merge and sort by createdAt descending
    return [...cryptoJobs, ...bankJobsUnified].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [jobHistory, bankJobs]);

  // Refresh history on mount
  useEffect(() => {
    if (initialJobs.length === 0) {
      refreshJobHistory();
    }
    // Always fetch bank jobs on mount
    refreshBankJobs();
  }, [initialJobs.length, refreshJobHistory, refreshBankJobs]);

  const value: JobContextValue = {
    activeJob: polledJob,
    jobHistory,
    bankJobs,
    unifiedHistory,
    isPolling,
    setActiveJob,
    clearActiveJob,
    refreshJobHistory,
    refreshBankJobs,
    refreshAll,
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
