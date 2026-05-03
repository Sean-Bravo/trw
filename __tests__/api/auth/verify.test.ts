/**
 * Tests for /api/auth/verify route
 */

import { POST } from '@/app/api/auth/verify/route';
import { createMockRequest } from '../../utils/mock-request';
import * as authDb from '@/lib/auth-db';
import * as rateLimit from '@/lib/rate-limit';

// Mock dependencies
jest.mock('@/lib/auth-db');
jest.mock('@/lib/rate-limit', () => ({
  rateLimiters: {
    auth: {
      check: jest.fn().mockResolvedValue({ success: true }),
    },
  },
  getClientIdentifier: jest.fn().mockReturnValue('test-ip'),
}));
// Phase 4 (v3): verify route auto-provisions a free API key.
jest.mock('@/lib/api-keys', () => ({
  createApiKey: jest.fn().mockResolvedValue({ key: 'tf_live_xxx', id: 'key-1', prefix: 'xxx' }),
}));
jest.mock('@/lib/db', () => ({
  query: jest.fn().mockResolvedValue([{ count: '0' }]),
}));

const mockAuthDb = authDb as jest.Mocked<typeof authDb>;
const mockRateLimit = rateLimit as jest.Mocked<typeof rateLimit>;
import * as apiKeys from '@/lib/api-keys';
import * as db from '@/lib/db';
const mockCreateApiKey = apiKeys.createApiKey as jest.Mock;
const mockQuery = db.query as jest.Mock;

