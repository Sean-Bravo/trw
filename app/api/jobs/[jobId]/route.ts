import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getJobById } from '@/lib/jobs-db';

// Custom domain doesn't need /prod prefix - it's mapped directly
const API_GATEWAY_URL = process.env['API_GATEWAY_URL'] || 'https://api.taxformatter.com';

/**
 * GET /api/jobs/[jobId]
 * Get job status - tries Neon DB first, falls back to Lambda/S3
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

    // 2. Try to get job from Neon DB first
    try {
      const job = await getJobById(jobId);

      if (job) {
        // Verify user owns this job (via upload)
        if (job.upload.user_id !== session.user.id) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          );
        }

        return NextResponse.json({
          jobId: job.id,
          uploadId: job.upload_id,
          status: job.status,
          result: job.result,
          error: job.error,
          createdAt: job.created_at,
          startedAt: job.started_at,
          finishedAt: job.finished_at,
          filename: job.upload.filename,
        });
      }
    } catch (dbError) {
      console.warn('[Job Status] DB lookup failed, trying Lambda:', dbError);
    }

    // 3. Fallback to Lambda/S3 status check
    // Route: GET /job/{jobId} (see backend/handlers/webhook.py)
    const lambdaResponse = await fetch(`${API_GATEWAY_URL}/job/${jobId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!lambdaResponse.ok) {
      if (lambdaResponse.status === 404) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }
      const errorData = await lambdaResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || 'Failed to get job status' },
        { status: lambdaResponse.status }
      );
    }

    const data = await lambdaResponse.json();

    // Transform Lambda response to match expected format
    return NextResponse.json({
      jobId: data.jobId,
      status: data.status,
      progress: data.progress,
      error: data.error,
    });

  } catch (error) {
    console.error('[Job Status] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
