/**
 * Upload Client - Handles CSV file uploads to S3 via presigned URLs
 * Integrates with AWS Lambda backend
 */

export interface PresignedUrlResponse {
  presignedPost: {
    url: string;
    fields: Record<string, string>;
  };
  uploadId: string;
  maxSize: number;
  s3Key?: string;
}

export interface UploadConfirmResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  jobsRemainingThisHour: number | 'unlimited';
}

export interface UploadError {
  code: 'RATE_LIMIT' | 'FILE_TOO_LARGE' | 'INVALID_FILE_TYPE' | 'NETWORK_ERROR' | 'SERVER_ERROR';
  message: string;
  retryAfter?: number; // seconds to wait before retry (for rate limit)
}

/**
 * Step 1: Request a presigned URL from the API
 */
export async function requestPresignedUrl(
  filename: string,
  fileSize: number
): Promise<PresignedUrlResponse> {
  const response = await fetch('/api/uploads/presigned-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filename, fileSize }),
  });

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '3600');
    throw {
      code: 'RATE_LIMIT',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter,
    } as UploadError;
  }

  if (response.status === 413) {
    throw {
      code: 'FILE_TOO_LARGE',
      message: 'File exceeds your tier limit. Upgrade for larger files.',
    } as UploadError;
  }

  if (!response.ok) {
    throw {
      code: 'SERVER_ERROR',
      message: 'Failed to request upload URL',
    } as UploadError;
  }

  return response.json();
}

/**
 * Step 2: Upload file directly to S3 using presigned PUT URL
 */
export async function uploadToS3(
  file: File,
  presignedData: PresignedUrlResponse['presignedPost'],
  onProgress?: (percent: number) => void
): Promise<{ etag: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      });
    }

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Extract ETag from response headers
        const etag = xhr.getResponseHeader('ETag') || '';
        resolve({ etag: etag.replace(/"/g, '') });
      } else {
        reject({
          code: 'NETWORK_ERROR',
          message: `S3 upload failed: ${xhr.statusText || 'Unknown error'}`,
        } as UploadError);
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      reject({
        code: 'NETWORK_ERROR',
        message: 'Network error during upload',
      } as UploadError);
    });

    xhr.addEventListener('abort', () => {
      reject({
        code: 'NETWORK_ERROR',
        message: 'Upload cancelled',
      } as UploadError);
    });

    // Check if we have fields (POST) or just a URL (PUT)
    const hasFields = presignedData.fields && Object.keys(presignedData.fields).length > 0;

    if (hasFields) {
      // S3 POST upload (using presigned POST)
      const formData = new FormData();
      Object.entries(presignedData.fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append('file', file);

      xhr.open('POST', presignedData.url);
      xhr.send(formData);
    } else {
      // S3 PUT upload (using presigned PUT URL)
      xhr.open('PUT', presignedData.url);
      xhr.setRequestHeader('Content-Type', 'text/csv');
      xhr.send(file);
    }
  });
}

/**
 * Step 3: Confirm upload and create processing job
 */
export async function confirmUpload(
  uploadId: string,
  etag: string
): Promise<UploadConfirmResponse> {
  // Generate idempotency key (allows safe retries)
  const idempotencyKey = crypto.randomUUID();

  // URL encode the uploadId since it's an S3 key with slashes
  const encodedUploadId = encodeURIComponent(uploadId);

  const response = await fetch(`/api/uploads/${encodedUploadId}/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ etag }),
  });

  if (response.status === 429) {
    const data = await response.json();
    const retryAfter = parseInt(response.headers.get('Retry-After') || '3600');
    throw {
      code: 'RATE_LIMIT',
      message: data.error || 'Rate limit exceeded',
      retryAfter,
    } as UploadError;
  }

  if (!response.ok) {
    throw {
      code: 'SERVER_ERROR',
      message: 'Failed to confirm upload',
    } as UploadError;
  }

  return response.json();
}

/**
 * Complete upload flow (all 3 steps)
 */
export async function uploadCSVFile(
  file: File,
  onProgress?: (stage: 'requesting' | 'uploading' | 'confirming', percent: number) => void
): Promise<UploadConfirmResponse> {
  try {
    // Step 1: Request presigned URL
    onProgress?.('requesting', 10);
    const { presignedPost, uploadId } = await requestPresignedUrl(
      file.name,
      file.size
    );

    // Step 2: Upload to S3
    onProgress?.('uploading', 20);
    const { etag } = await uploadToS3(file, presignedPost, (percent) => {
      // Map 0-100% upload to 20-80% overall progress
      const overallPercent = 20 + Math.round(percent * 0.6);
      onProgress?.('uploading', overallPercent);
    });

    // Step 3: Confirm upload
    onProgress?.('confirming', 90);
    const result = await confirmUpload(uploadId, etag);

    onProgress?.('confirming', 100);
    return result;
  } catch (error) {
    // Re-throw UploadError with proper typing
    if ((error as UploadError).code) {
      throw error;
    }

    // Wrap unknown errors
    throw {
      code: 'SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    } as UploadError;
  }
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<{
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progressStage?: string;
  exchangeDetected?: string;
  transactionCount?: number;
  aiSummary?: string;
  completedAt?: string;
  errorMessage?: string;
}> {
  const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`);

  if (!response.ok) {
    throw {
      code: 'SERVER_ERROR',
      message: 'Failed to get job status',
    } as UploadError;
  }

  return response.json();
}

