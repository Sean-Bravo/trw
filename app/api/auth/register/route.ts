import { NextRequest, NextResponse } from 'next/server';
import { validateEmail, validatePassword } from '@/lib/validation';
import { createUser, emailExists } from '@/lib/auth-db';
import { generateVerificationCode, sendVerificationEmail } from '@/lib/email';
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Rate limit: 5 attempts per 15 minutes
  const identifier = getClientIdentifier(request);
  const rateLimit = await rateLimiters.auth.check(identifier);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.success || !emailValidation.data) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const validatedEmail = emailValidation.data;

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.success) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters with uppercase, lowercase, and number' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const exists = await emailExists(validatedEmail);
    if (exists) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();

    // Create user with verification code
    const user = await createUser(
      validatedEmail,
      password,
      name || undefined,
      verificationCode
    );

    // Send verification email
    const emailResult = await sendVerificationEmail(
      validatedEmail,
      verificationCode,
      name || undefined
    );

    if (!emailResult.success) {
      console.error('[Auth] Failed to send verification email:', emailResult.error);
      // User is created but email failed - they can request resend
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          subscriptionTier: user.subscriptionTier
        },
        message: 'User created. Please check your email for verification code.',
        requiresVerification: true
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Auth] Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
