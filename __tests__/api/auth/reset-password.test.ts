/**
 * Tests for /api/auth/reset-password route
 */

import { GET, POST } from '@/app/api/auth/reset-password/route';
import { createMockRequest } from '../../utils/mock-request';
import * as authDb from '@/lib/auth-db';

// Mock dependencies
jest.mock('@/lib/auth-db');

const mockAuthDb = authDb as jest.Mocked<typeof authDb>;

// Helper to create a mock GET request with query params
function createMockGetRequest(token: string | null) {
  const url = token
    ? `http://localhost/api/auth/reset-password?token=${token}`
    : 'http://localhost/api/auth/reset-password';

  return {
    url,
    json: () => Promise.resolve({}),
    headers: {
      get: () => null,
    },
  };
}

describe('/api/auth/reset-password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET - Verify Token', () => {
    it('returns valid for correct token', async () => {
      mockAuthDb.verifyResetToken.mockResolvedValue({
        success: true,
        email: 'test@example.com',
      });

      const request = createMockGetRequest('valid-token');

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.valid).toBe(true);
      expect(data.email).toBe('test@example.com');
    });

    it('returns invalid for expired token', async () => {
      mockAuthDb.verifyResetToken.mockResolvedValue({
        success: false,
        error: 'Token expired',
      });

      const request = createMockGetRequest('expired-token');

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.valid).toBe(false);
      expect(data.error).toContain('expired');
    });

    it('returns invalid for missing token', async () => {
      const request = createMockGetRequest(null);

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.valid).toBe(false);
    });

    it('returns invalid for empty token', async () => {
      const request = createMockGetRequest('');

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.valid).toBe(false);
    });

    it('returns 500 on database error', async () => {
      mockAuthDb.verifyResetToken.mockRejectedValue(new Error('Database error'));

      const request = createMockGetRequest('valid-token');

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.valid).toBe(false);
    });
  });

  describe('POST - Reset Password', () => {
    it('resets password successfully', async () => {
      mockAuthDb.resetPassword.mockResolvedValue({
        success: true,
      });

      const request = createMockRequest({
        token: 'valid-token',
        password: 'NewPassword123!',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('reset');
    });

    it('calls resetPassword with correct params', async () => {
      mockAuthDb.resetPassword.mockResolvedValue({
        success: true,
      });

      const request = createMockRequest({
        token: 'test-token',
        password: 'SecurePass123!',
      });

      await POST(request as any);

      expect(mockAuthDb.resetPassword).toHaveBeenCalledWith('test-token', 'SecurePass123!');
    });

    it('rejects invalid token', async () => {
      mockAuthDb.resetPassword.mockResolvedValue({
        success: false,
        error: 'Invalid or expired reset token',
      });

      const request = createMockRequest({
        token: 'invalid-token',
        password: 'NewPassword123!',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid');
    });

    it('rejects short password', async () => {
      const request = createMockRequest({
        token: 'valid-token',
        password: 'Short1',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('8 characters');
    });

    it('rejects missing token', async () => {
      const request = createMockRequest({
        password: 'NewPassword123!',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('rejects missing password', async () => {
      const request = createMockRequest({
        token: 'valid-token',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('returns 500 on database error', async () => {
      mockAuthDb.resetPassword.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest({
        token: 'valid-token',
        password: 'NewPassword123!',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('wrong');
    });
  });
});
