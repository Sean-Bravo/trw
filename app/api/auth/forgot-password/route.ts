import { NextRequest, NextResponse } from 'next/server';
import { createPasswordResetToken, findUserByEmail } from '@/lib/auth-db';
import { sendPasswordResetEmail } from '@/lib/email';
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  // Rate limit: 5 attempts per 15 minutes
  const identifier = getClientIdentifier(request);
  const rateLimit = await rateLimiters.auth.check(identifier);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    // Create reset token
    const result = await createPasswordResetToken(email);

    // Only send email if token was created (user exists)
    if (result.token) {
      const user = await findUserByEmail(email);
      const baseUrl = process.env['NEXTAUTH_URL'] || 'http://localhost:3000';
      const resetUrl = `${baseUrl}/reset-password?token=${result.token}`;

      await sendPasswordResetEmail(email, resetUrl, user?.name || undefined);
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    console.error('[Forgot Password] Error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
