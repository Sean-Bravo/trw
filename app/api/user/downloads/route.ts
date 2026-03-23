import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { queryOne } from '@/lib/db';

// MVP Mode: Unlimited downloads for all users to maximize feedback
const MVP_UNLIMITED_DOWNLOADS = true;

// Free tier limit (disabled during MVP)
const FREE_TIER_MONTHLY_DOWNLOADS = 3;

interface DownloadCount {
  count: string;
}

interface Subscription {
  tier: string;
}

/**
 * GET /api/user/downloads
 * Get current user's download usage for the month
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get subscription tier
    const subscription = await queryOne<Subscription>(
      `SELECT tier FROM subscriptions WHERE user_id = $1`,
      [userId]
    );

    const tier = subscription?.tier || 'free';

    // MVP Mode: All tiers get unlimited downloads
    if (MVP_UNLIMITED_DOWNLOADS) {
      return NextResponse.json({
        tier,
        limit: null, // unlimited during MVP
        used: 0,
        remaining: null,
        mvpMode: true,
      });
    }

    // For paid tiers, return unlimited
    if (tier !== 'free') {
      return NextResponse.json({
        tier,
        limit: null, // unlimited
        used: 0,
        remaining: null,
      });
    }

    // Count downloads this month for free tier
    const result = await queryOne<DownloadCount>(
      `SELECT COUNT(*) as count FROM downloads
       WHERE user_id = $1
       AND downloaded_at >= date_trunc('month', CURRENT_TIMESTAMP)`,
      [userId]
    );

    const used = parseInt(result?.count || '0', 10);
    const remaining = Math.max(0, FREE_TIER_MONTHLY_DOWNLOADS - used);

    return NextResponse.json({
      tier,
      limit: FREE_TIER_MONTHLY_DOWNLOADS,
      used,
      remaining,
    });

  } catch (error) {
    console.error('[User Downloads] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
