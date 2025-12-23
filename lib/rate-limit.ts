import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key]?.resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max requests per interval
}

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async check(identifier: string): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
    const now = Date.now();
    const tokenData = store[identifier];

    if (!tokenData || tokenData.resetTime < now) {
      // Reset or initialize
      store[identifier] = {
        count: 1,
        resetTime: now + this.config.interval,
      };

      return {
        success: true,
        limit: this.config.uniqueTokenPerInterval,
        remaining: this.config.uniqueTokenPerInterval - 1,
        reset: store[identifier]!.resetTime,
      };
    }

    if (tokenData.count >= this.config.uniqueTokenPerInterval) {
      return {
        success: false,
        limit: this.config.uniqueTokenPerInterval,
        remaining: 0,
        reset: tokenData.resetTime,
      };
    }

    tokenData.count++;

    return {
      success: true,
      limit: this.config.uniqueTokenPerInterval,
      remaining: this.config.uniqueTokenPerInterval - tokenData.count,
      reset: tokenData.resetTime,
    };
  }
}

// Get client identifier (IP address or custom identifier)
export function getClientIdentifier(request: NextRequest): string {
  // Try to get IP from various headers (for proxies/load balancers)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  const ip = cfConnectingIp || forwardedFor?.split(',')[0] || realIp || 'unknown';

  return ip.trim();
}

// Middleware to apply rate limiting
export async function applyRateLimit(
  request: NextRequest,
  limiter: RateLimiter
): Promise<NextResponse | null> {
  const identifier = getClientIdentifier(request);
  const result = await limiter.check(identifier);

  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': new Date(result.reset).toISOString(),
          'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  // Add rate limit headers to successful responses
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', result.limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(result.reset).toISOString());

  return null; // Continue to the next middleware/handler
}

// Pre-configured rate limiters for common use cases
export const rateLimiters = {
  // API routes: 100 requests per minute
  api: new RateLimiter({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 100,
  }),

  // Authentication: 5 attempts per 15 minutes
  auth: new RateLimiter({
    interval: 15 * 60 * 1000, // 15 minutes
    uniqueTokenPerInterval: 5,
  }),

  // Contact form: 3 submissions per hour
  contactForm: new RateLimiter({
    interval: 60 * 60 * 1000, // 1 hour
    uniqueTokenPerInterval: 3,
  }),

  // File upload: 10 per hour
  fileUpload: new RateLimiter({
    interval: 60 * 60 * 1000, // 1 hour
    uniqueTokenPerInterval: 10,
  }),
};
