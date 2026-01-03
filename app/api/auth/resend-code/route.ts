import { NextRequest, NextResponse } from 'next/server';
import { validateEmail } from '@/lib/validation';
import { updateVerificationCode, isEmailVerified, findUserByEmail } from '@/lib/auth-db';
import { generateVerificationCode, sendVerificationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.success || !emailValidation.data) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const validatedEmail = emailValidation.data;

    // Check if already verified
    const verified = await isEmailVerified(validatedEmail);
    if (verified) {
      return NextResponse.json(
        { error: 'Email already verified' },
        { status: 400 }
      );
    }

    // Get user for name
    const user = await findUserByEmail(validatedEmail);
    if (!user) {
      // Don't reveal if user exists for security
      return NextResponse.json(
        { success: true, message: 'If the email exists, a new code has been sent.' },
        { status: 200 }
      );
    }

    // Generate new code
    const newCode = generateVerificationCode();

    // Update code in database
    const updateResult = await updateVerificationCode(validatedEmail, newCode);
    if (!updateResult.success) {
      return NextResponse.json(
        { error: updateResult.error || 'Failed to generate new code' },
        { status: 400 }
      );
    }

    // Send new verification email
    const emailResult = await sendVerificationEmail(
      validatedEmail,
      newCode,
      user.name || undefined
    );

    if (!emailResult.success) {
      console.error('[Auth] Failed to resend verification email:', emailResult.error);
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Verification code sent. Please check your email.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Auth] Resend code error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
