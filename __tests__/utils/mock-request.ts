/**
 * Mock request utilities for API route testing
 *
 * NextRequest can't be properly instantiated in Jest due to missing
 * browser/edge runtime APIs. This provides a mock that satisfies
 * the API route requirements.
 */

export interface MockNextRequest {
  json: () => Promise<unknown>;
  headers: {
    get: (name: string) => string | null;
  };
  url: string;
  nextUrl: URL;
}

export function createMockRequest(
  body: object,
  options: {
    url?: string;
    headers?: Record<string, string>;
  } = {}
): MockNextRequest {
  const defaultHeaders: Record<string, string> = {
    'content-type': 'application/json',
    'x-forwarded-for': '127.0.0.1',
    ...options.headers,
  };

  const url = options.url || 'http://localhost/api/test';

  return {
    json: () => Promise.resolve(body),
    headers: {
      get: (name: string) => defaultHeaders[name.toLowerCase()] || null,
    },
    url,
    nextUrl: new URL(url),
  } as MockNextRequest;
}
