/**
 * Tests for /api/auth/verify route
 */

import { POST } from '@/app/api/auth/verify/route';
import { createMockRequest } from '../../utils/mock-request';
import * as authDb from '@/lib/auth-db';

// Mock dependencies
jest.mock('@/lib/auth-db');

const mockAuthDb = authDb as jest.Mocked<typeof authDb>;

describe('POST /api/auth/verify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
          subscriptionTier: 'free',
          passwordHash: 'hash',
          createdAt: new Date(),
          updatedAt: new Date(),
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
          subscriptionTier: 'free',
          passwordHash: 'hash',
          createdAt: new Date(),
          updatedAt: new Date(),
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
          subscriptionTier: 'free',
          passwordHash: 'secret-hash',
          createdAt: new Date(),
          updatedAt: new Date(),
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
      expect(data.user).toHaveProperty('subscriptionTier');
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
});
