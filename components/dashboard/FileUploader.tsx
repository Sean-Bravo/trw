'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
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
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-200
          ${isDragActive
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
          }
          ${file ? 'bg-green-50 border-green-300' : ''}
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center space-y-4">
          {file ? (
            <>
              <CheckCircle className="h-12 w-12 text-green-600" />
              <div>
                <p className="text-lg font-medium text-slate-900">
                  {file.name}
                </p>
                <p className="text-sm text-slate-600">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-slate-400" />
              <div>
                <p className="text-lg font-medium text-slate-900 mb-1">
                  {isDragActive
                    ? 'Drop your CSV file here'
                    : 'Drag and drop your CSV file here'}
                </p>
                <p className="text-sm text-slate-600">
                  or click to browse your files
                </p>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-500">
                <FileText className="h-4 w-4" />
                <span>CSV files only • Max 50MB (Free tier)</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-800">
            Upload successful! Your file is being processed.
          </p>
        </div>
      )}

      {/* Progress Bar */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-700 font-medium">
              {uploadStage === 'requesting' && 'Requesting upload URL...'}
              {uploadStage === 'uploading' && 'Uploading to S3...'}
              {uploadStage === 'confirming' && 'Confirming upload...'}
            </span>
            <span className="text-slate-600">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
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
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200">
        <InfoCard
          title="Supported Exchanges"
          description="Binance, Coinbase, Kraken, and 13+ more"
        />
        <InfoCard
          title="AI-Powered"
          description="Automatic tax categorization and insights"
        />
        <InfoCard
          title="Export Ready"
          description="Compatible with TurboTax, Koinly, and more"
        />
      </div>
    </div>
  );
}

function InfoCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center">
      <p className="text-sm font-semibold text-slate-900 mb-1">{title}</p>
      <p className="text-xs text-slate-600">{description}</p>
    </div>
  );
}
