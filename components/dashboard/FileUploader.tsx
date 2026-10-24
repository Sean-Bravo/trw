'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle, RefreshCw, X } from 'lucide-react';
import { uploadCSVFile, validateFile, formatFileSize, UploadError } from '@/lib/upload-client';
import { trackEvent } from '@/lib/analytics';
import { useJobContext } from '@/contexts/JobContext';

interface FileWithProgress {
  file: File;
  id: string;
  progress: number;
  stage: 'pending' | 'requesting' | 'uploading' | 'confirming' | 'completed' | 'error';
  error?: string;
  isDuplicate?: boolean;
}

export function FileUploader() {
  const { setActiveJob, refreshJobHistory, jobHistory } = useJobContext();
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);

  const checkForDuplicate = useCallback((filename: string): boolean => {
    return jobHistory.some((job) => job.filename === filename);
  }, [jobHistory]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileWithProgress[] = [];
    const errors: string[] = [];

    acceptedFiles.forEach((file) => {
      const validation = validateFile(file);
      if (!validation.valid) {
        errors.push(`${file.name}: ${validation.error}`);
        return;
      }

      // Check if already in list
      const alreadyAdded = files.some((f) => f.file.name === file.name && f.file.size === file.size);
      if (alreadyAdded) return;

      newFiles.push({
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        progress: 0,
        stage: 'pending',
        isDuplicate: checkForDuplicate(file.name),
      });
    });

    if (errors.length > 0) {
      setError(errors.join('\n'));
    } else {
      setError(null);
    }

    if (newFiles.length > 0) {
      setFiles((prev) => [...prev, ...newFiles]);
      setSuccessCount(0);
    }
  }, [checkForDuplicate, files]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 10,
    multiple: true,
  });

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    let completed = 0;

    // Process files sequentially
    for (const fileItem of files) {
      if (fileItem.stage === 'completed' || fileItem.stage === 'error') continue;

      try {
        // Update stage
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id ? { ...f, stage: 'requesting' as const, progress: 10 } : f
          )
        );

        trackEvent('csv_upload_started', { file_size_kb: Math.round(fileItem.file.size / 1024) });

        const result = await uploadCSVFile(fileItem.file, (stage, percent) => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileItem.id ? { ...f, stage, progress: percent } : f
            )
          );
        });

        // Mark completed
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id ? { ...f, stage: 'completed' as const, progress: 100 } : f
          )
        );

        completed++;
        setActiveJob(result.jobId);
        trackEvent('csv_upload_completed', { file_size_kb: Math.round(fileItem.file.size / 1024) });
      } catch (err) {
        const uploadError = err as UploadError;
        let errorMessage = uploadError.message || 'Upload failed';
        trackEvent('csv_upload_failed', { error_code: uploadError.code || 'unknown' });

        if (uploadError.code === 'RATE_LIMIT') {
          const retryMinutes = Math.ceil((uploadError.retryAfter || 3600) / 60);
          errorMessage = `Rate limit exceeded. Try again in ${retryMinutes} min.`;
        } else if (uploadError.code === 'FILE_TOO_LARGE') {
          errorMessage = 'File too large for your tier.';
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id ? { ...f, stage: 'error' as const, error: errorMessage } : f
          )
        );
      }
    }

    setSuccessCount(completed);
    refreshJobHistory();
    setUploading(false);

    // Clear completed files after delay
    if (completed > 0) {
      setTimeout(() => {
        setFiles((prev) => prev.filter((f) => f.stage !== 'completed'));
        setSuccessCount(0);
      }, 3000);
    }
  };

  const hasFiles = files.length > 0;
  const pendingFiles = files.filter((f) => f.stage === 'pending' || f.stage === 'error');
  const hasDuplicates = files.some((f) => f.isDuplicate);

  const isActive = (stage: string) => stage === 'requesting' || stage === 'uploading' || stage === 'confirming';

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`relative cursor-pointer border-[1.5px] border-dashed rounded-xl px-6 py-10 text-center transition-colors ${
          isDragActive
            ? 'border-primary-500 bg-primary-50'
            : hasFiles
            ? 'border-app-success bg-app-success-bg'
            : 'border-app-border-strong bg-app-raised/60 hover:border-primary-400 hover:bg-primary-50/50'
        }`}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-app-raised border border-app-border">
            {hasFiles ? (
              <CheckCircle className="h-6 w-6 text-app-success" aria-hidden="true" />
            ) : (
              <Upload className={`h-6 w-6 ${isDragActive ? 'text-primary-500' : 'text-app-muted'}`} aria-hidden="true" />
            )}
          </div>
          <p className="text-base font-semibold text-app-text">
            {isDragActive
              ? 'Drop your files here'
              : hasFiles
              ? `${files.length} file${files.length > 1 ? 's' : ''} selected`
              : <>Drop exchange CSVs here, or <span className="text-app-link">browse</span></>}
          </p>
          <p className="text-sm text-app-muted">
            {hasFiles
              ? 'Drop more or click to add'
              : 'Up to 10 files · 50 MB each · Coinbase, Kraken, Binance and more'}
          </p>
        </div>
      </div>

      {/* File List */}
      {hasFiles && (
        <ul className="space-y-2">
          {files.map((fileItem) => (
            <li
              key={fileItem.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                fileItem.stage === 'completed'
                  ? 'bg-app-success-bg border-app-success/20'
                  : fileItem.stage === 'error'
                  ? 'bg-app-error-bg border-app-error/20'
                  : 'bg-app-card border-app-border'
              }`}
            >
              <FileText className={`h-5 w-5 shrink-0 ${
                fileItem.stage === 'completed'
                  ? 'text-app-success'
                  : fileItem.stage === 'error'
                  ? 'text-app-error'
                  : 'text-app-muted'
              }`} aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-app-text truncate">{fileItem.file.name}</p>
                  {fileItem.isDuplicate && fileItem.stage === 'pending' && (
                    <span className="text-xs text-app-warn shrink-0">↻ reprocess</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-app-muted">
                  <span>{formatFileSize(fileItem.file.size)}</span>
                  {fileItem.stage === 'error' && fileItem.error && (
                    <span className="text-app-error">• {fileItem.error}</span>
                  )}
                  {fileItem.stage === 'completed' && (
                    <span className="text-app-success">• Uploaded</span>
                  )}
                  {isActive(fileItem.stage) && (
                    <span className="text-primary-600">• {fileItem.progress}%</span>
                  )}
                </div>
                {isActive(fileItem.stage) && (
                  <div className="mt-1.5 w-full bg-app-raised rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-primary-500 h-full transition-all duration-300"
                      style={{ width: `${fileItem.progress}%` }}
                    />
                  </div>
                )}
              </div>
              {(fileItem.stage === 'pending' || fileItem.stage === 'error') && !uploading && (
                <button
                  type="button"
                  aria-label={`Remove ${fileItem.file.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(fileItem.id);
                  }}
                  className="min-h-11 min-w-11 flex items-center justify-center text-app-subtle hover:text-app-text transition-colors"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Duplicate Warning */}
      {hasDuplicates && !uploading && (
        <div className="flex items-start gap-3 p-3 bg-app-warn-bg border border-app-warn/20 rounded-xl">
          <RefreshCw className="h-4 w-4 text-app-warn shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-app-warn">
            Some files were previously uploaded. They will be reprocessed with current settings.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div role="alert" className="flex items-start gap-3 p-3 bg-app-error-bg border border-app-error/20 rounded-xl">
          <AlertCircle className="h-4 w-4 text-app-error shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-app-error whitespace-pre-line">{error}</p>
        </div>
      )}

      {/* Success */}
      {successCount > 0 && (
        <div className="flex items-center gap-3 p-3 bg-app-success-bg border border-app-success/20 rounded-xl">
          <CheckCircle className="h-4 w-4 text-app-success shrink-0" aria-hidden="true" />
          <p className="text-sm text-app-success">
            {successCount} file{successCount > 1 ? 's' : ''} uploaded successfully!
          </p>
        </div>
      )}

      {/* Upload Button */}
      {pendingFiles.length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => { setFiles([]); setError(null); }}
            className="min-h-11 px-3 text-sm text-app-muted hover:text-app-text transition-colors"
            disabled={uploading}
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="inline-flex items-center justify-center gap-2 min-h-11 px-5 bg-primary-500 text-white text-sm font-semibold rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </>
            ) : (
              `Upload ${pendingFiles.length} file${pendingFiles.length > 1 ? 's' : ''}`
            )}
          </button>
        </div>
      )}
    </div>
  );
}
