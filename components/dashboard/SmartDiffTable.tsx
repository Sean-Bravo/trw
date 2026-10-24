'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DiffCell } from './DiffCell';
import type { DiffData, ViewMode } from '@/types/diff';
import { paginateDiffRows } from '@/lib/diff-utils';

interface SmartDiffTableProps {
  diffData: DiffData;
  viewMode: ViewMode;
  highlightedRow?: number | null;
  onRowClick?: (rowIndex: number) => void;
  pageSize?: number;
}

/**
 * Smart table with cell-level diff highlighting
 * - Shows original vs fixed values for each cell
 * - Highlights rows with changes
 * - Supports pagination for large datasets
 */
export function SmartDiffTable({
  diffData,
  viewMode,
  highlightedRow = null,
  onRowClick,
  pageSize = 100,
}: SmartDiffTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const { rows, totalPages, hasNext, hasPrev } = useMemo(
    () => paginateDiffRows(diffData.rows, currentPage, pageSize),
    [diffData.rows, currentPage, pageSize]
  );

  const { columns, summary } = diffData;

  return (
    <div className="flex flex-col">
      {/* Summary stats */}
      {viewMode === 'diff' && (
        <div className="flex items-center gap-4 px-4 py-3 bg-app-raised border-b border-app-border text-sm">
          <span className="text-app-muted">
            <span className="font-medium text-app-text">{summary.totalRows}</span> rows
          </span>
          <span className="text-app-muted">
            <span className="font-medium text-app-warn">{summary.changedRows}</span> changed
          </span>
          <span className="text-app-muted">
            <span className="font-medium text-app-success">{summary.totalCellChanges}</span> cell fixes
          </span>
        </div>
      )}

      {/* Table container with horizontal scroll */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          {/* Header */}
          <thead className="bg-app-raised sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase tracking-wider w-16">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase tracking-wider"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-app-border">
            {rows.map((row) => {
              const isHighlighted = highlightedRow === row.rowIndex;
              const hasChanges = row.hasChanges;

              return (
                <tr
                  key={row.rowIndex}
                  onClick={() => onRowClick?.(row.rowIndex)}
                  className={`
                    transition-colors
                    ${onRowClick ? 'cursor-pointer' : ''}
                    ${isHighlighted ? 'bg-primary-50 ring-1 ring-inset ring-cyan-500/30' : ''}
                    ${hasChanges && viewMode === 'diff' ? 'bg-app-warn-bg border-l-2 border-l-amber-500' : ''}
                    ${!isHighlighted && !hasChanges ? 'hover:bg-app-raised' : ''}
                  `}
                >
                  {/* Row number */}
                  <td className="px-4 py-3 text-xs font-mono text-app-muted">
                    {row.rowIndex + 1}
                  </td>

                  {/* Data cells */}
                  {columns.map((col) => {
                    const cell = row.cells[col];
                    if (!cell) {
                      return (
                        <td key={col} className="px-4 py-3 text-app-muted">—</td>
                      );
                    }

                    return (
                      <td key={col} className="px-4 py-3">
                        {viewMode === 'diff' ? (
                          <DiffCell cell={cell} />
                        ) : (
                          <span className="text-app-text">
                            {cell.fixed ?? cell.original ?? '—'}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-app-raised border-t border-app-border">
          <span className="text-sm text-app-muted">
            Page {currentPage} of {totalPages}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={!hasPrev}
              className={`
                p-2 rounded-lg transition-colors
                ${hasPrev
                  ? 'text-app-text hover:bg-app-raised'
                  : 'text-app-muted cursor-not-allowed'
                }
              `}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={!hasNext}
              className={`
                p-2 rounded-lg transition-colors
                ${hasNext
                  ? 'text-app-text hover:bg-app-raised'
                  : 'text-app-muted cursor-not-allowed'
                }
              `}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
