import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getJobById, updateJobStatus } from '@/lib/jobs-db';

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
    let dbJob: Awaited<ReturnType<typeof getJobById>> = null;
    try {
      dbJob = await getJobById(jobId);

      if (dbJob) {
        // Verify user owns this job (via upload)
        if (dbJob.upload.user_id !== session.user.id) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          );
        }

        // If job is in terminal state with result data, return from DB
        // If succeeded but result is null, fall through to Lambda to get result.json
        if (['succeeded', 'failed', 'canceled'].includes(dbJob.status)) {
          if (dbJob.status !== 'succeeded' || dbJob.result !== null) {
            return NextResponse.json({
              jobId: dbJob.id,
              uploadId: dbJob.upload_id,
              status: dbJob.status,
              result: dbJob.result,
              error: dbJob.error,
              createdAt: dbJob.created_at,
              startedAt: dbJob.started_at,
              finishedAt: dbJob.finished_at,
              filename: dbJob.upload.filename,
              retryCount: (dbJob as { retry_count?: number }).retry_count || 0,
              lastRetryAt: (dbJob as { last_retry_at?: string }).last_retry_at || null,
            });
          }
          // succeeded with null result - fall through to Lambda to get result.json
        }
        // Non-terminal status (queued/running) - check Lambda for latest status
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

    // Map Lambda status to frontend status
    const statusMap: Record<string, string> = {
      'pending': 'queued',
      'processing': 'running',
      'completed': 'succeeded',
      'failed': 'failed',
    };

    const mappedStatus = statusMap[data.status] || data.status;

    // Sync terminal status to DB (succeeded/failed) so it persists
    if (mappedStatus === 'succeeded' || mappedStatus === 'failed') {
      try {
        await updateJobStatus(
          jobId,
          mappedStatus as 'succeeded' | 'failed',
          data.result || undefined,
          data.error || undefined
        );
        console.log(`[Job Status] Synced ${mappedStatus} status to DB for job ${jobId}`);
      } catch (syncError) {
        console.warn('[Job Status] Failed to sync status to DB:', syncError);
      }
    }

    // Transform Lambda response to match expected format
    // Use DB job data if available for accurate timestamps/filename
    return NextResponse.json({
      jobId: data.jobId,
      uploadId: dbJob?.upload_id || jobId,
      status: mappedStatus,
      progress: data.progress,
      error: data.error || null,
      result: data.result || null,
      createdAt: dbJob?.created_at || new Date().toISOString(),
      startedAt: dbJob?.started_at || null,
      finishedAt: data.status === 'completed' || data.status === 'failed' ? new Date().toISOString() : null,
      filename: dbJob?.upload.filename || data.filename || 'Unknown file',
      retryCount: (dbJob as { retry_count?: number })?.retry_count || 0,
      lastRetryAt: (dbJob as { last_retry_at?: string })?.last_retry_at || null,
    });

  } catch (error) {
    console.error('[Job Status] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
