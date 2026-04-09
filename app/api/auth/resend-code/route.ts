import { NextRequest, NextResponse } from 'next/server';
import { validateEmail } from '@/lib/validation';
import { updateVerificationCode, isEmailVerified, findUserByEmail } from '@/lib/auth-db';
import { generateVerificationCode, sendVerificationEmail } from '@/lib/email';

// M-4: this endpoint is a user-enumeration vector in two ways:
//   1. Different responses for "user exists" vs "doesn't exist"
//   2. Different response *times* (existing user does DB write + email
//      send → ~500ms; nonexistent user returns in <50ms).
//
// Fix: every successful branch returns the SAME generic 200, and we
// pad the no-op branch with a randomized delay so the timing channel
// is closed too.
//
// SECURITY_AUDIT.md §M-4

const GENERIC_SUCCESS = {
  success: true,
  message: 'If an unverified account exists for that email, a new code has been sent.',
};

function padDelay(): Promise<void> {
  // 300-700ms — wide enough to mask DB write + email send latency.
  const ms = 300 + Math.floor(Math.random() * 400);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    const emailValidation = validateEmail(email);
    if (!emailValidation.success || !emailValidation.data) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const validatedEmail = emailValidation.data;

    // Either branch (no user, already verified) → no-op + pad delay.
    const [verified, user] = await Promise.all([
      isEmailVerified(validatedEmail),
      findUserByEmail(validatedEmail),
    ]);

    if (!user || verified) {
      await padDelay();
      return NextResponse.json(GENERIC_SUCCESS, { status: 200 });
    }

    // Active user → generate + send a new code.
    const newCode = generateVerificationCode();
    const updateResult = await updateVerificationCode(validatedEmail, newCode);
    if (!updateResult.success) {
      // Server-side problem; surface generically without leaking enum bits.
      console.error('[Auth] resend updateVerificationCode failed:', updateResult.error);
      return NextResponse.json(GENERIC_SUCCESS, { status: 200 });
    }

    const emailResult = await sendVerificationEmail(
      validatedEmail,
      newCode,
      user.name || undefined
    );
    if (!emailResult.success) {
      console.error('[Auth] Failed to resend verification email:', emailResult.error);
      // Same generic response so timing/status doesn't leak.
      return NextResponse.json(GENERIC_SUCCESS, { status: 200 });
    }

    return NextResponse.json(GENERIC_SUCCESS, { status: 200 });
  } catch (error) {
    console.error('[Auth] Resend code error:', error);
    // Pad and return generic 200 — never leak via 500 timing either.
    await padDelay();
    return NextResponse.json(GENERIC_SUCCESS, { status: 200 });
  }
}
