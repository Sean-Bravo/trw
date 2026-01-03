import { NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { verifyToken, verifyBackupCode } from '@/lib/2fa';
import { verifyPassword } from '@/lib/auth-db';

interface User2FA {
  id: string;
  two_factor_secret: string;
  backup_codes: string[] | null;
}

export async function POST(request: Request) {
  try {
    const { email, password, code, isBackupCode } = await request.json();

    if (!email || !password || !code) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    // Verify password first
    const user = await verifyPassword(email, password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Get 2FA details
    const user2fa = await queryOne<User2FA>(
      'SELECT id, two_factor_secret, backup_codes FROM users WHERE id = $1 AND two_factor_enabled = TRUE',
      [user.id]
    );

    if (!user2fa || !user2fa.two_factor_secret) {
      return NextResponse.json({ error: '2FA not enabled' }, { status: 400 });
    }

    let valid = false;

    if (isBackupCode) {
      // Verify backup code
      if (user2fa.backup_codes) {
        const result = verifyBackupCode(code, user2fa.backup_codes);
        if (result.valid) {
          // Remove used backup code
          const newCodes = [...user2fa.backup_codes];
          newCodes.splice(result.index, 1);
          await execute(
            'UPDATE users SET backup_codes = $1 WHERE id = $2',
            [newCodes, user.id]
          );
          valid = true;
        }
      }
    } else {
      // Verify TOTP
      valid = verifyToken(code, user2fa.two_factor_secret);
    }

    if (!valid) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 401 });
    }

    // Return success - client will complete sign in
    return NextResponse.json({
      success: true,
      userId: user.id
    });
  } catch (error) {
    console.error('[2FA Login Verify] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