describe('POST /api/auth/verify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockRateLimit.rateLimiters.auth.check as jest.Mock).mockResolvedValue({ success: true });
    // Default: user has no existing keys, so auto-provision will fire.
    mockQuery.mockResolvedValue([{ count: '0' }]);
    mockCreateApiKey.mockResolvedValue({ key: 'tf_live_xxx', id: 'key-1', prefix: 'xxx' });
  });

  describe('Successful Verification', () => {
    it('verifies valid email and code', async () => {
      mockAuthDb.verifyEmailCode.mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
          createdAt: new Date(),
        },
      });

      const request = createMockRequest({
        email: 'test@example.com',
        code: '123456',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.emailVerified).toBe(true);
    });

    it('returns success message', async () => {
      mockAuthDb.verifyEmailCode.mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          emailVerified: true,
          createdAt: new Date(),
        },
      });

      const request = createMockRequest({
        email: 'test@example.com',
        code: '123456',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(data.message).toContain('verified');
    });
  });

  describe('Email Validation', () => {
    it('rejects invalid email format', async () => {
      const request = createMockRequest({
        email: 'invalid-email',
        code: '123456',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('email');
    });

    it('rejects empty email', async () => {
      const request = createMockRequest({
        email: '',
        code: '123456',
      });

      const response = await POST(request as any);

      expect(response.status).toBe(400);
    });
  });

  describe('Code Validation', () => {
    it('rejects non-6-digit code', async () => {
      const request = createMockRequest({
        email: 'test@example.com',
        code: '12345', // Only 5 digits
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('code');
    });

    it('rejects code with letters', async () => {
      const request = createMockRequest({
        email: 'test@example.com',
        code: '12345a',
      });

      const response = await POST(request as any);

      expect(response.status).toBe(400);
    });

    it('rejects empty code', async () => {
      const request = createMockRequest({
        email: 'test@example.com',
        code: '',
      });

      const response = await POST(request as any);

      expect(response.status).toBe(400);
    });

    it('rejects missing code', async () => {
      const request = createMockRequest({
        email: 'test@example.com',
      });

      const response = await POST(request as any);

      expect(response.status).toBe(400);
    });

    it('rejects code longer than 6 digits', async () => {
      const request = createMockRequest({
        email: 'test@example.com',
        code: '1234567',
      });

      const response = await POST(request as any);

      expect(response.status).toBe(400);
    });
  });

  describe('Verification Failure', () => {
    it('returns error for invalid code', async () => {
      mockAuthDb.verifyEmailCode.mockResolvedValue({
        success: false,
        error: 'Invalid verification code',
      });

      const request = createMockRequest({
        email: 'test@example.com',
        code: '000000',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid');
    });

    it('returns error for expired code', async () => {
      mockAuthDb.verifyEmailCode.mockResolvedValue({
        success: false,
        error: 'Verification code expired',
      });

      const request = createMockRequest({
        email: 'test@example.com',
        code: '123456',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('expired');
    });

    it('returns generic error when no specific error', async () => {
      mockAuthDb.verifyEmailCode.mockResolvedValue({
        success: false,
      });

      const request = createMockRequest({
        email: 'test@example.com',
        code: '123456',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Verification failed');
    });
  });

  describe('Error Handling', () => {
    it('returns 500 on database error', async () => {
      mockAuthDb.verifyEmailCode.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest({
        email: 'test@example.com',
        code: '123456',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Response Format', () => {
    it('returns user without sensitive data', async () => {
      mockAuthDb.verifyEmailCode.mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test',
          emailVerified: true,
          createdAt: new Date(),
        },
      });

      const request = createMockRequest({
        email: 'test@example.com',
        code: '123456',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(data.user).not.toHaveProperty('passwordHash');
      expect(data.user).toHaveProperty('id');
      expect(data.user).toHaveProperty('email');
    });

    it('handles missing user in response', async () => {
      mockAuthDb.verifyEmailCode.mockResolvedValue({
        success: true,
        user: undefined,
      });

      const request = createMockRequest({
        email: 'test@example.com',
        code: '123456',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeUndefined();
    });
  });

  describe('Phase 4 (v3): auto-provision free API key on verify', () => {
    function successResult() {
      mockAuthDb.verifyEmailCode.mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test',
          emailVerified: true,
          createdAt: new Date(),
        },
      });
    }

    it('creates exactly one free API key after successful verification', async () => {
      successResult();
      mockQuery.mockResolvedValue([{ count: '0' }]);

      const request = createMockRequest({ email: 'test@example.com', code: '123456' });
      const response = await POST(request as any);

      expect(response.status).toBe(200);
      expect(mockCreateApiKey).toHaveBeenCalledTimes(1);
      expect(mockCreateApiKey).toHaveBeenCalledWith('user-123', 'Default key', 'free');
    });

    it('does NOT create a key on re-verify (user already has an active key)', async () => {
      successResult();
      mockQuery.mockResolvedValue([{ count: '1' }]); // already has 1 active key

      const request = createMockRequest({ email: 'test@example.com', code: '123456' });
      const response = await POST(request as any);

      expect(response.status).toBe(200);
      expect(mockCreateApiKey).not.toHaveBeenCalled();
    });

    it('still returns 200 even when createApiKey throws', async () => {
      successResult();
      mockQuery.mockResolvedValue([{ count: '0' }]);
      mockCreateApiKey.mockRejectedValue(new Error('DB unavailable'));

      const request = createMockRequest({ email: 'test@example.com', code: '123456' });
      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('does NOT create a key when verifyEmailCode returns no user', async () => {
      mockAuthDb.verifyEmailCode.mockResolvedValue({ success: true, user: undefined });

      const request = createMockRequest({ email: 'test@example.com', code: '123456' });
      await POST(request as any);

      expect(mockCreateApiKey).not.toHaveBeenCalled();
    });
  });

  describe('H-6: rate limiting', () => {
    it('returns 429 when rate limit exceeded', async () => {
      (mockRateLimit.rateLimiters.auth.check as jest.Mock).mockResolvedValue({ success: false });
      const request = createMockRequest({ email: 'test@example.com', code: '123456' });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many');
      expect(mockAuthDb.verifyEmailCode).not.toHaveBeenCalled();
    });
  });
});
