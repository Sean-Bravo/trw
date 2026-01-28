'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Download, Clock, CheckCircle, XCircle, Loader2, FileText, Eye, RotateCcw, Trash2, Building2, BarChart3 } from 'lucide-react';
import { useJobContext, JobFilter } from '@/contexts/JobContext';
import { JobData, UnifiedJob } from '@/hooks/useJobPolling';

export function JobHistoryTable() {
  const { jobHistory, unifiedHistory, activeJob, setActiveJob, clearActiveJob, refreshJobHistory, refreshAll } = useJobContext();
  const [filter, setFilter] = useState<JobFilter>('all');

  // Filter the unified history based on selected tab
  const filteredHistory = unifiedHistory.filter((job) => {
    if (filter === 'all') return true;
    return job.type === filter;
  });

  // Count jobs by type
  const cryptoCount = unifiedHistory.filter((j) => j.type === 'crypto').length;
  const bankCount = unifiedHistory.filter((j) => j.type === 'bank').length;

  if (unifiedHistory.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-zinc-800/50 border border-zinc-700 flex items-center justify-center">
          <FileText className="h-8 w-8 text-zinc-600" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          No uploads yet
        </h3>
        <p className="text-sm text-zinc-500 max-w-sm mx-auto">
          Upload your first CSV file or bank statement to start processing
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-zinc-800/50 rounded-lg border border-zinc-700/50 w-fit">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            filter === 'all'
              ? 'bg-zinc-700 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
          }`}
        >
          All
          <span className="ml-1.5 text-xs opacity-70">({unifiedHistory.length})</span>
        </button>
        <button
          onClick={() => setFilter('crypto')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-all ${
            filter === 'crypto'
              ? 'bg-zinc-700 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Crypto
          <span className="ml-1 text-xs opacity-70">({cryptoCount})</span>
        </button>
        <button
          onClick={() => setFilter('bank')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-all ${
            filter === 'bank'
              ? 'bg-zinc-700 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Bank
          <span className="ml-1 text-xs opacity-70">({bankCount})</span>
        </button>
      </div>

      {/* Job list */}
      <div className="space-y-3">
        {filteredHistory.map((job) => (
          <UnifiedJobRow
            key={`${job.type}-${job.id}`}
            job={job}
            isActive={activeJob?.jobId === job.id}
            onSelect={() => job.type === 'crypto' && setActiveJob(job.id)}
            onRetrySuccess={() => {
              refreshJobHistory();
              if (job.type === 'crypto') setActiveJob(job.id);
            }}
            onDeleteSuccess={() => {
              if (activeJob?.jobId === job.id) {
                clearActiveJob();
              }
              refreshAll();
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface UnifiedJobRowProps {
  job: UnifiedJob;
  isActive: boolean;
  onSelect: () => void;
  onRetrySuccess: () => void;
  onDeleteSuccess: () => void;
}

function UnifiedJobRow({ job, isActive, onSelect, onRetrySuccess, onDeleteSuccess }: UnifiedJobRowProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Use different endpoints for crypto vs bank
      const endpoint = job.type === 'crypto'
        ? `/api/uploads/${job.id}`  // Crypto uses upload ID
        : `/api/bank/jobs/${job.id}`;  // Bank uses job ID

      const response = await fetch(endpoint, {
        method: 'DELETE',
      });
      if (response.ok) {
        setIsDeleted(true);
        setShowDeleteModal(false);
        onDeleteSuccess();
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRetry = async () => {
    if (job.type !== 'crypto') return; // Only crypto jobs have retry

    setIsRetrying(true);
    setRetryError(null);

    try {
      const response = await fetch(`/api/jobs/${job.id}/retry`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setRetryError(data.error || 'Retry failed');
        return;
      }

      onRetrySuccess();
    } catch {
      setRetryError('Failed to connect');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDownload = async () => {
    try {
      if (job.type === 'crypto') {
        const response = await fetch(`/api/jobs/${job.id}/download?type=formatted`);
        if (!response.ok) throw new Error('Download failed');
        const { downloadUrl } = await response.json();
        window.open(downloadUrl, '_blank');
      } else {
        // Bank download - fetch as blob
        const response = await fetch(`/api/bank/job/${job.id}/download?format=${job.outputFormat || 'qbo'}`);
        if (!response.ok) throw new Error('Download failed');
        const data = await response.json();

        const fileResponse = await fetch(data.downloadUrl);
        const blob = await fileResponse.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `bank_${job.id}_${job.outputFormat || 'qbo'}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const statusConfig = {
    queued: {
      icon: <Clock className="h-4 w-4 text-zinc-500" />,
      text: 'Queued',
      color: 'text-zinc-400',
      bg: 'bg-zinc-800/50',
    },
    processing: {
      icon: <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />,
      text: 'Processing',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    completed: {
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

  // Get type-specific display info
  const TypeIcon = job.type === 'crypto' ? BarChart3 : Building2;
  const typeColor = job.type === 'crypto' ? 'text-indigo-400' : 'text-cyan-400';
  const typeBg = job.type === 'crypto' ? 'bg-indigo-500/10' : 'bg-cyan-500/10';

  // Extract extra info based on type
  const extraInfo = job.type === 'crypto'
    ? (job.result as Record<string, unknown>)?.['exchangeDetected'] as string | undefined
    : job.detectedBank;

  const transactionCount = job.type === 'crypto'
    ? (job.result as Record<string, unknown>)?.['transactionCount'] as number | undefined
    : job.transactionCount;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-xl transition-all duration-200 border cursor-pointer ${
        isActive
          ? 'bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/15'
          : 'bg-zinc-800/30 hover:bg-zinc-800/50 border-zinc-800/50 hover:border-zinc-700/50'
      } group`}
    >
      {/* Top row: Icon + Details + Actions (desktop) */}
      <div className="flex items-center gap-4">
        {/* Type + Status Icon */}
        <div className="flex items-center gap-2">
          <div className={`${typeBg} p-2 rounded-lg border border-zinc-700/50 flex-shrink-0`}>
            <TypeIcon className={`h-4 w-4 ${typeColor}`} />
          </div>
          <div className={`${status.bg} p-2.5 rounded-lg border border-zinc-700/50 flex-shrink-0`}>
            {status.icon}
          </div>
        </div>

        {/* Job Details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {job.filename || 'Unnamed file'}
          </p>
          <div className="flex items-center gap-2 sm:gap-4 mt-1 flex-wrap">
            <span className={`text-xs font-medium ${status.color}`}>
              {status.text}
            </span>
            <span className="text-xs text-zinc-500">
              {formatDate(job.createdAt)}
            </span>
            {extraInfo && (
              <span className={`text-xs ${typeColor} hidden sm:inline`}>
                {extraInfo}
              </span>
            )}
            {transactionCount != null && transactionCount > 0 && (
              <span className="text-xs text-zinc-500 hidden sm:inline">
                {transactionCount} transactions
              </span>
            )}
          </div>
        </div>

        {/* Actions - Desktop only (inline) */}
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {job.status === 'completed' && !isDeleted && (
            <>
              {job.type === 'crypto' && (
                <Link
                  href={`/dashboard/jobs/${job.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 hover:border-cyan-500/30 transition-all"
                >
                  <Eye className="h-4 w-4" />
                  View
                </Link>
              )}
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 hover:border-zinc-600 transition-all"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 hover:border-red-500/30 transition-all"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </>
          )}
          {job.status === 'failed' && !isDeleted && (
            <div className="flex items-center gap-2">
              {job.type === 'crypto' && (
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRetrying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  {isRetrying ? 'Retrying...' : 'Retry'}
                </button>
              )}
              <button
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 hover:border-red-500/30 transition-all"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
              {retryError && (
                <span className="text-xs text-red-400">{retryError}</span>
              )}
            </div>
          )}
          {(job.status === 'queued' || job.status === 'canceled') && !isDeleted && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 hover:border-red-500/30 transition-all"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Actions - Mobile only (below content) */}
      <div className="flex sm:hidden items-center gap-2 mt-3 pt-3 border-t border-zinc-700/50" onClick={(e) => e.stopPropagation()}>
        {job.status === 'completed' && !isDeleted && (
          <>
            {job.type === 'crypto' && (
              <Link
                href={`/dashboard/jobs/${job.id}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-lg"
              >
                <Eye className="h-4 w-4" />
                View
              </Link>
            )}
            <button
              onClick={handleDownload}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-zinc-800 border border-zinc-700 rounded-lg"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
        {job.status === 'failed' && !isDeleted && (
          <>
            {job.type === 'crypto' && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRetrying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                {isRetrying ? 'Retrying...' : 'Retry'}
              </button>
            )}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
        {(job.status === 'queued' || job.status === 'canceled') && !isDeleted && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteModal(true);
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        )}
      </div>

      {/* Delete Confirmation Modal - rendered via portal to document.body */}
      {mounted && showDeleteModal && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete {job.type === 'crypto' ? 'File' : 'Statement'}</h3>
                <p className="text-sm text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-slate-300 mb-6">
              Are you sure you want to permanently delete <span className="font-medium text-white">{job.filename}</span>?
              {job.type === 'crypto' && ' This will remove your uploaded file and processed results forever.'}
            </p>

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Forever
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
