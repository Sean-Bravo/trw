import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { setIdleTimeoutMinutes } from '@/lib/auth-db';
import { isIdleTimeoutOption, isRecentAuth } from '@/lib/idle-timeout';
import { sendIdleTimeoutDisabledEmail } from '@/lib/email';

/**
 * PATCH /api/user/idle-timeout  { minutes: 15 | 30 | 60 | 240 | 0 }
 *
 * Sets the automatic sign-out limit (docs/AUTO_LOGOUT_PLAN.md). Turning it
 * off (0) needs a sign-in from the last few minutes, the same "prove it's
 * you" bar as other security settings, and emails the account so a change
 * made by someone else at an unlocked device is noticed. The client then
 * calls useSession().update({ idleTimeoutChanged: true }); the session
 * re-reads the value from the database.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const minutes = (body as { minutes?: unknown }).minutes;
    if (!isIdleTimeoutOption(minutes)) {
      return NextResponse.json({ error: 'Choose 15, 30, 60 or 240 minutes, or 0 for never' }, { status: 400 });
    }

    if (minutes === 0 && !isRecentAuth(session.authTime)) {
      return NextResponse.json(
        { error: 'Sign in again to turn off automatic sign-out', code: 'reauth_required' },
        { status: 403 }
      );
    }

    await setIdleTimeoutMinutes(session.user.id, minutes);

    if (minutes === 0 && session.user.email) {
      // A failed notice must not undo a change the user asked for.
      const sent = await sendIdleTimeoutDisabledEmail(session.user.email, session.user.name ?? undefined);
      if (!sent.success) console.error('[Idle timeout] disabled-notice email failed:', sent.error);
    }

    return NextResponse.json({ minutes });
  } catch (error) {
    console.error('[Idle timeout] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
