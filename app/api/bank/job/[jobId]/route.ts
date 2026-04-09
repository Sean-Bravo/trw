import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { queryOne } from '@/lib/db';

const API_GATEWAY_URL = process.env['API_GATEWAY_URL'] || 'https://api.taxformatter.com';

/**
 * GET /api/bank/job/[jobId]
 * Get bank statement job status
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

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
    }

    // H-3: verify the job belongs to this user. Authentication alone isn't
    // enough — without an ownership check, any logged-in user could probe
    // status of any other user's bank job by guessing/leaking jobIds.
    const job = await queryOne<{ user_id: string }>(
      'SELECT user_id FROM bank_jobs WHERE id = $1',
      [jobId],
    );
    if (!job || job.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Call Lambda
    const lambdaResponse = await fetch(`${API_GATEWAY_URL}/bank/job/${jobId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await lambdaResponse.json();

    if (!lambdaResponse.ok) {
      return NextResponse.json(data, { status: lambdaResponse.status });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('[Bank Job Status] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
