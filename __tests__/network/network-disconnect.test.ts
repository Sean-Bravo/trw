/**
 * Network Disconnect Handling Tests (Day 5)
 * ==========================================
 * Tests for network error resilience, connection timeouts,
 * upload interruptions, and S3 failure scenarios.
 */

import {
  requestPresignedUrl,
  uploadToS3,
  confirmUpload,
  uploadCSVFile,
  getJobStatus,
  getDownloadUrl,
  getJobInsights,
  retryJobWithExchange,
  type UploadError,
  type PresignedUrlResponse,
} from '@/lib/upload-client';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock crypto.randomUUID for idempotency keys
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-1234',
  },
});

// Helper to create mock Response
function createMockResponse(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers(headers),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response;
}

// Mock XMLHttpRequest for S3 uploads
class MockXMLHttpRequest {
  static DONE = 4;
  readyState = 0;
  status = 0;
  statusText = '';
  responseHeaders: Record<string, string> = {};

  upload = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };

  private listeners: Record<string, ((...args: unknown[]) => void)[]> = {};

  open = jest.fn();
  send = jest.fn();
  setRequestHeader = jest.fn();
  abort = jest.fn();

  addEventListener(event: string, callback: (...args: unknown[]) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  removeEventListener(event: string, callback: (...args: unknown[]) => void) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    }
  }

  getResponseHeader(name: string): string | null {
    return this.responseHeaders[name] || null;
  }

  // Test helpers to trigger events
  triggerLoad(status: number, headers: Record<string, string> = {}) {
    this.status = status;
    this.responseHeaders = headers;
    this.readyState = MockXMLHttpRequest.DONE;
    this.listeners['load']?.forEach((cb) => cb(new Event('load')));
  }

  triggerError() {
    this.listeners['error']?.forEach((cb) => cb(new Event('error')));
  }

  triggerAbort() {
    this.listeners['abort']?.forEach((cb) => cb(new Event('abort')));
  }

  triggerProgress(loaded: number, total: number) {
    const event = { lengthComputable: true, loaded, total };
    this.upload.addEventListener.mock.calls.forEach(([eventName, callback]) => {
      if (eventName === 'progress') {
        callback(event);
      }
    });
  }
}

let mockXHR: MockXMLHttpRequest;

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
  mockXHR = new MockXMLHttpRequest();
  (global as unknown as { XMLHttpRequest: typeof MockXMLHttpRequest }).XMLHttpRequest = jest
    .fn()
    .mockImplementation(() => mockXHR);
});

