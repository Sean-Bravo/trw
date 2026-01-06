import Link from 'next/link';
import { Download, Clock, CheckCircle, XCircle, Loader2, FileText, Eye } from 'lucide-react';

interface JobHistoryTableProps {
  userId: string;
}

export async function JobHistoryTable({ userId }: JobHistoryTableProps) {
  // TODO: Fetch real jobs from API
  const jobs: any[] = [];

  if (jobs.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-zinc-800/50 border border-zinc-700 flex items-center justify-center">
          <FileText className="h-8 w-8 text-zinc-600" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          No uploads yet
        </h3>
        <p className="text-sm text-zinc-500 max-w-sm mx-auto">
          Upload your first CSV file to start processing your crypto transactions
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <JobRow key={job.id} job={job} />
      ))}
    </div>
  );
}

function JobRow({ job }: { job: any }) {
  const statusConfig = {
    queued: {
      icon: <Clock className="h-4 w-4 text-zinc-500" />,
      text: 'Queued',
      color: 'text-zinc-400',
      bg: 'bg-zinc-800/50',
    },
    processing: {
      icon: <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />,
      text: 'Processing',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    completed: {
      icon: <CheckCircle className="h-4 w-4 text-emerald-400" />,
      text: 'Completed',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    failed: {
      icon: <XCircle className="h-4 w-4 text-red-400" />,
      text: 'Failed',
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    },
  };

  const status = statusConfig[job.status as keyof typeof statusConfig] || statusConfig.queued;

  return (
    <div className="flex items-center justify-between p-4 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-xl transition-all duration-200 border border-zinc-800/50 hover:border-zinc-700/50 group">
      <div className="flex items-center gap-4 flex-1">
        {/* Status Icon */}
        <div className={`${status.bg} p-2.5 rounded-lg border border-zinc-700/50`}>
          {status.icon}
        </div>

        {/* Job Details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {job.filename}
          </p>
          <div className="flex items-center gap-4 mt-1">
            <span className={`text-xs font-medium ${status.color}`}>
              {status.text}
            </span>
            <span className="text-xs text-zinc-500">
              {new Date(job.createdAt).toLocaleDateString()}
            </span>
            {job.transactionCount && (
              <span className="text-xs text-zinc-500">
                {job.transactionCount} transactions
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* View button - always show for completed jobs */}
        {job.status === 'completed' && (
          <Link
            href={`/dashboard/jobs/${job.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 hover:border-cyan-500/30 transition-all"
          >
            <Eye className="h-4 w-4" />
            View
          </Link>
        )}
        {job.status === 'completed' && (
          <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 hover:border-zinc-600 transition-all">
            <Download className="h-4 w-4" />
            Download
          </button>
        )}
        {job.status === 'failed' && (
          <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors">
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
