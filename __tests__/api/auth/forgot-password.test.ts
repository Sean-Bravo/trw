/**
 * Tests for /api/auth/forgot-password route
 */

import { POST } from '@/app/api/auth/forgot-password/route';
import { createMockRequest } from '../../utils/mock-request';
import * as authDb from '@/lib/auth-db';
import * as email from '@/lib/email';
import * as rateLimit from '@/lib/rate-limit';

// Mock dependencies
jest.mock('@/lib/auth-db');
jest.mock('@/lib/email');
jest.mock('@/lib/rate-limit', () => ({
  rateLimiters: {
    auth: {
      check: jest.fn().mockResolvedValue({ success: true }),
    },
  },
  getClientIdentifier: jest.fn().mockReturnValue('test-ip'),
}));

const mockAuthDb = authDb as jest.Mocked<typeof authDb>;
const mockEmail = email as jest.Mocked<typeof email>;
const mockRateLimit = rateLimit as jest.Mocked<typeof rateLimit>;

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env['NEXTAUTH_URL'] = 'http://localhost:3000';
    mockAuthDb.createPasswordResetToken.mockResolvedValue({ token: 'reset-token-123' });
    mockAuthDb.findUserByEmail.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: true,
      subscriptionTier: 'free',
      passwordHash: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockEmail.sendPasswordResetEmail.mockResolvedValue({ success: true });
    (mockRateLimit.rateLimiters.auth.check as jest.Mock).mockResolvedValue({ success: true });
  });

  describe('Successful Request', () => {
    it('returns success for valid email', async () => {
      const request = createMockRequest({ email: 'test@example.com' });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('sends password reset email', async () => {
      const request = createMockRequest({ email: 'test@example.com' });

      await POST(request as any);

      expect(mockEmail.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringContaining('reset-token-123'),
        'Test User'
      );
    });

    it('includes correct reset URL in email', async () => {
      const request = createMockRequest({ email: 'test@example.com' });

      await POST(request as any);

      expect(mockEmail.sendPasswordResetEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('http://localhost:3000/reset-password?token='),
        expect.any(String)
      );
    });

    it('creates password reset token', async () => {
      const request = createMockRequest({ email: 'test@example.com' });

      await POST(request as any);

      expect(mockAuthDb.createPasswordResetToken).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('Email Enumeration Prevention', () => {
    it('returns success even if user does not exist', async () => {
      mockAuthDb.createPasswordResetToken.mockResolvedValue({ token: null });

      const request = createMockRequest({ email: 'nonexistent@example.com' });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('does not send email if user does not exist', async () => {
      mockAuthDb.createPasswordResetToken.mockResolvedValue({ token: null });

      const request = createMockRequest({ email: 'nonexistent@example.com' });

      await POST(request as any);

      expect(mockEmail.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('returns same message for existing and non-existing users', async () => {
      const existingRequest = createMockRequest({ email: 'existing@example.com' });
      const nonExistingRequest = createMockRequest({ email: 'nonexistent@example.com' });

      mockAuthDb.createPasswordResetToken.mockResolvedValueOnce({ token: 'token' });
      const response1 = await POST(existingRequest as any);
      const data1 = await response1.json();

      mockAuthDb.createPasswordResetToken.mockResolvedValueOnce({ token: null });
      const response2 = await POST(nonExistingRequest as any);
      const data2 = await response2.json();

      expect(data1.message).toBe(data2.message);
    });
  });

  describe('Email Validation', () => {
    it('rejects invalid email format', async () => {
      const request = createMockRequest({ email: 'invalid-email' });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('rejects empty email', async () => {
      const request = createMockRequest({ email: '' });

      const response = await POST(request as any);

      expect(response.status).toBe(400);
    });

    it('rejects missing email', async () => {
      const request = createMockRequest({});

      const response = await POST(request as any);

      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    it('returns 429 when rate limited', async () => {
      (mockRateLimit.rateLimiters.auth.check as jest.Mock).mockResolvedValue({ success: false });

      const request = createMockRequest({ email: 'test@example.com' });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many');
    });

    it('checks rate limit before processing', async () => {
      (mockRateLimit.rateLimiters.auth.check as jest.Mock).mockResolvedValue({ success: false });

      const request = createMockRequest({ email: 'test@example.com' });

      await POST(request as any);

      expect(mockAuthDb.createPasswordResetToken).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('returns 500 on database error', async () => {
      mockAuthDb.createPasswordResetToken.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest({ email: 'test@example.com' });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('wrong');
    });

    it('handles email sending failure gracefully', async () => {
      mockEmail.sendPasswordResetEmail.mockRejectedValue(new Error('SMTP error'));

      const request = createMockRequest({ email: 'test@example.com' });

      const response = await POST(request as any);

      // Should still return 500 since email sending is in try block
      expect(response.status).toBe(500);
    });
  });

  describe('Response Format', () => {
    it('includes helpful message', async () => {
      const request = createMockRequest({ email: 'test@example.com' });

      const response = await POST(request as any);
      const data = await response.json();

      expect(data.message).toContain('account exists');
      expect(data.message).toContain('password reset');
    });
  });
});
