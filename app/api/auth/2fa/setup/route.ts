import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { execute, queryOne } from '@/lib/db';
import { generateSecret, generateQRCode } from '@/lib/2fa';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if already enabled
    const user = await queryOne<{ two_factor_enabled: boolean }>(
      'SELECT two_factor_enabled FROM users WHERE id = $1',
      [session.user.id]
    );

    if (user?.two_factor_enabled) {
      return NextResponse.json({ error: '2FA already enabled' }, { status: 400 });
    }

    // Generate new secret
    const secret = generateSecret();

    // Store secret temporarily (not enabled yet)
    await execute(
      'UPDATE users SET two_factor_secret = $1, two_factor_enabled = FALSE WHERE id = $2',
      [secret, session.user.id]
    );

    // Generate QR code
    const qrCode = await generateQRCode(session.user.email, secret);

    return NextResponse.json({
      secret,
      qrCode,
    });
  } catch (error) {
    console.error('[2FA Setup] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
