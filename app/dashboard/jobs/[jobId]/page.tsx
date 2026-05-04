import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getJobById } from '@/lib/jobs-db';
import { getUserTier } from '@/lib/auth-db';
import { JobDetailClient } from './JobDetailClient';

export const metadata = {
  title: 'Job Details | TaxFormatter',
  description: 'View and compare your processed CSV file',
};

interface JobDetailPageProps {
  params: Promise<{ jobId: string }>;
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const { jobId } = await params;
  const job = await getJobById(jobId);

  if (!job) {
    notFound();
  }

  // Verify user owns this job
  if (job.upload.user_id !== session.user.id) {
    notFound();
  }

  const userTier = await getUserTier(session.user.id);

  return (
    <div className="min-h-screen bg-[#0a1628] relative">
      {/* Gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-150 h-150 bg-blue-500/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-125 h-125 bg-cyan-500/6 rounded-full blur-[120px]" />
      </div>

      <JobDetailClient
        job={{
          id: job.id,
          uploadId: job.upload_id,
          status: job.status,
          result: job.result,
          error: job.error,
          createdAt: job.created_at.toISOString(),
          startedAt: job.started_at?.toISOString() ?? null,
          finishedAt: job.finished_at?.toISOString() ?? null,
          filename: job.upload.filename,
          s3Key: job.upload.s3_key,
        }}
        userId={session.user.id}
        userTier={userTier}
        userName={session.user.name || session.user.email?.split('@')[0] || 'User'}
      />
    </div>
  );
}
