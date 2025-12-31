/**
 * Upload Client - Handles CSV file uploads to S3 via presigned POST URLs
 * Integrates with backend architecture (Phase 2 & 3 from BACKEND_ARCHITECTURE.md)
 */

export interface PresignedPostResponse {
  presignedPost: {
    url: string;
    fields: Record<string, string>;
  };
  uploadId: string;
  maxSize: number;
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
 * Step 1: Request a presigned POST URL from the API
 */
export async function requestPresignedUrl(
  filename: string,
  fileSize: number
): Promise<PresignedPostResponse> {
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
 * Step 2: Upload file directly to S3 using presigned POST
 */
export async function uploadToS3(
  file: File,
  presignedPost: PresignedPostResponse['presignedPost'],
  onProgress?: (percent: number) => void
): Promise<{ etag: string }> {
  const formData = new FormData();

  // Append all presigned POST fields (required by S3)
  Object.entries(presignedPost.fields).forEach(([key, value]) => {
    formData.append(key, value);
  });

  // Append the file LAST (S3 requirement)
  formData.append('file', file);

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
          message: `S3 upload failed: ${xhr.statusText}`,
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

    // Send request
    xhr.open('POST', presignedPost.url);
    xhr.send(formData);
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

  const response = await fetch(`/api/uploads/${uploadId}/confirm`, {
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
