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
      `SELECT id, user_id, filename, status, detected_bank, transaction_count,
              output_format, result_key, error, created_at, completed_at
       FROM bank_jobs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [session.user.id]
    );

    return NextResponse.json({ jobs });

  } catch (error) {
    console.error('[Bank Jobs] Error fetching jobs:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}
