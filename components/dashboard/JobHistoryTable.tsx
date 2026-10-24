'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { FileText, Loader2, MoreHorizontal, Trash2 } from 'lucide-react';
import { useJobContext } from '@/contexts/JobContext';
import { UnifiedJob } from '@/hooks/useJobPolling';
import { EXCHANGE_SOURCES } from '@/lib/exchange-registry';
import { isTimedOut } from '@/lib/job-staleness';

type TabFilter = 'all' | 'crypto' | 'bank';

const PAGE_SIZE = 7;

export function JobHistoryTable() {
  const { unifiedHistory, activeJob, setActiveJob, clearActiveJob, refreshAll } = useJobContext();
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [showAll, setShowAll] = useState(false);

  const filteredJobs = unifiedHistory.filter((job) => activeTab === 'all' || job.type === activeTab);
  const visibleJobs = showAll ? filteredJobs : filteredJobs.slice(0, PAGE_SIZE);

  const counts = {
    all: unifiedHistory.length,
    crypto: unifiedHistory.filter((j) => j.type === 'crypto').length,
    bank: unifiedHistory.filter((j) => j.type === 'bank').length,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-app-text">History</h2>
        {unifiedHistory.length > 0 && (
          <div role="group" aria-label="Filter history" className="flex gap-1 p-1 rounded-xl bg-app-raised border border-app-border">
            <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} label="All" count={counts.all} />
            <TabButton active={activeTab === 'crypto'} onClick={() => setActiveTab('crypto')} label="Crypto" count={counts.crypto} />
            <TabButton active={activeTab === 'bank'} onClick={() => setActiveTab('bank')} label="Bank" count={counts.bank} />
          </div>
        )}
      </div>

      {unifiedHistory.length === 0 ? (
        <div className="text-center py-14">
          <FileText className="h-8 w-8 text-app-subtle mx-auto mb-3" aria-hidden="true" />
          <p className="font-semibold text-app-text">No uploads yet</p>
          <p className="text-sm text-app-muted mt-1">Upload a CSV or bank statement to start processing</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <p className="text-sm text-app-muted text-center py-8">No {activeTab} jobs yet</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-205 text-sm">
              <thead>
                <tr className="text-left text-app-muted border-b border-app-border">
                  <th scope="col" className="px-3 py-2.5 font-medium">File</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Source</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Uploaded</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                  <th scope="col" className="px-3 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleJobs.map((job) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    isActive={activeJob?.jobId === job.id}
                    onSelect={() => job.type === 'crypto' && setActiveJob(job.id)}
                    onChanged={() => {
                      if (activeJob?.jobId === job.id) clearActiveJob();
                      refreshAll();
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-app-muted">
            <span>Showing {visibleJobs.length} of {filteredJobs.length}</span>
            {filteredJobs.length > PAGE_SIZE && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="min-h-11 font-semibold text-app-link hover:underline"
              >
                {showAll ? 'Show fewer' : 'Show all'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-9 px-3.5 rounded-lg text-sm tabular-nums transition-colors ${
        active
          ? 'bg-app-card text-app-text font-semibold shadow-sm border border-app-border'
          : 'text-app-muted hover:text-app-text'
      }`}
    >
      {label} · {count}
    </button>
  );
}

type RowStatus = 'completed' | 'failed' | 'timed_out' | 'processing' | 'queued' | 'canceled';

const STATUS_PILL: Record<RowStatus, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'text-app-success bg-app-success-bg' },
  failed: { label: 'Failed', className: 'text-app-error bg-app-error-bg' },
  timed_out: { label: 'Timed out', className: 'text-app-warn bg-app-warn-bg' },
  processing: { label: 'Processing', className: 'text-primary-700 bg-primary-50' },
  queued: { label: 'Queued', className: 'text-app-muted bg-app-raised' },
  canceled: { label: 'Canceled', className: 'text-app-muted bg-app-raised' },
};

function exchangeName(id: unknown): string | undefined {
  if (typeof id !== 'string' || !id) return undefined;
  return EXCHANGE_SOURCES.find((e) => e.id === id)?.name ?? id;
}

/** "Coinbase · 20 transactions", or the file kind when nothing is known yet. */
export function sourceLabel(job: UnifiedJob): string {
  if (job.type === 'crypto') {
    // record_count is what the processor writes; transactionCount was never written.
    const count = (job.result?.['record_count'] ?? job.result?.['transactionCount']) as number | undefined;
    const name = exchangeName(job.result?.['exchange']);
    if (name && count) return `${name} · ${count} transactions`;
    return name ?? 'Crypto CSV';
  }
  if (job.detectedBank && job.transactionCount) return `${job.detectedBank} · ${job.transactionCount} transactions`;
  return job.detectedBank ?? 'Bank PDF';
}

function formatUploaded(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

function JobRow({
  job,
  isActive,
  onSelect,
  onChanged,
}: {
  job: UnifiedJob;
  isActive: boolean;
  onSelect: () => void;
  onChanged: () => void;
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close the ⋯ menu on an outside click
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  // A deleted row leaves the table at once instead of an empty, padded row
  if (isDeleted) return null;

  const timedOut = isTimedOut(job);
  const rowStatus: RowStatus = timedOut ? 'timed_out' : job.status;
  const pill = STATUS_PILL[rowStatus] ?? STATUS_PILL.queued;
  const note = timedOut ? 'No result after 30 minutes' : job.status === 'failed' ? job.error : null;
  // Retry exists for crypto jobs only (POST /api/jobs/[jobId]/retry).
  const canRetry = job.type === 'crypto' && (job.status === 'failed' || timedOut);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const endpoint = job.type === 'crypto' ? `/api/uploads/${job.uploadId}` : `/api/bank/jobs/${job.id}`;
      const response = await fetch(endpoint, { method: 'DELETE' });
      if (response.ok) {
        setIsDeleted(true);
        setShowDeleteModal(false);
        onChanged();
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/jobs/${job.id}/retry`, { method: 'POST' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Retry failed');
      }
      onSelect();
      onChanged();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Retry failed');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDownload = async () => {
    if (job.type === 'crypto') {
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

  const secondaryButton =
    'inline-flex items-center gap-1.5 min-h-9 px-3 rounded-lg border border-app-border-strong bg-app-card text-app-text font-medium hover:bg-app-raised transition-colors disabled:opacity-50';

  return (
    <tr className={`border-b border-app-border ${isActive ? 'bg-primary-50/60' : ''}`}>
      <td className="px-3 py-3 align-top">
        {job.type === 'crypto' ? (
          <button
            type="button"
            onClick={onSelect}
            className="font-medium text-app-text text-left hover:text-app-link break-all"
            aria-label={`Show ${job.filename || 'this file'} in Insights`}
          >
            {job.filename || 'Unnamed file'}
          </button>
        ) : (
          <span className="font-medium text-app-text break-all">{job.filename || 'Unnamed file'}</span>
        )}
        {note && <p className="text-[13px] text-app-muted mt-0.5">{note}</p>}
        {actionError && <p role="alert" className="text-[13px] text-app-error mt-0.5">{actionError}</p>}
      </td>
      <td className="px-3 py-3 align-top text-app-muted">{sourceLabel(job)}</td>
      <td className="px-3 py-3 align-top text-app-muted whitespace-nowrap tabular-nums">{formatUploaded(job.createdAt)}</td>
      <td className="px-3 py-3 align-top">
        <span className={`inline-block text-[13px] font-semibold rounded-full px-2.5 py-0.5 whitespace-nowrap ${pill.className}`}>
          {pill.label}
        </span>
      </td>
      <td className="px-3 py-2 align-top">
        <div className="flex items-center justify-end gap-1.5">
          {job.status === 'completed' && (
            <>
              {job.type === 'crypto' && (
                <Link href={`/dashboard/jobs/${job.id}`} className="min-h-9 inline-flex items-center px-3 font-semibold text-app-link hover:underline">
                  View
                </Link>
              )}
              <button type="button" onClick={handleDownload} disabled={isDownloading} className={secondaryButton}>
                {isDownloading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Download
              </button>
            </>
          )}
          {canRetry && (
            <button type="button" onClick={handleRetry} disabled={isRetrying} className={secondaryButton}>
              {isRetrying && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Retry
            </button>
          )}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={`More actions for ${job.filename || 'this file'}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-app-muted hover:bg-app-raised hover:text-app-text"
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full mt-1 z-20 min-w-36 rounded-lg border border-app-border bg-app-card shadow-lg py-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setShowDeleteModal(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-app-error hover:bg-app-error-bg"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Delete confirmation */}
        {mounted && showDeleteModal && createPortal(
          <div className="fixed inset-0 z-9999 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby={`delete-title-${job.id}`}>
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setShowDeleteModal(false)} />
            <div className="relative bg-app-card border border-app-border rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
              <h3 id={`delete-title-${job.id}`} className="text-lg font-semibold text-app-text">Delete this file?</h3>
              <p className="text-app-muted mt-2 mb-6">
                <span className="font-medium text-app-text break-all">{job.filename}</span> and its results will be removed. This can&apos;t be undone.
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="min-h-11 px-4 rounded-lg text-app-muted hover:text-app-text hover:bg-app-raised text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-2 min-h-11 px-4 rounded-lg bg-app-error text-white hover:bg-red-800 text-sm font-semibold disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Trash2 className="w-4 h-4" aria-hidden="true" />}
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </td>
    </tr>
  );
}
