'use client';

import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, CheckCircle2, Download, RefreshCw, Upload } from 'lucide-react';
import { uploadBankStatement, validateBankFile } from '@/lib/bank-upload-client';
import type { BankOutputFormat } from '@/lib/bank-upload-client';
import { trackConversion, trackEvent } from '@/lib/analytics';
import { BETA_BANKS, VERIFIED_BANKS } from '@/lib/bank-registry';

/**
 * The bank-statement upload box: dropzone → progress → download, with the
 * output-format switch. Shared by the Google Ads page (/upload) and the
 * bank landing page (/bank-statement-to-csv), so both funnels run the exact
 * same upload flow and fire the same conversion events.
 *
 * It owns no page copy beyond its own states. Anything a page wants to show
 * after a successful parse (the /upload API panel, for instance) comes in
 * through `renderAfterSuccess`.
 */

export const FORMAT_OPTIONS: { id: BankOutputFormat; label: string; short: string }[] = [
  { id: 'csv', label: 'CSV', short: 'CSV' },
  { id: 'qbo', label: 'QuickBooks (QBO)', short: 'QBO' },
  { id: 'xero', label: 'Xero', short: 'Xero' },
  { id: 'excel', label: 'Excel', short: 'Excel' },
];

export type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export interface BankUploadSuccess {
  detectedBank: string;
  transactionCount: number;
  outputFormat: BankOutputFormat;
  filename: string;
}

export interface BankUploadBoxHandle {
  /** Open the OS file picker — for a page-level CTA outside the box. */
  openFilePicker: () => void;
}

interface BankUploadBoxProps {
  /** Rendered under the box once a file has parsed with a detected bank and count. */
  renderAfterSuccess?: (info: BankUploadSuccess) => React.ReactNode;
  /** The "what's a bank statement PDF?" hint under the box. Default on. */
  showExample?: boolean;
}

