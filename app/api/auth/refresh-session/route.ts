import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * GET /api/auth/refresh-session
 * Force refresh the NextAuth session to apply updated callbacks
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Return session info to verify it's working
    return NextResponse.json({
      user: {
        id: session.user?.id,
        email: session.user?.email,
        name: session.user?.name,
      },
      message: 'Session refreshed successfully',
    });
  } catch (error) {
    console.error('[Refresh Session] Error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh session' },
      { status: 500 }
    );
  }
}
