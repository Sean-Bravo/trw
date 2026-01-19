'use client';

import { useState, useMemo } from 'react';
import { GitCompare, ChevronDown, ChevronUp, Loader2, ArrowRight } from 'lucide-react';
import { useJobContext } from '@/contexts/JobContext';

// Koinly output columns (what we transform TO)
const KOINLY_COLUMNS = [
  'Date',
  'Sent Amount',
  'Sent Currency',
  'Received Amount',
  'Received Currency',
  'Fee Amount',
  'Fee Currency',
  'Description',
];

export function DiffViewer() {
  const { activeJob } = useJobContext();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAllRows, setShowAllRows] = useState(false);

  // Extract original and processed data from job result
  const diffData = useMemo(() => {
    if (!activeJob?.result) return null;

    const result = activeJob.result as Record<string, unknown>;
    const original = result['original'] as Record<string, unknown>[] | undefined;
    const processed = result['processed'] as Record<string, unknown>[] | undefined;
    const originalColumns = result['columns'] as string[] | undefined;

    if (!original || !processed || original.length === 0 || processed.length === 0) {
      return null;
    }

    return {
      original,
      processed,
      originalColumns: originalColumns || Object.keys(original[0] || {}),
      processedColumns: KOINLY_COLUMNS,
      recordCount: processed.length,
    };
  }, [activeJob?.result]);

  // Get detailed status message
  const getStatusMessage = () => {
    if (!activeJob) return null;
    switch (activeJob.status) {
      case 'queued':
        return { icon: 'spin', text: 'Virus scan in progress • Validating file format...' };
      case 'running':
        return { icon: 'spin', text: 'Detecting exchange format • Analyzing transactions...' };
      case 'failed':
        return { icon: 'error', text: activeJob.error || 'Processing failed' };
      default:
        return null;
    }
  };

  // Show empty state if no job or job not succeeded
  if (!activeJob || activeJob.status !== 'succeeded' || !diffData) {
    const statusMsg = getStatusMessage();

    // Show processing or error state
    if (activeJob && statusMsg) {
      const isError = activeJob.status === 'failed';
      return (
        <div className={`bg-white/[0.03] backdrop-blur-sm border rounded-2xl p-6 ${
          isError ? 'border-red-500/30' : 'border-white/10'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${isError ? 'bg-red-500/10' : 'bg-indigo-500/10'}`}>
              <GitCompare className={`w-5 h-5 ${isError ? 'text-red-400' : 'text-indigo-400'}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Changes Preview</h2>
              <p className="text-slate-400 text-sm">See what was fixed in your CSV</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            {statusMsg.icon === 'spin' ? (
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <span className="text-red-400 text-xl">!</span>
              </div>
            )}
            <p className={`text-sm text-center max-w-md ${isError ? 'text-red-400' : 'text-slate-500'}`}>
              {statusMsg.text}
            </p>
            {!isError && (
              <p className="text-xs text-slate-600">Checking status every 2.5 seconds...</p>
            )}
          </div>
        </div>
      );
    }

    // Empty state - no job selected
    return (
      <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-indigo-500/10">
            <GitCompare className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Changes Preview</h2>
            <p className="text-slate-400 text-sm">See what was fixed in your CSV</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12 text-slate-500">
          <p className="text-sm">Upload a file to see the diff preview</p>
        </div>
      </div>
    );
  }

  const { original, processed, originalColumns, processedColumns, recordCount } = diffData;
  const displayCount = showAllRows ? Math.min(original.length, processed.length, 10) : 3;
  const hasMoreRows = Math.min(original.length, processed.length) > 3;

  return (
    <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10">
            <GitCompare className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Transformation Preview</h2>
            <p className="text-slate-400 text-sm">
              <span className="text-emerald-400 font-medium">{recordCount} transactions</span> converted to Koinly format
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>
      </div>

      {isExpanded && (
        <>
          {/* Side by Side Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Original */}
            <div>
              <div className="flex items-center gap-2 mb-2 px-2">
                <div className="text-xs font-medium text-amber-400 uppercase tracking-wide">
                  Original (Exchange Format)
                </div>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-900/90">
                      <tr className="border-b border-amber-500/20">
                        {originalColumns.slice(0, 6).map((header, i) => (
                          <th
                            key={i}
                            className="px-3 py-2 text-left text-slate-400 font-medium whitespace-nowrap"
                          >
                            {header}
                          </th>
                        ))}
                        {originalColumns.length > 6 && (
                          <th className="px-3 py-2 text-left text-slate-500 font-medium">
                            +{originalColumns.length - 6}
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {original.slice(0, displayCount).map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-amber-500/10 last:border-0">
                          {originalColumns.slice(0, 6).map((col, cellIdx) => (
                            <td
                              key={cellIdx}
                              className="px-3 py-2 whitespace-nowrap text-slate-300 max-w-32 truncate"
                              title={String(row[col] ?? '')}
                            >
                              {String(row[col] ?? '') || <span className="text-slate-600 italic">—</span>}
                            </td>
                          ))}
                          {originalColumns.length > 6 && (
                            <td className="px-3 py-2 text-slate-500">...</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Arrow indicator for desktop */}
            <div className="hidden lg:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="bg-indigo-500/20 rounded-full p-2">
                <ArrowRight className="w-4 h-4 text-indigo-400" />
              </div>
            </div>

            {/* Formatted (Koinly) */}
            <div>
              <div className="flex items-center gap-2 mb-2 px-2">
                <div className="text-xs font-medium text-emerald-400 uppercase tracking-wide">
                  Converted (Koinly Format)
                </div>
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-900/90">
                      <tr className="border-b border-emerald-500/20">
                        {processedColumns.map((header, i) => (
                          <th
                            key={i}
                            className="px-3 py-2 text-left text-slate-400 font-medium whitespace-nowrap"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {processed.slice(0, displayCount).map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-emerald-500/10 last:border-0">
                          {processedColumns.map((col, cellIdx) => (
                            <td
                              key={cellIdx}
                              className="px-3 py-2 whitespace-nowrap text-emerald-300 max-w-32 truncate"
                              title={String(row[col] ?? '')}
                            >
                              {String(row[col] ?? '') || <span className="text-slate-600 italic">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Show More */}
          {hasMoreRows && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowAllRows(!showAllRows)}
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {showAllRows ? 'Show less' : `Show more rows`}
              </button>
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40" />
              <span>Original exchange data</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowRight className="w-3 h-3 text-slate-500" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40" />
              <span>Tax-ready Koinly format</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
