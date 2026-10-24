'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  FileUp,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
  Building2
} from 'lucide-react';
import { useJobContext } from '@/contexts/JobContext';
import { useIdleHold } from '@/lib/idle-hold';

interface ProcessResult {
  success: boolean;
  jobId: string;
  transactionCount?: number;
  detectedBank?: string;
  warnings?: string[];
  error?: string;
}

type OutputFormat = 'qbo' | 'xero' | 'excel';

const FORMAT_OPTIONS = [
  { id: 'qbo' as const, name: 'QuickBooks Online', description: 'For QBO bank import' },
  { id: 'xero' as const, name: 'Xero', description: 'For Xero reconciliation' },
  { id: 'excel' as const, name: 'Excel/CSV', description: 'Generic spreadsheet format' },
];

export function BankPDFUploader() {
  const { refreshBankJobs } = useJobContext();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  // No automatic sign-out while a statement uploads or converts
  useIdleHold(status === 'uploading' || status === 'processing');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('qbo');
  const [isDownloading, setIsDownloading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFile = acceptedFiles[0];
    if (pdfFile && pdfFile.type === 'application/pdf') {
      setFile(pdfFile);
      setStatus('idle');
      setResult(null);
      setErrorMessage('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  });

  const processFile = async () => {
    if (!file) return;

    try {
      setStatus('uploading');
      setProgress(10);

      // Step 1: Get presigned URL
      const presignedRes = await fetch('/api/bank/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: 'application/pdf',
        }),
      });

      if (!presignedRes.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, jobId, key } = await presignedRes.json();
      setProgress(30);

      // Step 2: Upload file to S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf' },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file');
      }

      setProgress(50);
      setStatus('processing');

      // Step 3: Process the PDF
      const processRes = await fetch('/api/bank/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          s3Key: key,
          outputFormat,
          filename: file.name,
        }),
      });

      const processResult = await processRes.json();
      setProgress(100);

      if (processResult.success) {
        setStatus('complete');
        setResult({
          success: true,
          jobId,
          transactionCount: processResult.transactionCount,
          detectedBank: processResult.detectedBank,
          warnings: processResult.warnings,
        });
        // Refresh bank jobs list to show in history (small delay to ensure DB commit)
        setTimeout(() => refreshBankJobs(), 300);
      } else {
        setStatus('error');
        setErrorMessage(processResult.error || 'Processing failed');
        setResult({
          success: false,
          jobId,
          error: processResult.error,
          warnings: processResult.warnings,
        });
        // Still refresh to show failed job in history
        setTimeout(() => refreshBankJobs(), 300);
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const downloadResult = async () => {
    if (!result?.jobId || isDownloading) return;

    console.log('[Download] Starting download for job:', result.jobId);
    setIsDownloading(true);
    try {
      const url = `/api/bank/job/${result.jobId}/download?format=${outputFormat}`;
      console.log('[Download] Fetching:', url);
      const downloadRes = await fetch(url);
      console.log('[Download] Response status:', downloadRes.status);
      const data = await downloadRes.json();
      console.log('[Download] Response data:', data);

      if (!downloadRes.ok) {
        console.error('[Download] API error:', data);
        setErrorMessage(data.error || 'Download failed');
        return;
      }

      if (!data.downloadUrl) {
        console.error('[Download] No download URL in response:', data);
        setErrorMessage('No download URL received');
        return;
      }

      // Fetch the file and save it from a blob URL, as JobHistoryTable does.
      // Opening the S3 URL in a new tab after the await above is treated as
      // a popup (the click's user activation has expired) and silently
      // blocked; `download` is also ignored on cross-origin URLs. The
      // results bucket's CORS allows this origin.
      const fileRes = await fetch(data.downloadUrl);
      if (!fileRes.ok) {
        console.error('[Download] File fetch failed:', fileRes.status);
        setErrorMessage('Download failed');
        return;
      }
      const blobUrl = URL.createObjectURL(await fileRes.blob());
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `bank_${result.jobId}_${outputFormat}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('[Download] Failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setResult(null);
    setErrorMessage('');
  };

  return (
    <div className="space-y-6">
      {/* Format Selector */}
      <div>
        <label className="block text-sm font-medium text-app-text mb-2">
          Output Format
        </label>
        <div className="grid grid-cols-3 gap-3">
          {FORMAT_OPTIONS.map((format) => (
            <button
              key={format.id}
              onClick={() => setOutputFormat(format.id)}
              disabled={status !== 'idle'}
              className={`p-3 rounded-lg border text-left transition-all ${
                outputFormat === format.id
                  ? 'border-primary-500 bg-primary-50 text-app-text'
                  : 'border-app-border bg-app-raised text-app-muted hover:border-app-border-strong'
              } ${status !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="font-medium text-sm">{format.name}</div>
              <div className="text-xs text-app-subtle mt-0.5">{format.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-primary-500 bg-primary-50'
            : file
            ? 'border-app-border-strong bg-app-raised'
            : 'border-app-border hover:border-app-border-strong bg-app-raised'
        }`}
      >
        <input {...getInputProps()} />

        {file ? (
          <div className="flex items-center justify-center gap-4">
            <div className="w-12 h-14 bg-app-error-bg rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-app-error" />
            </div>
            <div className="text-left">
              <p className="font-medium text-app-text">{file.name}</p>
              <p className="text-sm text-app-muted">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
        ) : (
          <>
            <FileUp className="w-12 h-12 mx-auto mb-4 text-primary-500" />
            <p className="text-lg text-app-text">
              {isDragActive ? 'Drop your PDF here' : 'Drop your bank statement PDF here'}
            </p>
            <p className="text-sm text-app-muted mt-2">
              or click to browse. Max 10MB.
            </p>
            <p className="text-xs text-app-subtle mt-4">
              Supported: Chase, Bank of America, Wells Fargo, Citi + Generic
            </p>
          </>
        )}
      </div>

      {/* Progress */}
      {(status === 'uploading' || status === 'processing') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-app-muted">
              {status === 'uploading' ? 'Uploading...' : 'Processing PDF...'}
            </span>
            <span className="text-primary-600">{progress}%</span>
          </div>
          <div className="h-2 bg-app-raised rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Result */}
      {status === 'complete' && result && (
        <div className="bg-app-success-bg border border-app-success/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-6 h-6 text-app-success mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-app-text">Processing Complete</h4>
              <div className="mt-2 space-y-1 text-sm text-app-text">
                {result.detectedBank && (
                  <p className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-app-muted" />
                    Detected: <span className="text-app-success">{result.detectedBank}</span>
                  </p>
                )}
                <p>
                  Extracted <span className="text-app-success">{result.transactionCount}</span> transactions
                </p>
              </div>

              {result.warnings && result.warnings.length > 0 && (
                <div className="mt-3 text-sm text-app-warn">
                  {result.warnings.map((warning, i) => (
                    <p key={i} className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      {warning}
                    </p>
                  ))}
                </div>
              )}

              <div className="mt-4 flex gap-3">
                <button
                  onClick={downloadResult}
                  disabled={isDownloading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 disabled:cursor-wait text-white rounded-lg font-medium text-sm transition-colors"
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {isDownloading ? 'Downloading...' : `Download ${outputFormat.toUpperCase()}`}
                </button>
                <button
                  onClick={reset}
                  className="px-4 py-2 text-app-muted hover:text-app-text transition-colors text-sm"
                >
                  Process Another
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="bg-app-error-bg border border-app-error/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-app-error mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-app-text">Processing Failed</h4>
              <p className="mt-1 text-sm text-app-error">{errorMessage}</p>

              {result?.warnings && result.warnings.length > 0 && (
                <div className="mt-2 text-sm text-app-muted">
                  {result.warnings.map((warning, i) => (
                    <p key={i}>{warning}</p>
                  ))}
                </div>
              )}

              <button
                onClick={reset}
                className="mt-4 px-4 py-2 bg-app-raised hover:bg-app-border text-app-text rounded-lg text-sm transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Process Button */}
      {file && status === 'idle' && (
        <button
          onClick={processFile}
          className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-all"
        >
          Process Bank Statement
        </button>
      )}
    </div>
  );
}
