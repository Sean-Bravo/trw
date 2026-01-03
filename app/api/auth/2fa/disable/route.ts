import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { execute } from '@/lib/db';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
