import { NextRequest, NextResponse } from 'next/server';
import { validateEmail } from '@/lib/validation';
import { verifyEmailCode } from '@/lib/auth-db';
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit';

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
