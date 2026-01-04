import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { execute, queryOne } from '@/lib/db';
import { generateBackupCodes, hashBackupCodes } from '@/lib/2fa';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if 2FA is enabled
    const user = await queryOne<{ two_factor_enabled: boolean }>(
      'SELECT two_factor_enabled FROM users WHERE id = $1',
      [session.user.id]
    );

    if (!user?.two_factor_enabled) {
      return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 });
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
