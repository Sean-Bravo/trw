import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getJobById, cancelJob } from '@/lib/jobs-db';

/**
 * POST /api/jobs/[jobId]/cancel
 * Mark a queued/running job canceled so the dashboard stops waiting on it.
 * The processor Lambda can't be interrupted mid-run; if it finishes later the
 * job stays canceled, because the status route serves terminal jobs from the DB.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await params;

    const dbJob = await getJobById(jobId);
    if (!dbJob || dbJob.upload.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const canceled = await cancelJob(jobId);
    if (!canceled) {
      return NextResponse.json(
        { error: 'Job already finished' },
        { status: 409 }
      );
    }

    return NextResponse.json({ jobId, status: 'canceled' });
  } catch (error) {
    console.error('[Job Cancel] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
