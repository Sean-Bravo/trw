'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
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
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      await uploadCSVFile(file, (stage, percent) => {
        setUploadStage(stage);
        setUploadProgress(percent);
      });

      setSuccess(true);
      setFile(null);
      setUploadProgress(100);
      setUploadStage(null);

      setTimeout(() => setSuccess(false), 5000);
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
          relative overflow-hidden cursor-pointer
          border-2 border-dashed rounded-xl p-8 text-center
          transition-all duration-300
          ${isDragActive
            ? 'border-emerald-500 bg-emerald-500/5'
            : file
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

        <div className="relative flex flex-col items-center space-y-4">
          {file ? (
            <>
              <div className="w-14 h-14 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle className="h-7 w-7 text-emerald-400" />
              </div>
              <div>
                <p className="text-lg font-medium text-white">{file.name}</p>
                <p className="text-sm text-zinc-500">{formatFileSize(file.size)}</p>
              </div>
            </>
          ) : (
            <>
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 ${
                isDragActive
                  ? 'bg-emerald-500/20 border border-emerald-500/30'
                  : 'bg-zinc-800/50 border border-zinc-700'
              }`}>
                <Upload className={`h-7 w-7 transition-colors ${
                  isDragActive ? 'text-emerald-400' : 'text-zinc-500'
                }`} />
              </div>
              <div>
                <p className="text-lg font-medium text-white mb-1">
                  {isDragActive ? 'Drop your file here' : 'Drag and drop your CSV'}
                </p>
                <p className="text-sm text-zinc-500">or click to browse</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-600">
                <FileText className="h-4 w-4" />
                <span>CSV files only • Max 50MB</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
          <p className="text-sm text-emerald-300">Upload successful! Your file is being processed.</p>
        </div>
      )}

      {/* Progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">
              {uploadStage === 'requesting' && 'Preparing upload...'}
              {uploadStage === 'uploading' && 'Uploading file...'}
              {uploadStage === 'confirming' && 'Confirming...'}
            </span>
            <span className="text-zinc-500 font-mono">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full transition-all duration-300 ease-out relative"
              style={{ width: `${uploadProgress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>
      )}

      {/* Upload Button */}
      {file && !success && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => { setFile(null); setError(null); }}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            disabled={uploading}
          >
            Remove file
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium rounded-lg hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20"
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
              'Upload & Process'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
