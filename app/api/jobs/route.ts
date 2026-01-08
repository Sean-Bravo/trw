import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getJobsByUserId } from '@/lib/jobs-db';
import { query } from '@/lib/db';

/**
 * GET /api/jobs
 * List all jobs for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get jobs with upload info (filename)
    const jobs = await query<{
      id: string;
      upload_id: string;
      status: string;
      result: Record<string, unknown> | null;
      error: string | null;
      created_at: Date;
      started_at: Date | null;
      finished_at: Date | null;
      filename: string;
    }>(
      `SELECT j.*, u.filename
       FROM jobs j
       JOIN uploads u ON u.id = j.upload_id
       WHERE u.user_id = $1
       ORDER BY j.created_at DESC
       LIMIT 50`,
      [session.user.id]
    );

    // Transform to match JobData interface
    const formattedJobs = jobs.map((job) => ({
      jobId: job.id,
      uploadId: job.upload_id,
      status: job.status,
      result: job.result,
      error: job.error,
      createdAt: job.created_at,
      startedAt: job.started_at,
      finishedAt: job.finished_at,
      filename: job.filename,
    }));

    return NextResponse.json({ jobs: formattedJobs });
  } catch (error) {
    console.error('[Jobs List] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
