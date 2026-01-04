import { NextRequest, NextResponse } from 'next/server';
import { resetPassword, verifyResetToken } from '@/lib/auth-db';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const verifyTokenSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
});

// GET - Verify token is valid
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    const { token: validToken } = verifyTokenSchema.parse({ token });

    const result = await verifyResetToken(validToken);

    if (!result.success) {
      return NextResponse.json(
        { valid: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: result.email,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { valid: false, error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('[Reset Password Verify] Error:', error);
    return NextResponse.json(
      { valid: false, error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

// POST - Reset password
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = resetPasswordSchema.parse(body);

    const result = await resetPassword(token, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('[Reset Password] Error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
