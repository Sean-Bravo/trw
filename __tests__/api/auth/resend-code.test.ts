/**
 * Tests for /api/auth/resend-code route
 */

import { POST } from '@/app/api/auth/resend-code/route';
import { createMockRequest } from '../../utils/mock-request';
import * as authDb from '@/lib/auth-db';
import * as email from '@/lib/email';

// Mock dependencies
jest.mock('@/lib/auth-db');
jest.mock('@/lib/email');

const mockAuthDb = authDb as jest.Mocked<typeof authDb>;
const mockEmail = email as jest.Mocked<typeof email>;

describe('POST /api/auth/resend-code', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthDb.isEmailVerified.mockResolvedValue(false);
    mockAuthDb.findUserByEmail.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: false,
      subscriptionTier: 'free',
      passwordHash: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockAuthDb.updateVerificationCode.mockResolvedValue({ success: true });
    mockEmail.generateVerificationCode.mockReturnValue('654321');
    mockEmail.sendVerificationEmail.mockResolvedValue({ success: true });
  });

  describe('Successful Resend', () => {
    it('resends verification code successfully', async () => {
      const request = createMockRequest({ email: 'test@example.com' });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('sent');
    });

    it('generates new verification code', async () => {
      const request = createMockRequest({ email: 'test@example.com' });

      await POST(request as any);

      expect(mockEmail.generateVerificationCode).toHaveBeenCalled();
    });

    it('updates code in database', async () => {
      const request = createMockRequest({ email: 'test@example.com' });

      await POST(request as any);

      expect(mockAuthDb.updateVerificationCode).toHaveBeenCalledWith(
        'test@example.com',
        '654321'
      );
    });

    it('sends verification email with new code', async () => {
      const request = createMockRequest({ email: 'test@example.com' });

      await POST(request as any);

      expect(mockEmail.sendVerificationEmail).toHaveBeenCalledWith(
        'test@example.com',
        '654321',
        'Test User'
      );
    });
  });

  describe('Email Validation', () => {
    it('rejects invalid email format', async () => {
      const request = createMockRequest({ email: 'invalid-email' });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('email');
    });

    it('rejects empty email', async () => {
      const request = createMockRequest({ email: '' });

      const response = await POST(request as any);

      expect(response.status).toBe(400);
    });
  });

  describe('Already Verified', () => {
    it('rejects if already verified', async () => {
      mockAuthDb.isEmailVerified.mockResolvedValue(true);

      const request = createMockRequest({ email: 'verified@example.com' });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('already verified');
    });

    it('does not send email if already verified', async () => {
      mockAuthDb.isEmailVerified.mockResolvedValue(true);

      const request = createMockRequest({ email: 'verified@example.com' });

      await POST(request as any);

      expect(mockEmail.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe('Non-existent User', () => {
    it('returns success for non-existent user (security)', async () => {
      mockAuthDb.findUserByEmail.mockResolvedValue(null);

      const request = createMockRequest({ email: 'nonexistent@example.com' });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('does not send email if user does not exist', async () => {
      mockAuthDb.findUserByEmail.mockResolvedValue(null);

      const request = createMockRequest({ email: 'nonexistent@example.com' });

      await POST(request as any);

      expect(mockEmail.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe('Code Update Failure', () => {
    it('returns error if code update fails', async () => {
      mockAuthDb.updateVerificationCode.mockResolvedValue({
        success: false,
        error: 'Failed to update code',
      });

      const request = createMockRequest({ email: 'test@example.com' });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe('Email Sending Failure', () => {
    it('returns error if email fails to send', async () => {
      mockEmail.sendVerificationEmail.mockResolvedValue({
        success: false,
        error: 'SMTP error',
      });

      const request = createMockRequest({ email: 'test@example.com' });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed');
    });
  });

  describe('Error Handling', () => {
    it('returns 500 on database error', async () => {
      mockAuthDb.isEmailVerified.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest({ email: 'test@example.com' });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
