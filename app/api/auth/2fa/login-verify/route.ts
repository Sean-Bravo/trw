import { NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { verifyBackupCode, verifyToken } from '@/lib/2fa';
import { verifyPassword } from '@/lib/auth-db';

interface User2FA {
  id: string;
  two_factor_secret: string | null;
  two_factor_login_code: string | null;
  two_factor_login_code_expires: Date | null;
  backup_codes: string[] | null;
}

export async function POST(request: Request) {
  try {
    const { email, password, code, isBackupCode, useAuthenticatorApp } = await request.json();

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
      'SELECT id, two_factor_secret, two_factor_login_code, two_factor_login_code_expires, backup_codes FROM users WHERE id = $1 AND two_factor_enabled = TRUE',
      [user.id]
    );

    if (!user2fa) {
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
    } else if (useAuthenticatorApp) {
      // Verify TOTP from authenticator app
      if (user2fa.two_factor_secret) {
        valid = verifyToken(code, user2fa.two_factor_secret);
      }
    } else {
      // Verify email code (default)
      if (user2fa.two_factor_login_code && user2fa.two_factor_login_code_expires) {
        const now = new Date();
        const expiresAt = new Date(user2fa.two_factor_login_code_expires);

        if (user2fa.two_factor_login_code === code && now < expiresAt) {
          valid = true;
          // Clear the used code
          await execute(
            'UPDATE users SET two_factor_login_code = NULL, two_factor_login_code_expires = NULL WHERE id = $1',
            [user.id]
          );
        }
      }
    }

    if (!valid) {
      return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 401 });
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
