import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, DbBankJob } from '@/lib/db';

/**
 * GET /api/bank/jobs
 * List all bank jobs for the current user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobs = await query<DbBankJob>(
      `SELECT * FROM bank_jobs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [session.user.id]
    );

    // Transform to camelCase for frontend
    const transformedJobs = jobs.map(job => ({
      jobId: job.id,
      status: job.status,
      filename: job.filename,
      detectedBank: job.detected_bank,
      transactionCount: job.transaction_count,
      outputFormat: job.output_format,
      resultKey: job.result_key,
      error: job.error,
      createdAt: job.created_at,
      completedAt: job.completed_at,
    }));

    return NextResponse.json({ jobs: transformedJobs });
  } catch (error) {
    console.error('[Bank Jobs] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
