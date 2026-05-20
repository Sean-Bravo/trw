/**
 * Tests for the H-4 CSRF middleware.
 */

jest.mock('next/server', () => {
  class FakeNextResponse {
    status: number;
    body: any;
    constructor(status: number, body: any) {
      this.status = status;
      this.body = body;
    }
  }
  return {
    NextResponse: {
      next: () => new FakeNextResponse(200, null),
      json: (body: any, init?: { status?: number }) =>
        new FakeNextResponse(init?.status ?? 200, body),
    },
  };
});

import { middleware } from '@/middleware';

function makeRequest({
  method = 'GET',
  pathname = '/api/jobs',
  origin,
  referer,
}: {
  method?: string;
  pathname?: string;
  origin?: string | null;
  referer?: string | null;
}): any {
  const headers = new Headers();
  if (origin !== undefined && origin !== null) headers.set('origin', origin);
  if (referer !== undefined && referer !== null) headers.set('referer', referer);

  return {
    method,
    headers,
    nextUrl: { pathname },
  };
}

describe('CSRF middleware (H-4)', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_APP_URL: 'https://taxformatter.com' };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('Non-API routes', () => {
    it('passes through non-API requests', () => {
      const res = middleware(makeRequest({ method: 'POST', pathname: '/dashboard' }));
      expect(res.status).not.toBe(403);
    });
  });

  describe('Read methods (GET/HEAD/OPTIONS)', () => {
    it('passes through GET to API without origin check', () => {
      const res = middleware(
        makeRequest({ method: 'GET', pathname: '/api/jobs', origin: 'https://evil.com' }),
      );
      expect(res.status).not.toBe(403);
    });
  });

  describe('State-changing methods', () => {
    it('allows POST when origin matches', () => {
      const res = middleware(
        makeRequest({
          method: 'POST',
          pathname: '/api/jobs',
          origin: 'https://taxformatter.com',
        }),
      );
      expect(res.status).not.toBe(403);
    });

    it('rejects POST with foreign origin', () => {
      const res = middleware(
        makeRequest({
          method: 'POST',
          pathname: '/api/jobs',
          origin: 'https://evil.com',
        }),
      );
      expect(res.status).toBe(403);
    });

    it('rejects DELETE with foreign origin', () => {
      const res = middleware(
        makeRequest({
          method: 'DELETE',
          pathname: '/api/uploads/abc',
          origin: 'https://evil.com',
        }),
      );
      expect(res.status).toBe(403);
    });

    it('rejects POST with no origin and no referer', () => {
      const res = middleware(makeRequest({ method: 'POST', pathname: '/api/jobs' }));
      expect(res.status).toBe(403);
    });

    it('falls back to referer when origin missing', () => {
      const res = middleware(
        makeRequest({
          method: 'POST',
          pathname: '/api/jobs',
          referer: 'https://taxformatter.com/dashboard',
        }),
      );
      expect(res.status).not.toBe(403);
    });

    it('rejects when referer is foreign and origin missing', () => {
      const res = middleware(
        makeRequest({
          method: 'POST',
          pathname: '/api/jobs',
          referer: 'https://evil.com/csrf',
        }),
      );
      expect(res.status).toBe(403);
    });
  });

  describe('Exempt paths', () => {
    it('allows webhook POST without origin (Stripe)', () => {
      const res = middleware(
        makeRequest({ method: 'POST', pathname: '/api/webhooks/stripe' }),
      );
      expect(res.status).not.toBe(403);
    });

    it('allows NextAuth POST without origin', () => {
      const res = middleware(
        makeRequest({ method: 'POST', pathname: '/api/auth/callback/credentials' }),
      );
      expect(res.status).not.toBe(403);
    });

    it.each([
      '/api/auth/session',
      '/api/auth/csrf',
      '/api/auth/signin',
      '/api/auth/signin/google',
      '/api/auth/signout',
      '/api/auth/callback/credentials',
    ])('exempts NextAuth core path %s', (pathname) => {
      const res = middleware(makeRequest({ method: 'POST', pathname }));
      expect(res.status).not.toBe(403);
    });
  });

  // Regression: a blanket /api/auth/ exemption left custom auth routes
  // (2fa/disable, register, reset-password, …) forgeable cross-site.
  describe('Custom /api/auth/* routes are NOT exempt (CSRF regression)', () => {
    it.each([
      '/api/auth/2fa/disable',
      '/api/auth/2fa/setup',
      '/api/auth/2fa/regenerate-codes',
      '/api/auth/register',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/auth/resend-code',
      '/api/auth/verify',
    ])('rejects POST to %s with a foreign origin', (pathname) => {
      const res = middleware(
        makeRequest({ method: 'POST', pathname, origin: 'https://evil.com' }),
      );
      expect(res.status).toBe(403);
    });

    it('still allows a custom auth POST from the app origin', () => {
      const res = middleware(
        makeRequest({
          method: 'POST',
          pathname: '/api/auth/2fa/disable',
          origin: 'https://taxformatter.com',
        }),
      );
      expect(res.status).not.toBe(403);
    });
  });
});
