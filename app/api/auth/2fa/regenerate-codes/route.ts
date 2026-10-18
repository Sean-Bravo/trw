import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { execute } from '@/lib/db';
import { generateBackupCodes, hashBackupCodes } from '@/lib/2fa';
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

    // F1: fresh backup codes are a working second factor, so a session alone
    // must not be able to mint them.
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

    // Generate new backup codes
    const backupCodes = generateBackupCodes(8);
    const hashedCodes = hashBackupCodes(backupCodes);

    // Update backup codes in database
    await execute(
      'UPDATE users SET backup_codes = $1 WHERE id = $2',
      [hashedCodes, session.user.id]
    );

    return NextResponse.json({
      success: true,
      backupCodes, // Return plain codes to user (only time they see them)
    });
  } catch (error) {
    console.error('[2FA Regenerate Codes] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
