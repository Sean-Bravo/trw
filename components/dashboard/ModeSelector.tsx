'use client';

import { useState } from 'react';
import { ArrowRight, FileSpreadsheet, Building2 } from 'lucide-react';

export type ProcessingMode = 'crypto' | 'bank';

interface ModeSelectorProps {
  selectedMode: ProcessingMode;
  onModeChange: (mode: ProcessingMode) => void;
}

export function ModeSelector({ selectedMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="mb-6">
      <p className="text-slate-400 text-sm mb-3">What are you converting?</p>
      <div className="flex gap-3">
        {/* Crypto Mode */}
        <button
          onClick={() => onModeChange('crypto')}
          className={`
            flex-1 flex items-center gap-3 p-4 rounded-xl border transition-all duration-200
            ${selectedMode === 'crypto'
              ? 'bg-blue-500/10 border-blue-500/50 text-white'
              : 'bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.04] hover:border-white/20'
            }
          `}
        >
          <div className={`
            p-2 rounded-lg
            ${selectedMode === 'crypto' ? 'bg-blue-500/20' : 'bg-white/5'}
          `}>
            <FileSpreadsheet className={`w-5 h-5 ${selectedMode === 'crypto' ? 'text-blue-400' : 'text-slate-500'}`} />
          </div>
          <div className="flex-1 text-left">
            <div className="font-medium text-sm">Crypto Trades</div>
            <div className="text-xs text-slate-500">CSV → Tax Software</div>
          </div>
          <ArrowRight className={`w-4 h-4 ${selectedMode === 'crypto' ? 'text-blue-400' : 'text-slate-600'}`} />
        </button>

        {/* Bank Mode */}
        <button
          onClick={() => onModeChange('bank')}
          className={`
            flex-1 flex items-center gap-3 p-4 rounded-xl border transition-all duration-200
            ${selectedMode === 'bank'
              ? 'bg-cyan-500/10 border-cyan-500/50 text-white'
              : 'bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.04] hover:border-white/20'
            }
          `}
        >
          <div className={`
            p-2 rounded-lg
            ${selectedMode === 'bank' ? 'bg-cyan-500/20' : 'bg-white/5'}
          `}>
            <Building2 className={`w-5 h-5 ${selectedMode === 'bank' ? 'text-cyan-400' : 'text-slate-500'}`} />
          </div>
          <div className="flex-1 text-left">
            <div className="font-medium text-sm">Bank Statement</div>
            <div className="text-xs text-slate-500">PDF → CSV</div>
          </div>
          <ArrowRight className={`w-4 h-4 ${selectedMode === 'bank' ? 'text-cyan-400' : 'text-slate-600'}`} />
        </button>
      </div>
    </div>
  );
}
