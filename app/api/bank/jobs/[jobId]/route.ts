import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, queryOne, DbBankJob } from '@/lib/db';

/**
 * GET /api/bank/jobs/[jobId]
 * Get a single bank job by ID
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
      `SELECT * FROM bank_jobs WHERE id = $1 AND user_id = $2`,
      [jobId, session.user.id]
    );

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('[Bank Job] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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

    // Verify job belongs to user
    const job = await queryOne<DbBankJob>(
      `SELECT id FROM bank_jobs WHERE id = $1 AND user_id = $2`,
      [jobId, session.user.id]
    );

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    await query(`DELETE FROM bank_jobs WHERE id = $1`, [jobId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Bank Job Delete] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
