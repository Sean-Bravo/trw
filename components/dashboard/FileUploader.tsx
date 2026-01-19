'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle, RefreshCw, X } from 'lucide-react';
import { uploadCSVFile, validateFile, formatFileSize, UploadError } from '@/lib/upload-client';
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
      } catch (err) {
        const uploadError = err as UploadError;
        let errorMessage = uploadError.message || 'Upload failed';

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

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          relative overflow-hidden cursor-pointer
          border-2 border-dashed rounded-xl p-6 sm:p-8 text-center
          transition-all duration-300
          ${isDragActive
            ? 'border-emerald-500 bg-emerald-500/5'
            : hasFiles
            ? 'border-emerald-500/50 bg-emerald-500/5'
            : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/30'
          }
        `}
      >
        <input {...getInputProps()} />

        {/* Drag shimmer */}
        {isDragActive && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent animate-shimmer" />
        )}

        <div className="relative flex flex-col items-center space-y-3 sm:space-y-4">
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center transition-all duration-300 ${
            isDragActive
              ? 'bg-emerald-500/20 border border-emerald-500/30'
              : hasFiles
              ? 'bg-emerald-500/20 border border-emerald-500/30'
              : 'bg-zinc-800/50 border border-zinc-700'
          }`}>
            {hasFiles ? (
              <CheckCircle className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-400" />
            ) : (
              <Upload className={`h-6 w-6 sm:h-7 sm:w-7 transition-colors ${
                isDragActive ? 'text-emerald-400' : 'text-zinc-500'
              }`} />
            )}
          </div>
          <div>
            <p className="text-base sm:text-lg font-medium text-white mb-1">
              {isDragActive
                ? 'Drop your files here'
                : hasFiles
                ? `${files.length} file${files.length > 1 ? 's' : ''} selected`
                : 'Drag and drop your CSV files'}
            </p>
            <p className="text-sm text-zinc-500">
              {hasFiles ? 'Drop more or click to add' : 'or click to browse'}
            </p>
          </div>
          {!hasFiles && (
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <FileText className="h-4 w-4" />
              <span>CSV files only • Max 50MB each • Up to 10 files</span>
            </div>
          )}
        </div>
      </div>

      {/* File List */}
      {hasFiles && (
        <div className="space-y-2">
          {files.map((fileItem) => (
            <div
              key={fileItem.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                fileItem.stage === 'completed'
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : fileItem.stage === 'error'
                  ? 'bg-red-500/10 border-red-500/20'
                  : 'bg-zinc-800/50 border-zinc-700/50'
              }`}
            >
              <FileText className={`h-5 w-5 flex-shrink-0 ${
                fileItem.stage === 'completed'
                  ? 'text-emerald-400'
                  : fileItem.stage === 'error'
                  ? 'text-red-400'
                  : 'text-zinc-400'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-white truncate">{fileItem.file.name}</p>
                  {fileItem.isDuplicate && fileItem.stage === 'pending' && (
                    <span className="text-xs text-amber-400 flex-shrink-0">↻ reprocess</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>{formatFileSize(fileItem.file.size)}</span>
                  {fileItem.stage === 'error' && fileItem.error && (
                    <span className="text-red-400">• {fileItem.error}</span>
                  )}
                  {fileItem.stage === 'completed' && (
                    <span className="text-emerald-400">• Uploaded</span>
                  )}
                  {(fileItem.stage === 'requesting' || fileItem.stage === 'uploading' || fileItem.stage === 'confirming') && (
                    <span className="text-cyan-400">• {fileItem.progress}%</span>
                  )}
                </div>
                {/* Progress bar for active uploads */}
                {(fileItem.stage === 'requesting' || fileItem.stage === 'uploading' || fileItem.stage === 'confirming') && (
                  <div className="mt-1.5 w-full bg-zinc-700 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full transition-all duration-300"
                      style={{ width: `${fileItem.progress}%` }}
                    />
                  </div>
                )}
              </div>
              {/* Remove button (only for pending/error files) */}
              {(fileItem.stage === 'pending' || fileItem.stage === 'error') && !uploading && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(fileItem.id);
                  }}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Duplicate Warning */}
      {hasDuplicates && !uploading && (
        <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <RefreshCw className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300">
            Some files were previously uploaded. They will be reprocessed with current settings.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-300 whitespace-pre-line">{error}</p>
        </div>
      )}

      {/* Success */}
      {successCount > 0 && (
        <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <p className="text-xs text-emerald-300">
            {successCount} file{successCount > 1 ? 's' : ''} uploaded successfully!
          </p>
        </div>
      )}

      {/* Upload Button */}
      {pendingFiles.length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => { setFiles([]); setError(null); }}
            className="min-h-[44px] px-3 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            disabled={uploading}
          >
            Clear all
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium rounded-lg hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20"
          >
            {uploading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
