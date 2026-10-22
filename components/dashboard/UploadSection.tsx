'use client';

import { useState } from 'react';
import { Upload, X, RefreshCw, WifiOff } from 'lucide-react';
import { ModeSelector, ProcessingMode } from './ModeSelector';
import { FileUploader } from './FileUploader';
import { BankPDFUploader } from './BankPDFUploader';
import { AnalysisAnimation } from './AnalysisAnimation';
import { useJobContext } from '@/contexts/JobContext';

export function UploadSection() {
  const [mode, setMode] = useState<ProcessingMode>('crypto');
  const { activeJob, clearActiveJob, cancelActiveJob, pollError, retryPolling } = useJobContext();
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

  // Determine processing status from active job
  const isProcessing = activeJob?.status === 'queued' || activeJob?.status === 'running';
  const isComplete = activeJob?.status === 'succeeded';
  const animationStatus = isProcessing ? 'processing' : isComplete ? 'complete' : 'idle';

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

          {/* Show animation when processing, otherwise show uploader */}
          {(isProcessing || isComplete) ? (
            <>
              <AnalysisAnimation
                status={animationStatus}
                statusText={activeJob?.status === 'queued' ? 'Initializing...' : 'AI Analysis Running...'}
                subtitle={activeJob?.status === 'queued' ? 'Preparing your file' : 'Detecting patterns & anomalies'}
              />
              {isProcessing && (
                <div className="flex flex-col items-center gap-3 mt-4">
                  {pollError && (
                    <div className="flex items-center gap-2 text-sm text-amber-400">
                      <WifiOff className="w-4 h-4" />
                      Lost connection to the status check
                    </div>
                  )}
                  <div className="flex gap-2">
                    {pollError && (
                      <button
                        onClick={retryPolling}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm font-medium transition-all"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Try again
                      </button>
                    )}
                    <button
                      onClick={handleCancel}
                      disabled={isCanceling}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 text-sm font-medium transition-all disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      {isCanceling ? 'Canceling...' : 'Cancel'}
                    </button>
                  </div>
                  {cancelError && <p className="text-sm text-red-400">{cancelError}</p>}
                </div>
              )}
              {/* New Upload button when complete */}
              {isComplete && (
                <div className="flex justify-center mt-4">
                  <button
                    onClick={clearActiveJob}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm font-medium transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Another File
                  </button>
                </div>
              )}
            </>
          ) : (
            <FileUploader />
          )}
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