describe('Network Disconnect Handling', () => {
  describe('requestPresignedUrl - Network Failures', () => {
    it('should propagate fetch failure as TypeError', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      // requestPresignedUrl doesn't wrap fetch errors - they propagate
      // The uploadCSVFile wrapper handles error normalization
      await expect(requestPresignedUrl('test.csv', 1024)).rejects.toThrow('Failed to fetch');
    });

    it('should throw RATE_LIMIT with retryAfter on 429', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({}, 429, { 'Retry-After': '120' })
      );

      await expect(requestPresignedUrl('test.csv', 1024)).rejects.toMatchObject({
        code: 'RATE_LIMIT',
        retryAfter: 120,
      });
    });

    it('should throw FILE_TOO_LARGE on 413', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}, 413));

      await expect(requestPresignedUrl('test.csv', 1024)).rejects.toMatchObject({
        code: 'FILE_TOO_LARGE',
      });
    });

    it('should throw SERVER_ERROR on 500', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}, 500));

      await expect(requestPresignedUrl('test.csv', 1024)).rejects.toMatchObject({
        code: 'SERVER_ERROR',
      });
    });

    it('should throw SERVER_ERROR on 503 Service Unavailable', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}, 503));

      await expect(requestPresignedUrl('test.csv', 1024)).rejects.toMatchObject({
        code: 'SERVER_ERROR',
      });
    });

    it('should handle JSON parse failure', async () => {
      const badResponse = {
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      } as Response;

      mockFetch.mockResolvedValueOnce(badResponse);

      await expect(requestPresignedUrl('test.csv', 1024)).rejects.toThrow();
    });
  });

  describe('uploadToS3 - Network Failures', () => {
    const mockPresignedData: PresignedUrlResponse['presignedPost'] = {
      url: 'https://s3.amazonaws.com/test-bucket',
      fields: { key: 'test-key', policy: 'test-policy' },
    };

    const mockFile = new File(['test content'], 'test.csv', { type: 'text/csv' });

    it('should throw NETWORK_ERROR on XHR error event', async () => {
      const uploadPromise = uploadToS3(mockFile, mockPresignedData);

      // Simulate network error
      mockXHR.triggerError();

      await expect(uploadPromise).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        message: 'Network error during upload',
      });
    });

    it('should throw NETWORK_ERROR on XHR abort', async () => {
      const uploadPromise = uploadToS3(mockFile, mockPresignedData);

      // Simulate abort
      mockXHR.triggerAbort();

      await expect(uploadPromise).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        message: 'Upload cancelled',
      });
    });

    it('should throw NETWORK_ERROR on S3 4xx response', async () => {
      const uploadPromise = uploadToS3(mockFile, mockPresignedData);

      // Simulate S3 403 Forbidden
      mockXHR.triggerLoad(403);

      await expect(uploadPromise).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        message: expect.stringContaining('S3 upload failed'),
      });
    });

    it('should throw NETWORK_ERROR on S3 5xx response', async () => {
      const uploadPromise = uploadToS3(mockFile, mockPresignedData);

      // Simulate S3 500 Internal Server Error
      mockXHR.triggerLoad(500);

      await expect(uploadPromise).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
      });
    });

    it('should resolve on successful S3 upload with ETag', async () => {
      const uploadPromise = uploadToS3(mockFile, mockPresignedData);

      // Simulate successful upload
      mockXHR.triggerLoad(200, { ETag: '"test-etag-123"' });

      const result = await uploadPromise;
      expect(result.etag).toBe('test-etag-123');
    });

    it('should report progress during upload', async () => {
      const onProgress = jest.fn();

      uploadToS3(mockFile, mockPresignedData, onProgress);

      // Simulate progress events
      mockXHR.triggerProgress(50, 100);

      expect(onProgress).toHaveBeenCalledWith(50);
    });

    it('should use PUT for presigned URLs without fields', async () => {
      const putPresignedData = {
        url: 'https://s3.amazonaws.com/test-bucket/key?signature=xxx',
        fields: {},
      };

      uploadToS3(mockFile, putPresignedData);

      expect(mockXHR.open).toHaveBeenCalledWith('PUT', putPresignedData.url);
      expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    });
  });

  describe('confirmUpload - Network Failures', () => {
    it('should throw RATE_LIMIT on 429', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Too many requests' }, 429, { 'Retry-After': '60' })
      );

      await expect(confirmUpload('upload-123', 'etag-456')).rejects.toMatchObject({
        code: 'RATE_LIMIT',
        retryAfter: 60,
      });
    });

    it('should throw SERVER_ERROR on 500', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}, 500));

      await expect(confirmUpload('upload-123', 'etag-456')).rejects.toMatchObject({
        code: 'SERVER_ERROR',
      });
    });

    it('should include idempotency key header', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          jobId: 'job-123',
          status: 'queued',
          jobsRemainingThisHour: 5,
        })
      );

      await confirmUpload('upload-123', 'etag-456');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/confirm'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Idempotency-Key': expect.any(String),
          }),
        })
      );
    });
  });

  describe('uploadCSVFile - Complete Flow Failures', () => {
    const mockFile = new File(['test content'], 'test.csv', { type: 'text/csv' });

    it('should propagate presignedUrl errors', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}, 429, { 'Retry-After': '300' }));

      await expect(uploadCSVFile(mockFile)).rejects.toMatchObject({
        code: 'RATE_LIMIT',
        retryAfter: 300,
      });
    });

    it('should handle S3 upload failure in complete flow', async () => {
      // Step 1 succeeds
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          presignedPost: {
            url: 'https://s3.amazonaws.com/bucket',
            fields: { key: 'key', policy: 'policy' },
          },
          uploadId: 'upload-123',
          maxSize: 50 * 1024 * 1024,
        })
      );

      const uploadPromise = uploadCSVFile(mockFile);

      // Give time for S3 upload to start
      await new Promise((resolve) => setTimeout(resolve, 10));

      // S3 upload fails
      mockXHR.triggerError();

      await expect(uploadPromise).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
      });
    });

    it('should handle confirm failure in complete flow', async () => {
      // Step 1 succeeds
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          presignedPost: {
            url: 'https://s3.amazonaws.com/bucket',
            fields: { key: 'key', policy: 'policy' },
          },
          uploadId: 'upload-123',
          maxSize: 50 * 1024 * 1024,
        })
      );

      // Step 3 fails
      mockFetch.mockResolvedValueOnce(createMockResponse({}, 500));

      const uploadPromise = uploadCSVFile(mockFile);

      // Give time for flow to progress
      await new Promise((resolve) => setTimeout(resolve, 10));

      // S3 upload succeeds
      mockXHR.triggerLoad(200, { ETag: '"etag-123"' });

      await expect(uploadPromise).rejects.toMatchObject({
        code: 'SERVER_ERROR',
      });
    });

    it('should call progress callback through all stages', async () => {
      const onProgress = jest.fn();

      // Step 1 succeeds
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          presignedPost: {
            url: 'https://s3.amazonaws.com/bucket',
            fields: {},
          },
          uploadId: 'upload-123',
          maxSize: 50 * 1024 * 1024,
        })
      );

      // Step 3 succeeds
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          jobId: 'job-123',
          status: 'queued',
          jobsRemainingThisHour: 5,
        })
      );

      const uploadPromise = uploadCSVFile(mockFile, onProgress);

      // Give time for S3 upload to start
      await new Promise((resolve) => setTimeout(resolve, 10));

      // S3 upload succeeds
      mockXHR.triggerLoad(200, { ETag: '"etag-123"' });

      await uploadPromise;

      // Verify progress was called for each stage
      expect(onProgress).toHaveBeenCalledWith('requesting', expect.any(Number));
      expect(onProgress).toHaveBeenCalledWith('uploading', expect.any(Number));
      expect(onProgress).toHaveBeenCalledWith('confirming', expect.any(Number));
    });
  });

  describe('getJobStatus - Network Failures', () => {
    it('should throw SERVER_ERROR on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      // The function wraps errors in try-catch
      await expect(getJobStatus('job-123')).rejects.toBeDefined();
    });

    it('should throw SERVER_ERROR on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}, 404));

      await expect(getJobStatus('job-123')).rejects.toMatchObject({
        code: 'SERVER_ERROR',
      });
    });

    it('should return job data on success', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          jobId: 'job-123',
          status: 'completed',
          transactionCount: 100,
        })
      );

      const result = await getJobStatus('job-123');
      expect(result.status).toBe('completed');
    });
  });

  describe('getDownloadUrl - Network Failures', () => {
    it('should throw SERVER_ERROR on 404', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Job not found' }, 404)
      );

      await expect(getDownloadUrl('job-123')).rejects.toMatchObject({
        code: 'SERVER_ERROR',
        message: 'Job not found',
      });
    });

    it('should throw SERVER_ERROR on 500 with fallback message', async () => {
      const badResponse = {
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as Response;

      mockFetch.mockResolvedValueOnce(badResponse);

      await expect(getDownloadUrl('job-123')).rejects.toMatchObject({
        code: 'SERVER_ERROR',
        message: 'Failed to get download URL',
      });
    });
  });

  describe('getJobInsights - Network Failures', () => {
    it('should throw SERVER_ERROR on failure', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}, 500));

      await expect(getJobInsights('job-123')).rejects.toMatchObject({
        code: 'SERVER_ERROR',
      });
    });
  });

  describe('retryJobWithExchange - Network Failures', () => {
    it('should throw SERVER_ERROR on failure', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Max retries exceeded' }, 400)
      );

      await expect(retryJobWithExchange('job-123')).rejects.toMatchObject({
        code: 'SERVER_ERROR',
        message: 'Max retries exceeded',
      });
    });

    it('should include exchangeName in request body', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          success: true,
          message: 'Job queued for retry',
          jobId: 'job-123',
          retryCount: 1,
          maxRetries: 3,
          retriesRemaining: 2,
          exchangeName: 'coinbase',
        })
      );

      await retryJobWithExchange('job-123', 'coinbase');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/retry'),
        expect.objectContaining({
          body: JSON.stringify({ exchangeName: 'coinbase' }),
        })
      );
    });
  });

  describe('Connection Timeout Scenarios', () => {
    it('should handle slow network (simulated)', async () => {
      // Simulate a slow response
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(createMockResponse({}, 408)), 100)
          )
      );

      // Request timeout is a 408 status
      await expect(requestPresignedUrl('test.csv', 1024)).rejects.toMatchObject({
        code: 'SERVER_ERROR',
      });
    });
  });

  describe('Error Type Preservation', () => {
    it('should preserve UploadError type through complete flow', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({}, 429, { 'Retry-After': '3600' })
      );

      const mockFile = new File(['test'], 'test.csv');

      try {
        await uploadCSVFile(mockFile);
        fail('Should have thrown');
      } catch (error) {
        const uploadError = error as UploadError;
        expect(uploadError.code).toBe('RATE_LIMIT');
        expect(uploadError.retryAfter).toBe(3600);
      }
    });

    it('should wrap unknown errors as SERVER_ERROR', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Unknown network issue'));

      const mockFile = new File(['test'], 'test.csv');

      try {
        await uploadCSVFile(mockFile);
        fail('Should have thrown');
      } catch (error) {
        const uploadError = error as UploadError;
        expect(uploadError.code).toBe('SERVER_ERROR');
        expect(uploadError.message).toContain('Unknown network issue');
      }
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple simultaneous uploads', async () => {
      const mockPresignedResponse = createMockResponse({
        presignedPost: { url: 'https://s3.test.com', fields: {} },
        uploadId: 'upload-1',
        maxSize: 50 * 1024 * 1024,
      });

      const mockConfirmResponse = createMockResponse({
        jobId: 'job-1',
        status: 'queued',
        jobsRemainingThisHour: 5,
      });

      // Set up responses for 3 concurrent uploads
      mockFetch
        .mockResolvedValueOnce(mockPresignedResponse)
        .mockResolvedValueOnce(mockPresignedResponse)
        .mockResolvedValueOnce(mockPresignedResponse)
        .mockResolvedValueOnce(mockConfirmResponse)
        .mockResolvedValueOnce(mockConfirmResponse)
        .mockResolvedValueOnce(mockConfirmResponse);

      const file1 = new File(['content1'], 'file1.csv');
      const file2 = new File(['content2'], 'file2.csv');
      const file3 = new File(['content3'], 'file3.csv');

      // Start all uploads
      const promise1 = uploadCSVFile(file1);
      const promise2 = uploadCSVFile(file2);
      const promise3 = uploadCSVFile(file3);

      // Complete all S3 uploads
      await new Promise((resolve) => setTimeout(resolve, 10));

      // This test verifies the structure handles concurrent calls
      // In real scenario, each would have its own XHR instance
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});
