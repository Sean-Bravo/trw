import { NextRequest, NextResponse } from 'next/server';

/**
 * H-4: CSRF protection via Origin/Referer header check.
 *
 * On state-changing requests (POST/PUT/PATCH/DELETE) to /api/* routes,
 * we require the Origin (or Referer fallback) to match an allowlisted
 * origin. This stops cross-site forgery via fetch with credentials,
 * iframe-embedded form posts, and similar attacks.
 *
 * Bypassed paths:
 *   - /api/webhooks/*       — Stripe signature is the authentication
 *   - /api/auth/*           — NextAuth has its own CSRF protection
 *
 * SECURITY_AUDIT.md §H-4
 */

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>();
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'];
  const nextAuthUrl = process.env['NEXTAUTH_URL'];
  if (appUrl) origins.add(new URL(appUrl).origin);
  if (nextAuthUrl) origins.add(new URL(nextAuthUrl).origin);
  // Production canonical
  origins.add('https://taxformatter.com');
  origins.add('https://www.taxformatter.com');
  // Local dev
  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3000');
    origins.add('http://127.0.0.1:3000');
  }
  return origins;
}

function isCsrfExemptPath(pathname: string): boolean {
  // Webhooks: signed by Stripe, verified in the route handler.
  if (pathname.startsWith('/api/webhooks/')) return true;
  // NextAuth: ships its own CSRF protection.
  if (pathname.startsWith('/api/auth/')) return true;
  return false;
}

function originIsAllowed(headerValue: string | null, allowed: Set<string>): boolean {
  if (!headerValue) return false;
  try {
    return allowed.has(new URL(headerValue).origin);
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only inspect API routes; everything else passes through.
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Only state-changing methods need CSRF protection.
  if (!STATE_CHANGING_METHODS.has(req.method)) {
    return NextResponse.next();
  }

  if (isCsrfExemptPath(pathname)) {
    return NextResponse.next();
  }

  const allowed = getAllowedOrigins();
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');

  // Origin is the strongest signal. If absent, fall back to Referer
  // (Origin is omitted by some legacy clients on same-origin GETs, but
  // browsers always send it on cross-origin POST/PUT/PATCH/DELETE).
  if (origin) {
    if (!originIsAllowed(origin, allowed)) {
      return NextResponse.json(
        { error: 'CSRF: origin not allowed' },
        { status: 403 },
      );
    }
  } else if (referer) {
    if (!originIsAllowed(referer, allowed)) {
      return NextResponse.json(
        { error: 'CSRF: referer not allowed' },
        { status: 403 },
      );
    }
  } else {
    // No Origin and no Referer on a state-changing API call is suspicious.
    return NextResponse.json(
      { error: 'CSRF: missing origin and referer' },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
