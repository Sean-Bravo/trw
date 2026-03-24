'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Download, Clock, CheckCircle, XCircle, Loader2, FileText, Eye, RotateCcw, Trash2, BarChart3, Building2 } from 'lucide-react';
import { useJobContext } from '@/contexts/JobContext';
import { UnifiedJob, JobType } from '@/hooks/useJobPolling';

type TabFilter = 'all' | 'crypto' | 'bank';

export function JobHistoryTable() {
  const { unifiedHistory, activeJob, setActiveJob, clearActiveJob, refreshAll, refreshBankJobs } = useJobContext();
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  const filteredJobs = unifiedHistory.filter((job) => {
    if (activeTab === 'all') return true;
    return job.type === activeTab;
  });

  const counts = {
    all: unifiedHistory.length,
    crypto: unifiedHistory.filter((j) => j.type === 'crypto').length,
    bank: unifiedHistory.filter((j) => j.type === 'bank').length,
  };

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
          Upload a CSV or bank statement to start processing
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-2">
        <TabButton
          active={activeTab === 'all'}
          onClick={() => setActiveTab('all')}
          icon={null}
          label="All"
          count={counts.all}
        />
        <TabButton
          active={activeTab === 'crypto'}
          onClick={() => setActiveTab('crypto')}
          icon={<BarChart3 className="h-3.5 w-3.5" />}
          label="Crypto"
          count={counts.crypto}
        />
        <TabButton
          active={activeTab === 'bank'}
          onClick={() => setActiveTab('bank')}
          icon={<Building2 className="h-3.5 w-3.5" />}
          label="Bank"
          count={counts.bank}
        />
      </div>

      {/* Job List */}
      <div className="space-y-3">
        {filteredJobs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-zinc-500">
              No {activeTab === 'all' ? '' : activeTab} jobs yet
            </p>
          </div>
        ) : (
          filteredJobs.map((job) => (
            <UnifiedJobRow
              key={job.id}
              job={job}
              isActive={activeJob?.jobId === job.id}
              onSelect={() => job.type === 'crypto' && setActiveJob(job.id)}
              onDeleteSuccess={() => {
                if (activeJob?.jobId === job.id) {
                  clearActiveJob();
                }
                refreshAll();
              }}
              onBankRefresh={refreshBankJobs}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}

function TabButton({ active, onClick, icon, label, count }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
        active
          ? 'bg-zinc-700 text-white'
          : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
      }`}
    >
      {icon}
      {label}
      <span className={`text-xs ${active ? 'text-zinc-300' : 'text-zinc-500'}`}>
        ({count})
      </span>
    </button>
  );
}

interface UnifiedJobRowProps {
  job: UnifiedJob;
  isActive: boolean;
  onSelect: () => void;
  onDeleteSuccess: () => void;
  onBankRefresh: () => void;
}

function UnifiedJobRow({ job, isActive, onSelect, onDeleteSuccess, onBankRefresh }: UnifiedJobRowProps) {
  const [isDownloading, setIsDownloading] = useState(false);
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
      const endpoint = job.type === 'crypto'
        ? `/api/uploads/${job.uploadId}`
        : `/api/bank/jobs/${job.id}`;

      const response = await fetch(endpoint, { method: 'DELETE' });
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

  const handleDownload = async () => {
    if (job.type === 'crypto') {
      // Crypto download
      try {
        const response = await fetch(`/api/jobs/${job.id}/download?type=formatted`);
        if (!response.ok) throw new Error('Download failed');
        const { downloadUrl } = await response.json();
        window.open(downloadUrl, '_blank');
      } catch (error) {
        console.error('Download error:', error);
      }
    } else {
      // Bank download - use blob fetch
      if (isDownloading) return; // Prevent multiple clicks
      setIsDownloading(true);
      try {
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
      } catch (error) {
        console.error('Download error:', error);
      } finally {
        setIsDownloading(false);
      }
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

  // Type indicator
  const TypeIcon = job.type === 'crypto' ? BarChart3 : Building2;
  const typeLabel = job.type === 'crypto' ? 'Crypto' : (job.detectedBank || 'Bank');

  // Transaction count for display
  const transactionCount = job.type === 'crypto'
    ? (job.result?.['transactionCount'] as number | undefined)
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
      {/* Top row: Icon + Details + Actions */}
      <div className="flex items-center gap-4">
        {/* Type + Status Icon */}
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${job.type === 'crypto' ? 'bg-cyan-500/10' : 'bg-emerald-500/10'}`}>
            <TypeIcon className={`h-4 w-4 ${job.type === 'crypto' ? 'text-cyan-400' : 'text-emerald-400'}`} />
          </div>
          <div className={`${status.bg} p-2.5 rounded-lg border border-zinc-700/50 shrink-0`}>
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
            <span className={`text-xs ${job.type === 'crypto' ? 'text-cyan-400' : 'text-emerald-400'}`}>
              {typeLabel}
            </span>
            {transactionCount != null && transactionCount > 0 && (
              <span className="text-xs text-zinc-500 hidden sm:inline">
                {transactionCount} transactions
              </span>
            )}
          </div>
          {/* Error message */}
          {job.status === 'failed' && job.error && (
            <p className="text-xs text-red-400/80 mt-1.5 truncate" title={job.error}>
              {job.error}
            </p>
          )}
        </div>

        {/* Actions - Desktop */}
        <div className="hidden sm:flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
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
                disabled={isDownloading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 hover:border-zinc-600 transition-all disabled:opacity-50"
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
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
          {(job.status === 'queued' || job.status === 'canceled' || job.status === 'failed') && !isDeleted && (
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

      {/* Actions - Mobile */}
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
              disabled={isDownloading}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-zinc-800 border border-zinc-700 rounded-lg disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
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
        {(job.status === 'queued' || job.status === 'canceled' || job.status === 'failed') && !isDeleted && (
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

      {/* Delete Modal */}
      {mounted && showDeleteModal && createPortal(
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center"
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
                <h3 className="text-lg font-semibold text-white">Delete {job.type === 'crypto' ? 'Job' : 'Bank Job'}</h3>
                <p className="text-sm text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-slate-300 mb-6">
              Are you sure you want to permanently delete <span className="font-medium text-white">{job.filename}</span>?
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
