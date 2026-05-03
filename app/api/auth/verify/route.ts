import { NextRequest, NextResponse } from 'next/server';
import { validateEmail } from '@/lib/validation';
import { verifyEmailCode } from '@/lib/auth-db';
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit';
import { createApiKey } from '@/lib/api-keys';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  // H-6: rate limit verification attempts (5 per 15 min by default).
  // Without this, a 6-digit code (10^6 search space) is brute-forceable
  // in minutes over a fast connection.
  const identifier = getClientIdentifier(request);
  const rateLimit = await rateLimiters.auth.check(identifier);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { email, code } = body;

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.success || !emailValidation.data) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const validatedEmail = emailValidation.data;

    // Validate code format (6 digits)
    if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Invalid verification code format' },
        { status: 400 }
      );
    }

    // Verify the code
    const result = await verifyEmailCode(validatedEmail, code);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Verification failed' },
        { status: 400 }
      );
    }

    // Phase 4 (v3): auto-provision a free API key after successful verification.
    // Idempotent — skip if the user already has any active key (covers re-verify
    // and the case where they already created a key manually). The DB partial
    // unique index from migration 013 is the real race guarantee; this app-level
    // check exists to avoid unnecessary work.
    if (result.user?.id) {
      try {
        const existing = await query<{ count: string }>(
          'SELECT COUNT(*)::text as count FROM api_keys WHERE user_id = $1 AND is_active = true',
          [result.user.id]
        );
        const activeCount = parseInt(existing[0]?.count ?? '0', 10);
        if (activeCount === 0) {
          await createApiKey(result.user.id, 'Default key', 'free');
        }
      } catch (err) {
        // Don't block verification on key creation failure — the user can
        // create one manually from the dashboard.
        console.error('[Auth] Failed to auto-provision free API key:', err);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Email verified successfully',
        user: result.user
          ? {
              id: result.user.id,
              email: result.user.email,
              name: result.user.name,
              emailVerified: result.user.emailVerified,
            }
          : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Auth] Verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
