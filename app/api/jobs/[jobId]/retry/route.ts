import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getJobById } from '@/lib/jobs-db';
import { queryOne, execute } from '@/lib/db';

// Rate limit: minimum 30 seconds between retries
const RETRY_COOLDOWN_MS = 30 * 1000;
// Maximum retries allowed
const MAX_RETRIES = 5;

// Lambda API Gateway
const API_GATEWAY_URL = process.env['API_GATEWAY_URL'] || 'https://api.taxformatter.com';

/**
 * POST /api/jobs/[jobId]/retry
 * Retry a failed job - re-triggers Lambda processing
 */
export async function POST(
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

    // 2. Get job from DB
    const dbJob = await getJobById(jobId);
    if (!dbJob) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // 3. Verify user owns this job
    if (dbJob.upload.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // 4. Only allow retry on failed jobs
    if (dbJob.status !== 'failed') {
      return NextResponse.json(
        { error: 'Only failed jobs can be retried' },
        { status: 400 }
      );
    }

    // 5. Check retry count limit
    const retryCount = (dbJob as { retry_count?: number }).retry_count || 0;
    if (retryCount >= MAX_RETRIES) {
      return NextResponse.json(
        {
          error: `Maximum retry attempts (${MAX_RETRIES}) reached`,
          retryCount,
          maxRetries: MAX_RETRIES
        },
        { status: 429 }
      );
    }

    // 6. Rate limit - check cooldown
    const lastRetryAt = (dbJob as { last_retry_at?: string }).last_retry_at;
    if (lastRetryAt) {
      const timeSinceLastRetry = Date.now() - new Date(lastRetryAt).getTime();
      if (timeSinceLastRetry < RETRY_COOLDOWN_MS) {
        const waitSeconds = Math.ceil((RETRY_COOLDOWN_MS - timeSinceLastRetry) / 1000);
        return NextResponse.json(
          {
            error: `Please wait ${waitSeconds} seconds before retrying`,
            waitSeconds,
            lastRetryAt
          },
          { status: 429 }
        );
      }
    }

    // 7. Update job status to queued and increment retry count
    await execute(
      `UPDATE jobs
       SET status = 'queued',
           error = NULL,
           result = NULL,
           retry_count = retry_count + 1,
           last_retry_at = now(),
           started_at = NULL,
           finished_at = NULL
       WHERE id = $1`,
      [jobId]
    );

    // 8. Re-trigger Lambda processing by calling the retry endpoint
    // This sends the S3 key back to the processor queue
    const lambdaResponse = await fetch(`${API_GATEWAY_URL}/job/${jobId}/retry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        s3Key: dbJob.upload.s3_key,
        jobId: jobId,
      }),
    });

    if (!lambdaResponse.ok) {
      // Revert job status if Lambda trigger failed
      await execute(
        `UPDATE jobs
         SET status = 'failed',
             error = 'Failed to trigger retry'
         WHERE id = $1`,
        [jobId]
      );

      const errorData = await lambdaResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || 'Failed to trigger job retry' },
        { status: lambdaResponse.status }
      );
    }

    const newRetryCount = retryCount + 1;

    return NextResponse.json({
      success: true,
      message: 'Job retry initiated',
      jobId,
      retryCount: newRetryCount,
      maxRetries: MAX_RETRIES,
      retriesRemaining: MAX_RETRIES - newRetryCount,
    });

  } catch (error) {
    console.error('[Job Retry] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
