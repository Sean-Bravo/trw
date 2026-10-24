'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { DiffCell as DiffCellType } from '@/types/diff';

interface DiffCellProps {
  cell: DiffCellType;
}

/**
 * Renders a single cell with diff styling.
 * - Unchanged: plain text
 * - Changed: original (red strikethrough) → fixed (green)
 */
export function DiffCell({ cell }: DiffCellProps) {
  const { original, fixed, hasChange } = cell;

  // No change - render plain text
  if (!hasChange) {
    return (
      <span className="text-app-text">
        {fixed ?? original ?? '—'}
      </span>
    );
  }

  // Changed cell - show before → after
  return (
    <div className="flex flex-col gap-1">
      {/* Original value (red, strikethrough) */}
      {original !== null && (
        <span className="inline-flex items-center text-app-error/70 line-through decoration-red-400/50 bg-app-error-bg px-1.5 py-0.5 rounded text-sm w-fit">
          {original || '(empty)'}
        </span>
      )}

      {/* Fixed value (green) */}
      <span className="inline-flex items-center gap-1 text-app-success font-medium bg-app-success-bg px-1.5 py-0.5 rounded text-sm w-fit">
        <ArrowRight className="w-3 h-3 text-app-success/70" />
        {fixed || '(empty)'}
      </span>
    </div>
  );
}
