'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { uploadCSVFile, validateFile, formatFileSize, UploadError } from '@/lib/upload-client';

export function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<'requesting' | 'uploading' | 'confirming' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];

    if (!selectedFile) return;

    // Use upload-client validation
    const validation = validateFile(selectedFile);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setSuccess(false);
    setUploadProgress(0);
    setUploadStage(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Execute complete upload flow using upload-client
      const result = await uploadCSVFile(file, (stage, percent) => {
        setUploadStage(stage);
        setUploadProgress(percent);
      });

      setSuccess(true);
      setFile(null);
      setUploadProgress(100);
      setUploadStage(null);

      // Auto-dismiss success message after 5 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 5000);

    } catch (err) {
      const uploadError = err as UploadError;

      if (uploadError.code === 'RATE_LIMIT') {
        const retryMinutes = Math.ceil((uploadError.retryAfter || 3600) / 60);
        setError(`${uploadError.message} Please try again in ${retryMinutes} minutes.`);
      } else if (uploadError.code === 'FILE_TOO_LARGE') {
        setError('File size exceeds your tier limit. Upgrade for larger files.');
      } else {
        setError(uploadError.message || 'Upload failed. Please try again.');
      }

      setUploadProgress(0);
      setUploadStage(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          relative overflow-hidden
          border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
          transition-all duration-300
          ${isDragActive
            ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)]/5'
            : 'border-slate-300 dark:border-slate-600 hover:border-[var(--color-primary-400)] hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }
          ${file ? 'bg-[var(--color-accent-500)]/5 border-[var(--color-accent-500)]' : ''}
        `}
      >
        <input {...getInputProps()} />

        {/* Animated shimmer on drag */}
        {isDragActive && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--color-primary-500)]/10 to-transparent animate-shimmer" />
        )}

        <div className="relative flex flex-col items-center space-y-4">
          {file ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-[var(--color-accent-500)] to-[var(--color-accent-600)] flex items-center justify-center">
                <CheckCircle className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-lg font-medium text-slate-900 dark:text-white">
                  {file.name}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                isDragActive
                  ? 'bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-primary-600)]'
                  : 'bg-slate-100 dark:bg-slate-800'
              }`}>
                <Upload className={`h-7 w-7 transition-colors ${
                  isDragActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'
                }`} />
              </div>
              <div>
                <p className="text-lg font-medium text-slate-900 dark:text-white mb-1">
                  {isDragActive
                    ? 'Drop your CSV file here'
                    : 'Drag and drop your CSV file here'}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  or click to browse your files
                </p>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                <FileText className="h-4 w-4" />
                <span>CSV files only • Max 50MB (Free tier)</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="flex items-center space-x-2 p-4 bg-[var(--color-accent-500)]/10 border border-[var(--color-accent-500)]/20 rounded-xl">
          <CheckCircle className="h-5 w-5 text-[var(--color-accent-500)] flex-shrink-0" />
          <p className="text-sm text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]">
            Upload successful! Your file is being processed.
          </p>
        </div>
      )}

      {/* Progress Bar */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              {uploadStage === 'requesting' && 'Requesting upload URL...'}
              {uploadStage === 'uploading' && 'Uploading to S3...'}
              {uploadStage === 'confirming' && 'Confirming upload...'}
            </span>
            <span className="text-slate-600 dark:text-slate-400">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-accent-500)] h-full transition-all duration-300 ease-out relative"
              style={{ width: `${uploadProgress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>
      )}

      {/* Upload Button */}
      {file && !success && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setFile(null);
              setError(null);
            }}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            disabled={uploading}
          >
            Remove file
          </button>
          <Button
            onClick={handleUpload}
            disabled={uploading}
            variant="primary"
          >
            {uploading ? 'Uploading...' : 'Upload & Process'}
          </Button>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
        <InfoCard
          icon={<Sparkles className="h-4 w-4" />}
          title="Supported Exchanges"
          description="Binance, Coinbase, Kraken, and 13+ more"
        />
        <InfoCard
          icon={<Sparkles className="h-4 w-4" />}
          title="AI-Powered"
          description="Automatic tax categorization and insights"
        />
        <InfoCard
          icon={<Sparkles className="h-4 w-4" />}
          title="Export Ready"
          description="Compatible with TurboTax, Koinly, and more"
        />
      </div>
    </div>
  );
}

function InfoCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center group">
      <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-primary-500)]/10 text-[var(--color-primary-500)] mb-2 group-hover:bg-[var(--color-primary-500)] group-hover:text-white transition-colors">
        {icon}
      </div>
      <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{title}</p>
      <p className="text-xs text-slate-600 dark:text-slate-400">{description}</p>
    </div>
  );
}
