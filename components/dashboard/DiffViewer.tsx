'use client';

import { useState, useMemo } from 'react';
import { GitCompare, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useJobContext } from '@/contexts/JobContext';

interface DiffRow {
  original: string[];
  formatted: string[];
  changes: number[]; // indices of changed columns
}

// Generate diff rows by comparing original and processed data
function generateDiffRows(
  original: Record<string, unknown>[],
  processed: Record<string, unknown>[],
  columns: string[]
): { rows: DiffRow[]; totalChanges: number } {
  const rows: DiffRow[] = [];
  let totalChanges = 0;

  const maxRows = Math.min(original.length, processed.length, 10);

  for (let i = 0; i < maxRows; i++) {
    const origRow = original[i] || {};
    const procRow = processed[i] || {};
    const changes: number[] = [];

    const origValues = columns.map((col) => String(origRow[col] ?? ''));
    const procValues = columns.map((col) => String(procRow[col] ?? ''));

    columns.forEach((col, idx) => {
      if (origValues[idx] !== procValues[idx]) {
        changes.push(idx);
        totalChanges++;
      }
    });

    if (changes.length > 0) {
      rows.push({ original: origValues, formatted: procValues, changes });
    }
  }

  return { rows, totalChanges };
}

export function DiffViewer() {
  const { activeJob, isPolling } = useJobContext();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAllRows, setShowAllRows] = useState(false);

  // Generate diff data from job result
  const diffData = useMemo(() => {
    if (!activeJob?.result) return null;

    const result = activeJob.result as Record<string, unknown>;
    const original = result['original'] as Record<string, unknown>[] | undefined;
    const processed = result['processed'] as Record<string, unknown>[] | undefined;
    const columns = result['columns'] as string[] | undefined;

    if (!original || !processed || !columns || original.length === 0) {
      return null;
    }

    const { rows, totalChanges } = generateDiffRows(original, processed, columns);
    return { headers: columns, rows, totalChanges };
  }, [activeJob?.result]);

  // Show empty state if no job or job not succeeded
  if (!activeJob || activeJob.status !== 'succeeded' || !diffData) {
    // Show processing state
    if (activeJob && (activeJob.status === 'queued' || activeJob.status === 'running')) {
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
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            <p className="text-sm">Processing your file...</p>
          </div>
        </div>
      );
    }

    // Empty state - no job
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

  const { headers, rows, totalChanges } = diffData;
  const displayRows = showAllRows ? rows : rows.slice(0, 5);
  const hasMoreRows = rows.length > 5;

  return (
    <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10">
            <GitCompare className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Changes Preview</h2>
            <p className="text-slate-400 text-sm">
              <span className="text-emerald-400 font-medium">{totalChanges} fixes</span> applied to your data
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
          <div className="grid grid-cols-2 gap-4">
            {/* Original */}
            <div>
              <div className="text-xs font-medium text-red-400 uppercase tracking-wide mb-2 px-2">
                Original
              </div>
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-red-500/20">
                        {headers.map((header, i) => (
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
                      {displayRows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-red-500/10 last:border-0">
                          {row.original.map((cell, cellIdx) => (
                            <td
                              key={cellIdx}
                              className={`px-3 py-2 whitespace-nowrap ${
                                row.changes.includes(cellIdx)
                                  ? 'text-red-400 bg-red-500/10 line-through'
                                  : 'text-slate-300'
                              }`}
                            >
                              {cell || <span className="text-slate-600 italic">empty</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Formatted */}
            <div>
              <div className="text-xs font-medium text-emerald-400 uppercase tracking-wide mb-2 px-2">
                Formatted
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-emerald-500/20">
                        {headers.map((header, i) => (
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
                      {displayRows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-emerald-500/10 last:border-0">
                          {row.formatted.map((cell, cellIdx) => (
                            <td
                              key={cellIdx}
                              className={`px-3 py-2 whitespace-nowrap ${
                                row.changes.includes(cellIdx)
                                  ? 'text-emerald-400 bg-emerald-500/10 font-medium'
                                  : 'text-slate-300'
                              }`}
                            >
                              {cell || <span className="text-slate-600 italic">empty</span>}
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
                {showAllRows ? 'Show less' : `Show ${rows.length - 5} more rows`}
              </button>
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/40" />
              <span>Changed from</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40" />
              <span>Changed to</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
