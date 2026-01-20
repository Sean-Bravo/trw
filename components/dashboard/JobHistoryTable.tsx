'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, Clock, CheckCircle, XCircle, Loader2, FileText, Eye, RotateCcw } from 'lucide-react';
import { useJobContext } from '@/contexts/JobContext';
import { JobData } from '@/hooks/useJobPolling';

export function JobHistoryTable() {
  const { jobHistory, activeJob, setActiveJob, refreshJobHistory } = useJobContext();

  if (jobHistory.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-zinc-800/50 border border-zinc-700 flex items-center justify-center">
          <FileText className="h-8 w-8 text-zinc-600" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          No uploads yet
        </h3>
        <p className="text-sm text-zinc-500 max-w-sm mx-auto">
          Upload your first CSV file to start processing your crypto transactions
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobHistory.map((job) => (
        <JobRow
          key={job.jobId}
          job={job}
          isActive={activeJob?.jobId === job.jobId}
          onSelect={() => setActiveJob(job.jobId)}
          onRetrySuccess={() => {
            refreshJobHistory();
            setActiveJob(job.jobId);
          }}
        />
      ))}
    </div>
  );
}

interface JobRowProps {
  job: JobData;
  isActive: boolean;
  onSelect: () => void;
  onRetrySuccess: () => void;
}

function JobRow({ job, isActive, onSelect, onRetrySuccess }: JobRowProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryError(null);

    try {
      const response = await fetch(`/api/jobs/${job.jobId}/retry`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setRetryError(data.error || 'Retry failed');
        return;
      }

      // Refresh job list to show new status
      onRetrySuccess();
    } catch {
      setRetryError('Failed to connect');
    } finally {
      setIsRetrying(false);
    }
  };
  const statusConfig = {
    queued: {
      icon: <Clock className="h-4 w-4 text-zinc-500" />,
      text: 'Queued',
      color: 'text-zinc-400',
      bg: 'bg-zinc-800/50',
    },
    running: {
      icon: <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />,
      text: 'Processing',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    succeeded: {
      icon: <CheckCircle className="h-4 w-4 text-emerald-400" />,
      text: 'Completed',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    failed: {
      icon: <XCircle className="h-4 w-4 text-red-400" />,
      text: 'Failed',
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    },
    canceled: {
      icon: <XCircle className="h-4 w-4 text-zinc-400" />,
      text: 'Canceled',
      color: 'text-zinc-400',
      bg: 'bg-zinc-800/50',
    },
  };

  const status = statusConfig[job.status] || statusConfig.queued;
  const result = job.result as Record<string, unknown> | null;
  const transactionCount = result?.['transactionCount'] as number | undefined;
  const exchangeDetected = result?.['exchangeDetected'] as string | undefined;

  // Retry info from job data
  const retryCount = (job as { retryCount?: number }).retryCount || 0;
  const lastRetryAt = (job as { lastRetryAt?: string }).lastRetryAt;

  // Format the date with time
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      onClick={onSelect}
      className={`flex items-center justify-between p-4 rounded-xl transition-all duration-200 border cursor-pointer ${
        isActive
          ? 'bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/15'
          : 'bg-zinc-800/30 hover:bg-zinc-800/50 border-zinc-800/50 hover:border-zinc-700/50'
      } group`}
    >
      <div className="flex items-center gap-4 flex-1">
        {/* Status Icon */}
        <div className={`${status.bg} p-2.5 rounded-lg border border-zinc-700/50`}>
          {status.icon}
        </div>

        {/* Job Details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {job.filename || 'Unnamed file'}
          </p>
          <div className="flex items-center gap-4 mt-1 flex-wrap">
            <span className={`text-xs font-medium ${status.color}`}>
              {status.text}
            </span>
            <span className="text-xs text-zinc-500">
              {formatDate(job.createdAt)}
            </span>
            {exchangeDetected && (
              <span className="text-xs text-cyan-400">
                {exchangeDetected}
              </span>
            )}
            {transactionCount !== undefined && transactionCount > 0 && (
              <span className="text-xs text-zinc-500">
                {transactionCount} transactions
              </span>
            )}
          </div>
          {/* Error message for failed jobs */}
          {job.status === 'failed' && job.error && (
            <p className="text-xs text-red-400/80 mt-1.5 truncate" title={job.error}>
              {job.error}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
        {/* View button - always show for completed jobs */}
        {job.status === 'succeeded' && (
          <Link
            href={`/dashboard/jobs/${job.jobId}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 hover:border-cyan-500/30 transition-all whitespace-nowrap"
          >
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">View</span>
          </Link>
        )}
        {job.status === 'succeeded' && (
          <button
            onClick={async () => {
              try {
                const response = await fetch(`/api/jobs/${job.jobId}/download?type=formatted`);
                if (!response.ok) throw new Error('Download failed');
                const { url } = await response.json();
                window.open(url, '_blank');
              } catch (error) {
                console.error('Download error:', error);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 hover:border-zinc-600 transition-all whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download</span>
          </button>
        )}
        {job.status === 'failed' && (
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isRetrying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{isRetrying ? 'Retrying...' : 'Retry'}</span>
            </button>
            {retryCount > 0 && (
              <span className="text-xs text-zinc-500">
                Tried {retryCount}x {lastRetryAt && `• ${formatDate(lastRetryAt)}`}
              </span>
            )}
            {retryError && (
              <span className="text-xs text-red-400">{retryError}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
