import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { verifyPassword } from '@/lib/auth-db';
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit';
import { generateVerificationCode, sendVerificationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  // Rate limit: 5 attempts per 15 minutes
  const identifier = getClientIdentifier(request);
  const rateLimit = await rateLimiters.auth.check(identifier);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    // Verify password first
    const user = await verifyPassword(email, password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Check if 2FA is enabled
    const user2fa = await queryOne<{ two_factor_enabled: boolean; name: string | null }>(
      'SELECT two_factor_enabled, name FROM users WHERE id = $1',
      [user.id]
    );

    const requires2FA = user2fa?.two_factor_enabled || false;

    // If 2FA is required, generate and send email code
    if (requires2FA) {
      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store the 2FA login code in the database
      await execute(
        `UPDATE users
         SET two_factor_login_code = $1,
             two_factor_login_code_expires = $2
         WHERE id = $3`,
        [code, expiresAt, user.id]
      );

      // Send the code via email
      const emailResult = await sendVerificationEmail(email, code, user2fa?.name || undefined);

      if (!emailResult.success) {
        console.error('[2FA Check] Failed to send 2FA email:', emailResult.error);
        return NextResponse.json(
          { error: 'Failed to send verification code. Please try again.' },
          { status: 500 }
        );
      }

      console.log('[2FA Check] 2FA email code sent to:', email);
    }

    return NextResponse.json({
      requires2FA
    });
  } catch (error) {
    console.error('[2FA Check] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
