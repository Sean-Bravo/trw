import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { execute, queryOne } from '@/lib/db';
import { verifyToken, generateBackupCodes, hashBackupCodes } from '@/lib/2fa';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await request.json();

    if (!code || typeof code !== 'string' || code.length !== 6) {
      return NextResponse.json({ error: 'Invalid code format' }, { status: 400 });
    }

    // Get the stored secret
    const user = await queryOne<{ two_factor_secret: string; two_factor_enabled: boolean }>(
      'SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = $1',
      [session.user.id]
    );

    if (!user?.two_factor_secret) {
      return NextResponse.json({ error: 'Setup not started' }, { status: 400 });
    }

    if (user.two_factor_enabled) {
      return NextResponse.json({ error: '2FA already enabled' }, { status: 400 });
    }

    // Verify the token
    const isValid = verifyToken(code, user.two_factor_secret);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes(8);
    const hashedCodes = hashBackupCodes(backupCodes);

    // Enable 2FA and store hashed backup codes
    await execute(
      'UPDATE users SET two_factor_enabled = TRUE, backup_codes = $1 WHERE id = $2',
      [hashedCodes, session.user.id]
    );

    return NextResponse.json({
      success: true,
      backupCodes, // Return plain codes to user (only time they see them)
    });
  } catch (error) {
    console.error('[2FA Verify] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
