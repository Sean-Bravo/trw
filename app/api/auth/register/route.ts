import { NextRequest, NextResponse } from 'next/server';
import { validateEmail, validatePassword } from '@/lib/validation';
import { createUser, emailExists } from '@/lib/auth-db';

export async function POST(request: NextRequest) {
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

    // Create user directly in Neon DB
    const user = await createUser(
      validatedEmail,
      password,
      name || undefined
    );

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          subscriptionTier: user.subscriptionTier
        },
        message: 'User created successfully'
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
