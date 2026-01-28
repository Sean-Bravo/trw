import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, queryOne, DbBankJob } from '@/lib/db';

/**
 * GET /api/bank/jobs/[jobId]
 * Get a single bank job
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await params;

    const job = await queryOne<DbBankJob>(
      `SELECT id, user_id, filename, status, detected_bank, transaction_count,
              output_format, result_key, error, created_at, completed_at
       FROM bank_jobs
       WHERE id = $1 AND user_id = $2`,
      [jobId, session.user.id]
    );

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ job });

  } catch (error) {
    console.error('[Bank Job] Error fetching job:', error);
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 });
  }
}

/**
 * DELETE /api/bank/jobs/[jobId]
 * Delete a bank job record
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await params;

    // Verify ownership before delete
    const job = await queryOne<DbBankJob>(
      `SELECT id FROM bank_jobs WHERE id = $1 AND user_id = $2`,
      [jobId, session.user.id]
    );

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Delete from database
    await query(
      `DELETE FROM bank_jobs WHERE id = $1`,
      [jobId]
    );

    // Note: S3 files are deleted separately via Lambda or stay until TTL

    return NextResponse.json({ success: true, jobId });

  } catch (error) {
    console.error('[Bank Job] Error deleting job:', error);
    return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
  }
}
