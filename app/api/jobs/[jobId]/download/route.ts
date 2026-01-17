import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, queryOne } from '@/lib/db';

// Custom domain doesn't need /prod prefix - it's mapped directly
const API_GATEWAY_URL = process.env['API_GATEWAY_URL'] || 'https://api.taxformatter.com';

// MVP Mode: Unlimited downloads for all users to maximize feedback
const MVP_UNLIMITED_DOWNLOADS = true;

// Free tier limit (disabled during MVP)
const FREE_TIER_MONTHLY_DOWNLOADS = 3;

interface DownloadCount {
  count: string;
}

interface Subscription {
  tier: 'free' | 'pro' | 'premium';
}

/**
 * GET /api/jobs/[jobId]/download
 * Get download URL for completed job from AWS Lambda
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { jobId } = await params;

    // 2. Check subscription tier
    const subscription = await queryOne<Subscription>(
      `SELECT tier FROM subscriptions WHERE user_id = $1`,
      [userId]
    );

    const tier = subscription?.tier || 'free';

    // 3. For free tier, check monthly download limit (disabled during MVP)
    if (!MVP_UNLIMITED_DOWNLOADS && tier === 'free') {
      // Check if this job was already downloaded (don't count twice)
      const existingDownload = await queryOne(
        `SELECT id FROM downloads WHERE user_id = $1 AND job_id = $2`,
        [userId, jobId]
      );

      if (!existingDownload) {
        // Count downloads this month
        const result = await queryOne<DownloadCount>(
          `SELECT COUNT(*) as count FROM downloads
           WHERE user_id = $1
           AND downloaded_at >= date_trunc('month', CURRENT_TIMESTAMP)`,
          [userId]
        );

        const monthlyDownloads = parseInt(result?.count || '0', 10);

        if (monthlyDownloads >= FREE_TIER_MONTHLY_DOWNLOADS) {
          return NextResponse.json(
            {
              error: 'Monthly download limit reached',
              message: `Free tier allows ${FREE_TIER_MONTHLY_DOWNLOADS} downloads per month. Upgrade to Pro for unlimited downloads.`,
              limit: FREE_TIER_MONTHLY_DOWNLOADS,
              used: monthlyDownloads,
              upgradeUrl: '/pricing'
            },
            { status: 403 }
          );
        }
      }
    }

    // Get file type and format from query params
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'formatted';
    const format = searchParams.get('format') || 'koinly';

    // Validate format
    const validFormats = ['koinly', 'turbotax', 'coinledger', 'zenledger'];
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: `Invalid format. Valid formats: ${validFormats.join(', ')}` },
        { status: 400 }
      );
    }

    // 4. Call AWS Lambda via API Gateway
    // Route: GET /download/{jobId}?format=... (see backend/handlers/webhook.py)
    const lambdaResponse = await fetch(
      `${API_GATEWAY_URL}/download/${encodeURIComponent(jobId)}?format=${encodeURIComponent(format)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!lambdaResponse.ok) {
      const errorData = await lambdaResponse.json().catch(() => ({}));
      console.error('[Download URL] Lambda error:', errorData);
      return NextResponse.json(
        { error: errorData.error || 'Failed to get download URL' },
        { status: lambdaResponse.status }
      );
    }

    const data = await lambdaResponse.json();

    // 5. Record download for free tier tracking (only if not already recorded)
    if (tier === 'free') {
      try {
        await query(
          `INSERT INTO downloads (user_id, job_id)
           VALUES ($1, $2)
           ON CONFLICT (user_id, job_id) DO NOTHING`,
          [userId, jobId]
        );
      } catch (err) {
        // Don't fail the download if tracking fails
        console.error('[Download] Failed to record download:', err);
      }
    }

    // 6. Return download URL
    return NextResponse.json(data);

  } catch (error) {
    console.error('[Download URL] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
