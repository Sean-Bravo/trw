'use client';

import { useState } from 'react';
import { GitCompare, ChevronDown, ChevronUp } from 'lucide-react';

interface DiffRow {
  original: string[];
  formatted: string[];
  changes: number[]; // indices of changed columns
}

interface DiffViewerProps {
  jobId?: string;
  originalHeaders?: string[];
  formattedHeaders?: string[];
  rows?: DiffRow[];
  totalChanges?: number;
}

// Sample data for demo - will be replaced with real data
const sampleData: Required<Omit<DiffViewerProps, 'jobId'>> = {
  originalHeaders: ['Date', 'Type', 'Amount', 'Currency', 'Fee'],
  formattedHeaders: ['Date', 'Type', 'Amount', 'Currency', 'Fee'],
  rows: [
    {
      original: ['2024/01/15 14:30', 'BUY', '0.5', 'BTC', '0.001'],
      formatted: ['2024-01-15T14:30:00Z', 'BUY', '0.5', 'BTC', '0.001'],
      changes: [0],
    },
    {
      original: ['01-20-2024', 'SELL', '1.2', 'ETH', ''],
      formatted: ['2024-01-20T00:00:00Z', 'SELL', '1.2', 'ETH', '0'],
      changes: [0, 4],
    },
    {
      original: ['Jan 25, 2024', 'TRANSFER', '100', 'USDT', '0.5'],
      formatted: ['2024-01-25T00:00:00Z', 'TRANSFER', '100', 'USDT', '0.5'],
      changes: [0],
    },
  ],
  totalChanges: 4,
};

export function DiffViewer({
  jobId,
  originalHeaders,
  formattedHeaders,
  rows,
  totalChanges,
}: DiffViewerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAllRows, setShowAllRows] = useState(false);

  // Use sample data if no real data provided
  const headers = originalHeaders || sampleData.originalHeaders;
  const formattedHeadersData = formattedHeaders || sampleData.formattedHeaders;
  const rowData = rows || sampleData.rows;
  const changes = totalChanges ?? sampleData.totalChanges;

  const displayRows = showAllRows ? rowData : rowData.slice(0, 5);
  const hasMoreRows = rowData.length > 5;

  if (!jobId && !rows) {
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
              <span className="text-emerald-400 font-medium">{changes} fixes</span> applied to your data
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
                        {formattedHeadersData.map((header, i) => (
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
                {showAllRows ? 'Show less' : `Show ${rowData.length - 5} more rows`}
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
