import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { verifyPassword } from '@/lib/auth-db';

export async function POST(request: Request) {
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
    const user2fa = await queryOne<{ two_factor_enabled: boolean }>(
      'SELECT two_factor_enabled FROM users WHERE id = $1',
      [user.id]
    );

    return NextResponse.json({
      requires2FA: user2fa?.two_factor_enabled || false
    });
  } catch (error) {
    console.error('[2FA Check] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
