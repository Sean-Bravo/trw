import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { listApiKeys, getMonthlyUsage, getUsageHistory } from '@/lib/api-keys';

/**
 * GET /api/developer/usage
 * Get usage stats for all of the user's API keys
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keys = await listApiKeys(session.user.id);
    const activeKeys = keys.filter((k) => k.is_active);

    const usage = await Promise.all(
      activeKeys.map(async (key) => {
        const monthly = await getMonthlyUsage(key.id);
        const history = await getUsageHistory(key.id, 6);
        return {
          keyId: key.id,
          keyName: key.name,
          tier: key.tier,
          monthlyQuota: key.monthly_quota,
          currentMonth: monthly,
          history: history.map((h) => ({
            date: h.usage_date,
            fileCount: h.file_count,
            requestCount: h.request_count,
          })),
        };
      })
    );

    return NextResponse.json({ usage });
  } catch (error) {
    console.error('[Developer Usage] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
