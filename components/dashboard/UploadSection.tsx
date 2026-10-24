'use client';

import { useState } from 'react';
import { Loader2, X, RefreshCw, WifiOff } from 'lucide-react';
import { ModeSelector, ProcessingMode } from './ModeSelector';
import { FileUploader } from './FileUploader';
import { BankPDFUploader } from './BankPDFUploader';
import { useJobContext } from '@/contexts/JobContext';

export function UploadSection() {
  const [mode, setMode] = useState<ProcessingMode>('crypto');
  const { activeJob, cancelActiveJob, pollError, retryPolling } = useJobContext();
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const handleCancel = async () => {
    setIsCanceling(true);
    setCancelError(null);
    try {
      await cancelActiveJob();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Failed to cancel job');
    } finally {
      setIsCanceling(false);
    }
  };

  // A finished job keeps the uploader on screen (its results are in the
  // Insights card); only a running job replaces it with a status line.
  const isProcessing = activeJob?.status === 'queued' || activeJob?.status === 'running';

  return (
    <section aria-labelledby="new-conversion-title" className="bg-app-card border border-app-border rounded-2xl p-6">
      <h2 id="new-conversion-title" className="text-lg font-semibold text-app-text mb-4">New conversion</h2>
      <ModeSelector selectedMode={mode} onModeChange={setMode} />

      {mode === 'crypto' ? (
        isProcessing ? (
          <div className="flex flex-col items-center text-center gap-3 py-10 px-6 rounded-xl border border-app-border bg-app-raised">
            <Loader2 className="w-7 h-7 text-primary-500 animate-spin" aria-hidden="true" />
            <p className="font-semibold text-app-text">
              {activeJob?.status === 'queued' ? 'Upload received, waiting to start…' : 'Converting your file…'}
            </p>
            <p className="text-sm text-app-muted">{activeJob?.filename}</p>
            {pollError && (
              <p className="flex items-center gap-2 text-sm text-app-warn">
                <WifiOff className="w-4 h-4" aria-hidden="true" />
                Lost connection to the status check
              </p>
            )}
            <div className="flex gap-2 mt-1">
              {pollError && (
                <button
                  type="button"
                  onClick={retryPolling}
                  className="inline-flex items-center gap-2 min-h-11 px-4 rounded-lg border border-app-border-strong bg-app-card text-app-text text-sm font-medium hover:bg-app-raised transition-colors"
                >
                  <RefreshCw className="w-4 h-4" aria-hidden="true" />
                  Try again
                </button>
              )}
              <button
                type="button"
                onClick={handleCancel}
                disabled={isCanceling}
                className="inline-flex items-center gap-2 min-h-11 px-4 rounded-lg border border-app-border-strong bg-app-card text-app-error text-sm font-medium hover:bg-app-error-bg transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" aria-hidden="true" />
                {isCanceling ? 'Canceling...' : 'Cancel'}
              </button>
            </div>
            {cancelError && <p className="text-sm text-app-error">{cancelError}</p>}
          </div>
        ) : (
          <FileUploader />
        )
      ) : (
        <BankPDFUploader />
      )}
    </section>
  );
}
