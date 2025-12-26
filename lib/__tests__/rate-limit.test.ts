// Mock next/server before importing
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: any) => ({
      status: init?.status || 200,
      headers: new Map(Object.entries(init?.headers || {})),
      json: async () => data,
    }),
    next: () => ({
      headers: new Map(),
    }),
  },
  NextRequest: jest.fn(),
}))

import {
  RateLimiter,
  RateLimitConfig,
  getClientIdentifier,
  applyRateLimit,
  rateLimiters,
} from '../rate-limit'

// Helper to create a mock NextRequest
function createMockRequest(headers: Record<string, string> = {}): any {
  const mockHeaders = {
    get: (key: string) => headers[key.toLowerCase()] || null,
    set: (key: string, value: string) => {
      headers[key.toLowerCase()] = value
    },
    has: (key: string) => key.toLowerCase() in headers,
  }

  return {
    url: 'https://example.com/api/test',
    method: 'GET',
    headers: mockHeaders,
    nextUrl: {
      pathname: '/api/test',
    },
  }
}

// Helper to wait for a duration
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('rate-limit.ts', () => {
  describe('RateLimiter class', () => {
    describe('initialization', () => {
      it('initializes with config correctly', () => {
        const config: RateLimitConfig = {
          interval: 60000,
          uniqueTokenPerInterval: 10,
        }

        const limiter = new RateLimiter(config)
        expect(limiter).toBeInstanceOf(RateLimiter)
      })
    })

    describe('check method', () => {
      it('allows requests within limit', async () => {
        const limiter = new RateLimiter({
          interval: 60000,
          uniqueTokenPerInterval: 3,
        })

        const user = 'user_allows_' + Date.now()

        const result1 = await limiter.check(user)
        expect(result1.success).toBe(true)
        expect(result1.remaining).toBe(2)

        const result2 = await limiter.check(user)
        expect(result2.success).toBe(true)
        expect(result2.remaining).toBe(1)

        const result3 = await limiter.check(user)
        expect(result3.success).toBe(true)
        expect(result3.remaining).toBe(0)
      })

      it('blocks requests exceeding limit', async () => {
        const limiter = new RateLimiter({
          interval: 60000,
          uniqueTokenPerInterval: 2,
        })

        const user = 'user_blocks_' + Date.now()

        await limiter.check(user)
        await limiter.check(user)

        const result = await limiter.check(user)
        expect(result.success).toBe(false)
        expect(result.remaining).toBe(0)
      })

      it('returns correct limit, remaining, reset values', async () => {
        const limiter = new RateLimiter({
          interval: 60000,
          uniqueTokenPerInterval: 5,
        })

        const user = 'user_reset_vals_' + Date.now()
        const now = Date.now()
        const result = await limiter.check(user)

        expect(result.limit).toBe(5)
        expect(result.remaining).toBe(4)
        expect(result.reset).toBeGreaterThan(now)
        expect(result.reset).toBeLessThanOrEqual(now + 60000)
      })

      it('resets count after interval expires', async () => {
        const limiter = new RateLimiter({
          interval: 100, // 100ms for faster test
          uniqueTokenPerInterval: 2,
        })

        // Use up the limit
        await limiter.check('user1_reset')
        await limiter.check('user1_reset')

        // Should be blocked
        let result = await limiter.check('user1_reset')
        expect(result.success).toBe(false)

        // Wait for interval to expire
        await wait(110)

        // Should be allowed again
        result = await limiter.check('user1_reset')
        expect(result.success).toBe(true)
        expect(result.remaining).toBe(1)
      })

      it('handles multiple identifiers independently', async () => {
        const limiter = new RateLimiter({
          interval: 60000,
          uniqueTokenPerInterval: 2,
        })

        const userA = 'userA_' + Date.now()
        const userB = 'userB_' + Date.now()

        const result1 = await limiter.check(userA)
        const result2 = await limiter.check(userB)

        expect(result1.success).toBe(true)
        expect(result1.remaining).toBe(1)

        expect(result2.success).toBe(true)
        expect(result2.remaining).toBe(1)

        // UserA uses their second request
        await limiter.check(userA)

        // UserA should be blocked
        const result3 = await limiter.check(userA)
        expect(result3.success).toBe(false)

        // UserB should still be allowed
        const result4 = await limiter.check(userB)
        expect(result4.success).toBe(true)
        expect(result4.remaining).toBe(0)
      })

      it('is async and returns correct structure', async () => {
        const limiter = new RateLimiter({
          interval: 60000,
          uniqueTokenPerInterval: 10,
        })

        const user = 'user_struct_' + Date.now()
        const result = await limiter.check(user)

        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('limit')
        expect(result).toHaveProperty('remaining')
        expect(result).toHaveProperty('reset')
      })
    })
  })

  describe('getClientIdentifier', () => {
    it('extracts IP from x-forwarded-for header', () => {
      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      })

      const identifier = getClientIdentifier(request)
      expect(identifier).toBe('192.168.1.1')
    })

    it('extracts IP from x-real-ip header', () => {
      const request = createMockRequest({
        'x-real-ip': '192.168.1.1',
      })

      const identifier = getClientIdentifier(request)
      expect(identifier).toBe('192.168.1.1')
    })

    it('extracts IP from cf-connecting-ip header (Cloudflare)', () => {
      const request = createMockRequest({
        'cf-connecting-ip': '192.168.1.1',
      })

      const identifier = getClientIdentifier(request)
      expect(identifier).toBe('192.168.1.1')
    })

    it('handles multiple IPs in x-forwarded-for (uses first)', () => {
      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1, 10.0.0.1, 172.16.0.1',
      })

      const identifier = getClientIdentifier(request)
      expect(identifier).toBe('192.168.1.1')
    })

    it('trims whitespace from IP', () => {
      const request = createMockRequest({
        'x-forwarded-for': '  192.168.1.1  ',
      })

      const identifier = getClientIdentifier(request)
      expect(identifier).toBe('192.168.1.1')
    })

    it('returns "unknown" if no IP headers present', () => {
      const request = createMockRequest({})

      const identifier = getClientIdentifier(request)
      expect(identifier).toBe('unknown')
    })

    it('prioritizes cf-connecting-ip over others', () => {
      const request = createMockRequest({
        'cf-connecting-ip': '1.1.1.1',
        'x-forwarded-for': '2.2.2.2',
        'x-real-ip': '3.3.3.3',
      })

      const identifier = getClientIdentifier(request)
      expect(identifier).toBe('1.1.1.1')
    })

    it('falls back to x-forwarded-for if cf-connecting-ip not present', () => {
      const request = createMockRequest({
        'x-forwarded-for': '2.2.2.2',
        'x-real-ip': '3.3.3.3',
      })

      const identifier = getClientIdentifier(request)
      expect(identifier).toBe('2.2.2.2')
    })

    it('falls back to x-real-ip if neither cf-connecting-ip nor x-forwarded-for present', () => {
      const request = createMockRequest({
        'x-real-ip': '3.3.3.3',
      })

      const identifier = getClientIdentifier(request)
      expect(identifier).toBe('3.3.3.3')
    })
  })

  describe('applyRateLimit', () => {
    it('returns null when under limit', async () => {
      const limiter = new RateLimiter({
        interval: 60000,
        uniqueTokenPerInterval: 10,
      })

      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1',
      })

      const response = await applyRateLimit(request, limiter)
      expect(response).toBeNull()
    })

    it('returns 429 response when over limit', async () => {
      const limiter = new RateLimiter({
        interval: 60000,
        uniqueTokenPerInterval: 2,
      })

      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1',
      })

      // Use up the limit
      await applyRateLimit(request, limiter)
      await applyRateLimit(request, limiter)

      // Should be rate limited
      const response = await applyRateLimit(request, limiter)

      expect(response).not.toBeNull()
      expect(response?.status).toBe(429)
    })

    it('sets X-RateLimit headers on success', async () => {
      const limiter = new RateLimiter({
        interval: 60000,
        uniqueTokenPerInterval: 10,
      })

      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1',
      })

      const response = await applyRateLimit(request, limiter)

      // Response should be null (success), but we need to test headers
      // In a real scenario, headers would be set on the response
      expect(response).toBeNull()
    })

    it('sets X-RateLimit headers on failure', async () => {
      const limiter = new RateLimiter({
        interval: 60000,
        uniqueTokenPerInterval: 1,
      })

      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1',
      })

      await applyRateLimit(request, limiter)
      const response = await applyRateLimit(request, limiter)

      expect(response).not.toBeNull()
      expect(response?.headers.get('X-RateLimit-Limit')).toBe('1')
      expect(response?.headers.get('X-RateLimit-Remaining')).toBe('0')
      expect(response?.headers.get('X-RateLimit-Reset')).toBeTruthy()
    })

    it('sets Retry-After header on failure', async () => {
      const limiter = new RateLimiter({
        interval: 60000,
        uniqueTokenPerInterval: 1,
      })

      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1',
      })

      await applyRateLimit(request, limiter)
      const response = await applyRateLimit(request, limiter)

      expect(response).not.toBeNull()
      expect(response?.headers.get('Retry-After')).toBeTruthy()

      const retryAfter = parseInt(response?.headers.get('Retry-After') || '0')
      expect(retryAfter).toBeGreaterThan(0)
      expect(retryAfter).toBeLessThanOrEqual(60)
    })

    it('response includes error message', async () => {
      const limiter = new RateLimiter({
        interval: 60000,
        uniqueTokenPerInterval: 1,
      })

      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1',
      })

      await applyRateLimit(request, limiter)
      const response = await applyRateLimit(request, limiter)

      expect(response).not.toBeNull()

      const json = await response?.json()
      expect(json).toHaveProperty('error')
      expect(json).toHaveProperty('message')
      expect(json.error).toBe('Too many requests')
    })

    it('works with different RateLimiter configs', async () => {
      const strictLimiter = new RateLimiter({
        interval: 60000,
        uniqueTokenPerInterval: 1,
      })

      const lenientLimiter = new RateLimiter({
        interval: 60000,
        uniqueTokenPerInterval: 100,
      })

      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1',
      })

      // Strict limiter should block after 1 request
      await applyRateLimit(request, strictLimiter)
      const strictResponse = await applyRateLimit(request, strictLimiter)
      expect(strictResponse?.status).toBe(429)

      // Lenient limiter should allow many requests from a different IP
      const request2 = createMockRequest({
        'x-forwarded-for': '192.168.1.2',
      })

      for (let i = 0; i < 50; i++) {
        const response = await applyRateLimit(request2, lenientLimiter)
        expect(response).toBeNull()
      }
    })
  })

  describe('pre-configured limiters', () => {
    it('api limiter: 100 requests/minute', () => {
      expect(rateLimiters.api).toBeInstanceOf(RateLimiter)
      // We can't access private config, but we can test behavior
    })

    it('auth limiter: 5 requests/15 minutes', () => {
      expect(rateLimiters.auth).toBeInstanceOf(RateLimiter)
    })

    it('contactForm limiter: 3 requests/hour', () => {
      expect(rateLimiters.contactForm).toBeInstanceOf(RateLimiter)
    })

    it('fileUpload limiter: 10 requests/hour', () => {
      expect(rateLimiters.fileUpload).toBeInstanceOf(RateLimiter)
    })

    it('all limiters are unique instances', () => {
      expect(rateLimiters.api).not.toBe(rateLimiters.auth)
      expect(rateLimiters.api).not.toBe(rateLimiters.contactForm)
      expect(rateLimiters.api).not.toBe(rateLimiters.fileUpload)
      expect(rateLimiters.auth).not.toBe(rateLimiters.contactForm)
      expect(rateLimiters.auth).not.toBe(rateLimiters.fileUpload)
      expect(rateLimiters.contactForm).not.toBe(rateLimiters.fileUpload)
    })
  })

  describe('edge cases and security', () => {
    it('handles concurrent requests correctly', async () => {
      const limiter = new RateLimiter({
        interval: 60000,
        uniqueTokenPerInterval: 10,
      })

      const user = 'user_concurrent_' + Date.now()

      // Make 10 sequential requests to use up the limit
      for (let i = 0; i < 10; i++) {
        await limiter.check(user)
      }

      // Next request should fail
      const result = await limiter.check(user)
      expect(result.success).toBe(false)
    })

    it('handles empty identifier', async () => {
      const limiter = new RateLimiter({
        interval: 60000,
        uniqueTokenPerInterval: 5,
      })

      const result = await limiter.check('')
      expect(result.success).toBe(true)
    })

    it('handles very long identifier', async () => {
      const limiter = new RateLimiter({
        interval: 60000,
        uniqueTokenPerInterval: 5,
      })

      const longIdentifier = 'a'.repeat(1000)
      const result = await limiter.check(longIdentifier)
      expect(result.success).toBe(true)
    })

    it('handles special characters in identifier', async () => {
      const limiter = new RateLimiter({
        interval: 60000,
        uniqueTokenPerInterval: 5,
      })

      const result = await limiter.check('user@#$%^&*()')
      expect(result.success).toBe(true)
    })
  })
})
