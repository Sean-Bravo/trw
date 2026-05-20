import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { API_GATEWAY_URL } from '@/lib/lambda-client';
import { getJobById } from '@/lib/jobs-db';

// Custom domain doesn't need /prod prefix - it's mapped directly

/**
 * GET /api/jobs/[jobId]/insights
 * Get AI insights for a completed job from AWS Lambda
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

    const { jobId } = await params;

    // IDOR guard: verify the job belongs to the caller before returning
    // AI insights — jobId is not a capability. (Mirrors H-2.)
    const dbJob = await getJobById(jobId);
    if (!dbJob || dbJob.upload.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Call AWS Lambda via API Gateway
    // Route: GET /insights/{jobId} (see backend/handlers/webhook.py)
    const lambdaResponse = await fetch(
      `${API_GATEWAY_URL}/insights/${encodeURIComponent(jobId)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!lambdaResponse.ok) {
      const errorData = await lambdaResponse.json().catch(() => ({}));
      console.error('[Insights] Lambda error:', errorData);
      return NextResponse.json(
        { error: errorData.error || 'Failed to get insights' },
        { status: lambdaResponse.status }
      );
    }

    const data = await lambdaResponse.json();

    // 3. Return insights
    return NextResponse.json(data);

  } catch (error) {
    console.error('[Insights] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
