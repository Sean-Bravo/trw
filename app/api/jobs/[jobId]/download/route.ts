import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { API_GATEWAY_URL } from '@/lib/lambda-client';
import { getUserTier } from '@/lib/auth-db';

// Custom domain doesn't need /prod prefix - it's mapped directly

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

    // Resolve unified tier (api_keys.tier — highest active wins).
    const tier = await getUserTier(userId);

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
