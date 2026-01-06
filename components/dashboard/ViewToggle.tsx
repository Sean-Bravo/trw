'use client';

import React from 'react';
import { Eye, GitCompare } from 'lucide-react';
import type { ViewMode } from '@/types/diff';

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  disabled?: boolean;
}

/**
 * Toggle between Clean File and Diff views
 */
export function ViewToggle({ mode, onChange, disabled = false }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg bg-slate-800/50 p-1 border border-white/5">
      <button
        type="button"
        onClick={() => onChange('clean')}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all
          ${mode === 'clean'
            ? 'bg-slate-700 text-white shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <Eye className="w-4 h-4" />
        Clean File
      </button>

      <button
        type="button"
        onClick={() => onChange('diff')}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all
          ${mode === 'diff'
            ? 'bg-slate-700 text-white shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <GitCompare className="w-4 h-4" />
        Diff vs Original
      </button>
    </div>
  );
}
