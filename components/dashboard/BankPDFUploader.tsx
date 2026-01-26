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
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
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
      } else {
        setStatus('error');
        setErrorMessage(processResult.error || 'Processing failed');
        setResult({
          success: false,
          jobId,
          error: processResult.error,
          warnings: processResult.warnings,
        });
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

      console.log('[Download] Fetching file from S3');
      // Fetch the file as blob to avoid popup blocker issues
      const fileResponse = await fetch(data.downloadUrl);
      const blob = await fileResponse.blob();

      // Create object URL and trigger download
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `bank_${result.jobId}_${outputFormat}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      console.log('[Download] File download triggered');
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
        <label className="block text-sm font-medium text-slate-300 mb-2">
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
                  ? 'border-emerald-500 bg-emerald-500/10 text-white'
                  : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
              } ${status !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="font-medium text-sm">{format.name}</div>
              <div className="text-xs text-slate-500 mt-0.5">{format.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-emerald-500 bg-emerald-500/10'
            : file
            ? 'border-slate-600 bg-slate-800/50'
            : 'border-slate-700 hover:border-slate-600 bg-slate-900/50'
        }`}
      >
        <input {...getInputProps()} />

        {file ? (
          <div className="flex items-center justify-center gap-4">
            <div className="w-12 h-14 bg-red-500/20 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-red-400" />
            </div>
            <div className="text-left">
              <p className="font-medium text-white">{file.name}</p>
              <p className="text-sm text-slate-400">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
        ) : (
          <>
            <FileUp className="w-12 h-12 mx-auto mb-4 text-emerald-400" />
            <p className="text-lg text-white">
              {isDragActive ? 'Drop your PDF here' : 'Drop your bank statement PDF here'}
            </p>
            <p className="text-sm text-slate-400 mt-2">
              or click to browse. Max 10MB.
            </p>
            <p className="text-xs text-slate-500 mt-4">
              Supported: Chase, Bank of America, Wells Fargo, Citi + Generic
            </p>
          </>
        )}
      </div>

      {/* Progress */}
      {(status === 'uploading' || status === 'processing') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">
              {status === 'uploading' ? 'Uploading...' : 'Processing PDF...'}
            </span>
            <span className="text-emerald-400">{progress}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Result */}
      {status === 'complete' && result && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-white">Processing Complete</h4>
              <div className="mt-2 space-y-1 text-sm text-slate-300">
                {result.detectedBank && (
                  <p className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    Detected: <span className="text-emerald-400">{result.detectedBank}</span>
                  </p>
                )}
                <p>
                  Extracted <span className="text-emerald-400">{result.transactionCount}</span> transactions
                </p>
              </div>

              {result.warnings && result.warnings.length > 0 && (
                <div className="mt-3 text-sm text-amber-400">
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
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 disabled:cursor-wait text-white rounded-lg font-medium text-sm transition-colors"
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
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm"
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
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-white">Processing Failed</h4>
              <p className="mt-1 text-sm text-red-300">{errorMessage}</p>

              {result?.warnings && result.warnings.length > 0 && (
                <div className="mt-2 text-sm text-slate-400">
                  {result.warnings.map((warning, i) => (
                    <p key={i}>{warning}</p>
                  ))}
                </div>
              )}

              <button
                onClick={reset}
                className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
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
          className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-xl font-semibold transition-all"
        >
          Process Bank Statement
        </button>
      )}
    </div>
  );
}