export const BankUploadBox = forwardRef<BankUploadBoxHandle, BankUploadBoxProps>(function BankUploadBox(
  { renderAfterSuccess, showExample = true },
  ref,
) {
  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [detectedBank, setDetectedBank] = useState<string | null>(null);
  const [transactionCount, setTransactionCount] = useState<number | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<BankOutputFormat>('csv');
  const [isChangingFormat, setIsChangingFormat] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    openFilePicker: () => fileInputRef.current?.click(),
  }));

  const handleFile = useCallback(async (file: File) => {
    const validation = validateBankFile(file);
    if (!validation.valid) {
      setState('error');
      setErrorMsg(validation.error || 'Invalid file');
      return;
    }

    setState('uploading');
    setProgress(0);
    setErrorMsg('');
    setUploadedFilename(file.name);
    trackConversion('bank_upload_started');
    trackEvent('bank_upload_started', { funnel: 'bank', output_format: selectedFormat });

    try {
      const result = await uploadBankStatement(file, selectedFormat, (stage, percent) => {
        setProgress(percent);
        switch (stage) {
          case 'requesting':
            setProgressLabel('Detecting bank format...');
            break;
          case 'uploading':
            setProgressLabel('Uploading your statement...');
            break;
          case 'processing':
            setProgressLabel(percent >= 100 ? 'Complete!' : 'Extracting transactions...');
            break;
        }
      });

      // Capture result for download
      if (result.jobId) setJobId(result.jobId);
      if (result.downloadUrl) {
        setDownloadUrl(result.downloadUrl);
      }
      if (result.detectedBank) setDetectedBank(result.detectedBank);
      if (result.transactionCount) setTransactionCount(result.transactionCount);

      setState('success');
      trackConversion('bank_upload_completed');
      trackEvent('bank_upload_completed', {
        funnel: 'bank',
        detected_bank: result.detectedBank ?? 'unknown',
        transaction_count: result.transactionCount ?? 0,
        output_format: selectedFormat,
        warnings: result.warnings?.length ?? 0,
      });
    } catch (err: unknown) {
      setState('error');
      const msg = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Upload failed. Please try again.';
      setErrorMsg(msg);
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : 'unknown';
      trackEvent('bank_upload_failed', { funnel: 'bank', error_code: code });
    }
  }, [selectedFormat]);

  const handleFormatChange = useCallback(async (format: BankOutputFormat) => {
    setSelectedFormat(format);
    if (!jobId) return;

    setIsChangingFormat(true);
    try {
      const res = await fetch(`/api/bank/job/${jobId}/download?format=${format}`);
      if (res.ok) {
        const data = await res.json();
        if (data.downloadUrl) {
          setDownloadUrl(data.downloadUrl);
        }
      }
    } catch {
      // Keep existing download URL if format switch fails
    } finally {
      setIsChangingFormat(false);
    }
  }, [jobId]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const reset = () => {
    setState('idle');
    setProgress(0);
    setProgressLabel('');
    setErrorMsg('');
    setDownloadUrl(null);
    setJobId(null);
    setDetectedBank(null);
    setTransactionCount(null);
    setUploadedFilename(null);
    setSelectedFormat('csv');
    setIsChangingFormat(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <div
        className={`relative rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 cursor-pointer ${
          dragOver
            ? 'border-accent-500 bg-accent-500/5'
            : state === 'error'
            ? 'border-red-500/40 bg-red-500/5'
            : 'border-slate-700 bg-slate-900/60 hover:border-primary-500 hover:bg-primary-500/5'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => state === 'idle' && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={onFileChange}
        />

        {/* Idle */}
        {state === 'idle' && (
          <>
            <div className="mx-auto mb-5 w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold mb-1.5">Drop your bank statement PDF here</h3>
            <p className="text-sm text-slate-500">
              or <span className="text-primary-400 underline underline-offset-2 decoration-primary-400/30">browse files</span> — .pdf up to 50MB
            </p>
            <p className="mt-4 text-xs text-slate-600 font-mono">
              {VERIFIED_BANKS.map((b) => b.name).join(' · ')} · {BETA_BANKS.length} more in beta
            </p>
          </>
        )}

        {/* Uploading */}
        {state === 'uploading' && (
          <>
            <div className="mx-auto mb-5 w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-400 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-3">Processing your file...</h3>
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mb-3">
              <div
                className="h-full rounded-full bg-linear-to-r from-primary-500 to-accent-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 font-mono">{progressLabel}</p>
          </>
        )}

        {/* Success */}
        {state === 'success' && (
          <>
            <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-accent-500/10 border-2 border-accent-500 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-accent-500" />
            </div>
            <h3 className="text-lg font-semibold text-accent-400 mb-2">
              {transactionCount
                ? `${transactionCount} transactions extracted!`
                : 'Statement converted!'}
            </h3>
            {detectedBank && (
              <p className="text-xs text-slate-500 font-mono mb-3">
                Detected: {detectedBank}
              </p>
            )}
            <p className="text-sm text-slate-400 mb-4">
              Your file is ready. Pick a format and download below.
            </p>

            {/* Format selector */}
            <div className="flex justify-center gap-1.5 mb-4" onClick={(e) => e.stopPropagation()}>
              {FORMAT_OPTIONS.map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => handleFormatChange(fmt.id)}
                  disabled={isChangingFormat}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedFormat === fmt.id
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700'
                  }`}
                >
                  {fmt.short}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {downloadUrl ? (
                <a
                  href={downloadUrl}
                  download
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold transition-colors"
                >
                  {isChangingFormat ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Download {FORMAT_OPTIONS.find(f => f.id === selectedFormat)?.short ?? 'CSV'}
                </a>
              ) : (
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-colors"
                >
                  Create Free Account
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); reset(); }}
                className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Upload another file
              </button>
            </div>
          </>
        )}

        {/* Error */}
        {state === 'error' && (
          <>
            <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-red-500/10 border-2 border-red-500/40 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-red-400 mb-2">Upload failed</h3>
            <p className="text-sm text-slate-400 mb-4">{errorMsg}</p>
            <button
              onClick={(e) => { e.stopPropagation(); reset(); }}
              className="text-sm text-primary-400 hover:text-primary-300 underline underline-offset-2 transition-colors"
            >
              Try again
            </button>
          </>
        )}
      </div>

      {renderAfterSuccess && state === 'success' && detectedBank && transactionCount && uploadedFilename && (
        renderAfterSuccess({
          detectedBank,
          transactionCount,
          outputFormat: selectedFormat,
          filename: uploadedFilename,
        })
      )}

      {/* Example hint */}
      {showExample && (
        <div className="mt-4 rounded-lg border border-slate-800/60 bg-slate-900/40 px-4 py-3">
          <p className="text-xs text-slate-500 mb-2">
            What&apos;s a bank statement PDF? It&apos;s the monthly statement your bank emails you or you download from online banking. It looks like this:
          </p>
          <div className="font-mono text-[10px] text-slate-600 leading-relaxed bg-slate-950/50 rounded px-3 py-2 border border-slate-800/40">
            <div className="text-slate-500 mb-1">Chase Checking ····4829 &nbsp;|&nbsp; Jan 1 – Jan 31, 2025</div>
            <div>01/03 &nbsp; PAYROLL DEPOSIT &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; +3,200.00</div>
            <div>01/05 &nbsp; WHOLE FOODS #10092 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; -87.43</div>
            <div>01/07 &nbsp; TRANSFER TO SAVINGS &nbsp;&nbsp;&nbsp;&nbsp; -500.00</div>
            <div className="text-slate-700">...</div>
          </div>
        </div>
      )}
    </>
  );
});
