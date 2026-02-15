/**
 * Bank Statement Upload Client - Handles PDF uploads to S3 via presigned URLs
 * 3-step flow: requestPresignedUrl → uploadToS3 → processBankStatement
 */

export interface BankPresignedUrlResponse {
  uploadUrl: string;
  jobId: string;
  key: string;
  expiresIn: number;
}

export interface BankProcessResponse {
  success: boolean;
  jobId?: string;
  detectedBank: string | null;
  transactionCount: number | null;
  downloadUrl?: string;
  resultKey?: string;
  outputFormat?: string;
  warnings?: string[];
  error?: string;
}

export type BankOutputFormat = 'csv' | 'qbo' | 'xero' | 'excel';

export interface BankUploadError {
  code: 'RATE_LIMIT' | 'FILE_TOO_LARGE' | 'INVALID_FILE_TYPE' | 'NETWORK_ERROR' | 'SERVER_ERROR';
  message: string;
  retryAfter?: number;
}

/**
 * Step 1: Request a presigned URL for bank statement upload
 */
export async function requestBankPresignedUrl(
  filename: string
): Promise<BankPresignedUrlResponse> {
  const response = await fetch('/api/bank/presigned-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename }),
  });

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '3600');
    throw {
      code: 'RATE_LIMIT',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter,
    } as BankUploadError;
  }

  if (!response.ok) {
    throw {
      code: 'SERVER_ERROR',
      message: 'Failed to request upload URL',
    } as BankUploadError;
  }

  return response.json();
}

/**
 * Step 2: Upload PDF to S3 via presigned PUT URL
 */
export async function uploadBankPdfToS3(
  file: File,
  uploadUrl: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject({
          code: 'NETWORK_ERROR',
          message: `S3 upload failed: ${xhr.statusText || 'Unknown error'}`,
        } as BankUploadError);
      }
    });

    xhr.addEventListener('error', () => {
      reject({
        code: 'NETWORK_ERROR',
        message: 'Network error during upload',
      } as BankUploadError);
    });

    xhr.addEventListener('abort', () => {
      reject({
        code: 'NETWORK_ERROR',
        message: 'Upload cancelled',
      } as BankUploadError);
    });

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', 'application/pdf');
    xhr.send(file);
  });
}

/**
 * Step 3: Trigger bank statement processing
 */
export async function processBankStatement(
  jobId: string,
  s3Key: string,
  outputFormat: BankOutputFormat,
  filename: string
): Promise<BankProcessResponse> {
  const response = await fetch('/api/bank/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, s3Key, outputFormat, filename }),
  });

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '3600');
    throw {
      code: 'RATE_LIMIT',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter,
    } as BankUploadError;
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw {
      code: 'SERVER_ERROR',
      message: data.error || 'Processing failed',
    } as BankUploadError;
  }

  return response.json();
}

/**
 * Complete upload flow (all 3 steps)
 */
export async function uploadBankStatement(
  file: File,
  outputFormat: BankOutputFormat = 'csv',
  onProgress?: (stage: 'requesting' | 'uploading' | 'processing', percent: number) => void
): Promise<BankProcessResponse> {
  try {
    // Step 1: Request presigned URL
    onProgress?.('requesting', 10);
    const { uploadUrl, jobId, key } = await requestBankPresignedUrl(file.name);

    // Step 2: Upload to S3
    onProgress?.('uploading', 20);
    await uploadBankPdfToS3(file, uploadUrl, (percent) => {
      const overallPercent = 20 + Math.round(percent * 0.4);
      onProgress?.('uploading', overallPercent);
    });

    // Step 3: Process
    onProgress?.('processing', 70);
    const result = await processBankStatement(jobId, key, outputFormat, file.name);
    onProgress?.('processing', 100);

    return result;
  } catch (error) {
    if ((error as BankUploadError).code) {
      throw error;
    }

    throw {
      code: 'SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    } as BankUploadError;
  }
}

/**
 * Validate bank statement file before upload
 */
export function validateBankFile(
  file: File,
  maxSize: number = 50 * 1024 * 1024
): { valid: boolean; error?: string } {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return { valid: false, error: 'Only PDF files are supported' };
  }

  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
  }

  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  return { valid: true };
}
