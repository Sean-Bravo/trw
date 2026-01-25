'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  Trash2,
  Info,
} from 'lucide-react';
import { SmartDiffTable } from '@/components/dashboard/SmartDiffTable';
import { ViewToggle } from '@/components/dashboard/ViewToggle';
import { PremiumFeatureGuard } from '@/components/premium/PremiumFeatureGuard';
import { generateDiffData } from '@/lib/diff-utils';
import type { ViewMode, DiffData } from '@/types/diff';

interface JobData {
  id: string;
  uploadId: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';
  result: Record<string, unknown> | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  filename: string;
  s3Key: string;
}

interface JobDetailClientProps {
  job: JobData;
  userTier: 'free' | 'pro' | 'premium';
  userName: string;
}

const STATUS_CONFIG = {
  queued: {
    icon: Clock,
    label: 'Queued',
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    animate: false,
  },
  running: {
    icon: Loader2,
    label: 'Processing',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    animate: true,
  },
  succeeded: {
    icon: CheckCircle,
    label: 'Completed',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    animate: false,
  },
  failed: {
    icon: XCircle,
    label: 'Failed',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    animate: false,
  },
  canceled: {
    icon: XCircle,
    label: 'Canceled',
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    animate: false,
  },
};

export function JobDetailClient({ job, userTier, userName }: JobDetailClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('clean');
  const [deleteAfterDownload, setDeleteAfterDownload] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const isPaidUser = userTier === 'pro' || userTier === 'premium';
  const statusConfig = STATUS_CONFIG[job.status];
  const StatusIcon = statusConfig.icon;

  // Parse diff data from job result
  const diffData: DiffData | null = useMemo(() => {
    if (!job.result) return null;

    try {
      // Expected structure from Lambda processor:
      // result.original = array of original rows
      // result.processed = array of processed rows
      // result.columns = array of column names
      const { original, processed, columns } = job.result as {
        original?: Record<string, unknown>[];
        processed?: Record<string, unknown>[];
        columns?: string[];
      };

      if (!original || !processed || !columns) {
        // Fallback: if result doesn't have diff structure, create mock data
        // This handles jobs that were processed before diff feature
        return null;
      }

      return generateDiffData(original, processed, columns);
    } catch {
      console.error('Failed to parse diff data');
      return null;
    }
  }, [job.result]);

  const handleDownload = async (type: 'formatted' | 'flagged') => {
    try {
      const response = await fetch(`/api/jobs/${job.id}/download?type=${type}`);
      if (!response.ok) throw new Error('Download failed');

      const { url } = await response.json();
      window.open(url, '_blank');

      // If delete after download is checked, delete the upload
      if (deleteAfterDownload && !isDeleted) {
        setIsDeleting(true);
        try {
          const deleteResponse = await fetch(`/api/uploads/${job.uploadId}`, {
            method: 'DELETE',
          });

          if (deleteResponse.ok) {
            setIsDeleted(true);
          } else {
            console.error('Delete failed after download');
          }
        } catch (deleteError) {
          console.error('Delete error:', deleteError);
        } finally {
          setIsDeleting(false);
        }
      }
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  return (
    <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back link + Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800/50 border border-white/10">
              <FileText className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{job.filename}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                  <StatusIcon className={`w-3.5 h-3.5 ${statusConfig.animate ? 'animate-spin' : ''}`} />
                  {statusConfig.label}
                </span>
                <span className="text-slate-400 text-sm">
                  {new Date(job.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Download buttons */}
          {job.status === 'succeeded' && (
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownload('formatted')}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Download CSV
                </button>
                <button
                  onClick={() => handleDownload('flagged')}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 transition-colors text-sm font-medium border border-white/10 disabled:opacity-50"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Flagged Issues
                </button>
              </div>

              {/* Delete after download toggle */}
              {!isDeleted ? (
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={deleteAfterDownload}
                    onChange={(e) => setDeleteAfterDownload(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-red-500 focus:ring-red-500/20 focus:ring-offset-0"
                  />
                  <span className="text-sm text-slate-400 group-hover:text-slate-300 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete my file after download
                  </span>
                  <div className="relative group/tooltip">
                    <Info className="w-3.5 h-3.5 text-slate-500 hover:text-slate-400" />
                    <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-10 shadow-xl">
                      Your original file will be permanently removed. Anonymized processing metadata (exchange detected, row count) is retained to improve our service.
                    </div>
                  </div>
                </label>
              ) : (
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  File deleted successfully
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error message */}
      {job.status === 'failed' && job.error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-400">Processing Failed</h3>
              <p className="text-red-300/70 text-sm mt-1">{job.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Processing state */}
      {(job.status === 'queued' || job.status === 'running') && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            {job.status === 'queued' ? 'Waiting in queue...' : 'Processing your file...'}
          </h3>
          <p className="text-slate-400 text-sm">
            This page will update automatically when processing completes.
          </p>
        </div>
      )}

      {/* Data table */}
      {job.status === 'succeeded' && (
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
          {/* View toggle header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <h2 className="text-lg font-semibold text-white">Data Preview</h2>

            <PremiumFeatureGuard
              requiredTier="pro"
              currentTier={userTier}
              feature="Diff View"
            >
              <ViewToggle
                mode={viewMode}
                onChange={setViewMode}
                disabled={!diffData}
              />
            </PremiumFeatureGuard>
          </div>

          {/* Table content */}
          {diffData ? (
            <SmartDiffTable diffData={diffData} viewMode={isPaidUser ? viewMode : 'clean'} />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-12 h-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-400 mb-2">
                Preview not available
              </h3>
              <p className="text-slate-400 text-sm max-w-md">
                This job was processed before the diff view feature was added.
                Download the CSV to see results.
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
