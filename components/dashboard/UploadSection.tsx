'use client';

import { useState } from 'react';
import { ModeSelector, ProcessingMode } from './ModeSelector';
import { FileUploader } from './FileUploader';
import { BankPDFUploader } from './BankPDFUploader';

export function UploadSection() {
  const [mode, setMode] = useState<ProcessingMode>('crypto');

  return (
    <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-6">
      <ModeSelector selectedMode={mode} onModeChange={setMode} />

      {mode === 'crypto' ? (
        <>
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white mb-1">Upload CSV File</h2>
            <p className="text-slate-400 text-sm">
              Exchange trade history → TurboTax, Koinly, CoinLedger format
            </p>
          </div>
          <FileUploader />
        </>
      ) : (
        <>
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white mb-1">Upload Bank Statement</h2>
            <p className="text-slate-400 text-sm">
              PDF statement → Categorized CSV with spending insights
            </p>
          </div>
          <BankPDFUploader />
        </>
      )}
    </div>
  );
}