/** Supported tax software output formats */
export type TaxSoftwareFormat = 'koinly' | 'turbotax' | 'coinledger' | 'zenledger';

/**
 * Get download URL for completed job
 * @param jobId - The job ID
 * @param type - File type (formatted or flagged)
 * @param format - Tax software format (koinly, turbotax, coinledger, zenledger)
 */
export async function getDownloadUrl(
  jobId: string,
  type: 'formatted' | 'flagged' = 'formatted',
  format: TaxSoftwareFormat = 'koinly'
): Promise<{
  downloadUrl: string;
  fileType: string;
  expiresIn: number;
  format: TaxSoftwareFormat;
}> {
  const params = new URLSearchParams({
    type,
    format,
  });

  const response = await fetch(
    `/api/jobs/${encodeURIComponent(jobId)}/download?${params.toString()}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw {
      code: 'SERVER_ERROR',
      message: error.error || 'Failed to get download URL',
    } as UploadError;
  }

  return response.json();
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  maxSize: number = 50 * 1024 * 1024 // 50MB default for free tier
): { valid: boolean; error?: string } {
  // Check file type
  if (!file.name.endsWith('.csv')) {
    return {
      valid: false,
      error: 'Only CSV files are supported',
    };
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    };
  }

  // Check file is not empty
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
    };
  }

  return { valid: true };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * AI Insights response type
 */
export interface AIInsights {
  success: boolean;
  quick_stats?: {
    total_transactions: number;
    transaction_types: Record<string, number>;
    assets: string[];
    unique_assets: number;
    date_range: { start: string | null; end: string | null };
  };
  ai_insights?: {
    summary: string;
    total_transactions: number;
    date_range: { start: string; end: string };
    transaction_types: Record<string, number>;
    top_assets: Array<{ asset: string; count: number }>;
    potential_issues?: string[];  // Legacy field
    tax_tips?: string[];          // Legacy field
    what_to_do_next?: string[];   // New: clear next steps for user
    data_notes?: string[];        // New: observations about the data
    estimated_events?: number;    // Legacy field name
    estimated_taxable_events?: number;  // New field name
  };
  tier?: 'free' | 'pro' | 'premium';
  model?: string;
  provider?: string;
  ai_error?: string;
  message?: string;
}

/**
 * Get AI insights for completed job
 */
export async function getJobInsights(jobId: string): Promise<AIInsights> {
  const response = await fetch(
    `/api/jobs/${encodeURIComponent(jobId)}/insights`
  );

  if (!response.ok) {
    throw {
      code: 'SERVER_ERROR',
      message: 'Failed to get insights',
    } as UploadError;
  }

  return response.json();
}

/**
 * Retry a failed job with optional exchange override
 */
export async function retryJobWithExchange(
  jobId: string,
  exchangeName?: string
): Promise<{
  success: boolean;
  message: string;
  jobId: string;
  retryCount: number;
  maxRetries: number;
  retriesRemaining: number;
  exchangeName: string | null;
}> {
  const response = await fetch(
    `/api/jobs/${encodeURIComponent(jobId)}/retry`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ exchangeName }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw {
      code: 'SERVER_ERROR',
      message: error.error || 'Failed to retry job',
    } as UploadError;
  }

  return response.json();
}

// Re-export for backwards compatibility
export type PresignedPostResponse = PresignedUrlResponse;
