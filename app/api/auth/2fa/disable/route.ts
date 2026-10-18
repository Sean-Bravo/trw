import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { execute } from '@/lib/db';
import { verifyTwoFactorReauth } from '@/lib/auth-db';
import { rateLimiters } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Keyed by user, not IP: the caller already holds this account's session.
    const rateLimit = await rateLimiters.auth.check(`2fa-reauth:${session.user.id}`);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // F1: a session alone must not be able to turn 2FA off.
    const { password, code } = await request.json().catch(() => ({}));
    if (typeof password !== 'string' || typeof code !== 'string' || !code) {
      return NextResponse.json({ error: 'Password and verification code are required' }, { status: 401 });
    }

    const reauth = await verifyTwoFactorReauth(session.user.id, password, code);
    if (reauth === 'not_enabled') {
      return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 });
    }
    if (reauth === 'locked') {
      return NextResponse.json(
        { error: 'Too many failed attempts. Please try again later.' },
        { status: 429 }
      );
    }
    if (reauth !== 'ok') {
      return NextResponse.json({ error: 'Invalid password or verification code' }, { status: 401 });
    }

    // Disable 2FA and clear secret/codes
    await execute(
      'UPDATE users SET two_factor_enabled = FALSE, two_factor_secret = NULL, backup_codes = NULL WHERE id = $1',
      [session.user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[2FA Disable] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
