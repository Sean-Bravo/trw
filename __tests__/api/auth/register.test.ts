/**
 * Tests for /api/auth/register route
 */

import { POST } from '@/app/api/auth/register/route';
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

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementations
    mockAuthDb.emailExists.mockResolvedValue(false);
    mockAuthDb.createUser.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: false,
      subscriptionTier: 'free',
      passwordHash: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockEmail.generateVerificationCode.mockReturnValue('123456');
    mockEmail.sendVerificationEmail.mockResolvedValue({ success: true });
    (mockRateLimit.rateLimiters.auth.check as jest.Mock).mockResolvedValue({ success: true });
  });

  describe('Successful Registration', () => {
    it('creates a new user with valid data', async () => {
      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe('test@example.com');
      expect(data.requiresVerification).toBe(true);
    });

    it('creates user without name (optional)', async () => {
      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123!',
      });

      const response = await POST(request as any);

      expect(response.status).toBe(201);
      expect(mockAuthDb.createUser).toHaveBeenCalledWith(
        'test@example.com',
        'Password123!',
        undefined,
        '123456'
      );
    });

    it('sends verification email', async () => {
      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test',
      });

      await POST(request as any);

      expect(mockEmail.sendVerificationEmail).toHaveBeenCalledWith(
        'test@example.com',
        '123456',
        'Test'
      );
    });

    it('returns message about verification', async () => {
      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123!',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(data.message).toContain('verification');
    });
  });

  describe('Email Validation', () => {
    it('rejects invalid email format', async () => {
      const request = createMockRequest({
        email: 'invalid-email',
        password: 'Password123!',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('email');
    });

    it('rejects empty email', async () => {
      const request = createMockRequest({
        email: '',
        password: 'Password123!',
      });

      const response = await POST(request as any);

      expect(response.status).toBe(400);
    });

    it('normalizes email to lowercase', async () => {
      const request = createMockRequest({
        email: 'TEST@EXAMPLE.COM',
        password: 'Password123!',
      });

      await POST(request as any);

      expect(mockAuthDb.createUser).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
        undefined,
        expect.any(String)
      );
    });
  });

  describe('Password Validation', () => {
    it('rejects weak password (no uppercase)', async () => {
      const request = createMockRequest({
        email: 'test@example.com',
        password: 'password123!',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Password');
    });

    it('rejects short password', async () => {
      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Pass1!',
      });

      const response = await POST(request as any);

      expect(response.status).toBe(400);
    });

    it('rejects password without number', async () => {
      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password!!!',
      });

      const response = await POST(request as any);

      expect(response.status).toBe(400);
    });
  });

  describe('Duplicate User', () => {
    it('rejects registration if user exists', async () => {
      mockAuthDb.emailExists.mockResolvedValue(true);

      const request = createMockRequest({
        email: 'existing@example.com',
        password: 'Password123!',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('exists');
    });
  });

  describe('Rate Limiting', () => {
    it('returns 429 when rate limited', async () => {
      (mockRateLimit.rateLimiters.auth.check as jest.Mock).mockResolvedValue({ success: false });

      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123!',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many');
    });

    it('checks rate limit with client identifier', async () => {
      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123!',
      });

      await POST(request as any);

      expect(mockRateLimit.getClientIdentifier).toHaveBeenCalled();
      expect(mockRateLimit.rateLimiters.auth.check).toHaveBeenCalledWith('test-ip');
    });
  });

  describe('Email Sending Failure', () => {
    it('still creates user if email fails', async () => {
      mockEmail.sendVerificationEmail.mockResolvedValue({
        success: false,
        error: 'SMTP error',
      });

      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123!',
      });

      const response = await POST(request as any);

      expect(response.status).toBe(201);
      expect(mockAuthDb.createUser).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('returns 500 on database error', async () => {
      mockAuthDb.createUser.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123!',
      });

      const response = await POST(request as any);

      expect(response.status).toBe(500);
    });

    it('returns 500 on unexpected error', async () => {
      mockAuthDb.emailExists.mockRejectedValue(new Error('Unexpected'));

      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123!',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Response Format', () => {
    it('returns user object without sensitive data', async () => {
      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123!',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(data.user).not.toHaveProperty('passwordHash');
      expect(data.user).not.toHaveProperty('password');
      expect(data.user).toHaveProperty('id');
      expect(data.user).toHaveProperty('email');
    });
  });
});
