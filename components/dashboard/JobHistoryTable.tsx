import { Download, Clock, CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';

interface JobHistoryTableProps {
  userId: string;
}

export async function JobHistoryTable({ userId }: JobHistoryTableProps) {
  // TODO: Fetch real jobs from API
  // For now, return placeholder data
  const jobs: any[] = [];

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <FileText className="h-8 w-8 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
          No uploads yet
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-sm mx-auto">
          Upload your first CSV file to get started with AI-powered tax categorization
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
      icon: <Clock className="h-5 w-5 text-slate-500 dark:text-slate-400" />,
      text: 'Queued',
      bgColor: 'bg-slate-100 dark:bg-slate-700',
      textColor: 'text-slate-700 dark:text-slate-300',
    },
    processing: {
      icon: <Loader2 className="h-5 w-5 text-[var(--color-primary-500)] animate-spin" />,
      text: 'Processing',
      bgColor: 'bg-[var(--color-primary-500)]/10',
      textColor: 'text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]',
    },
    completed: {
      icon: <CheckCircle className="h-5 w-5 text-[var(--color-accent-500)]" />,
      text: 'Completed',
      bgColor: 'bg-[var(--color-accent-500)]/10',
      textColor: 'text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]',
    },
    failed: {
      icon: <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />,
      text: 'Failed',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
      textColor: 'text-red-700 dark:text-red-400',
    },
  };

  const status = statusConfig[job.status as keyof typeof statusConfig] || statusConfig.queued;

  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 border border-transparent hover:border-[var(--color-primary-500)]/20 group">
      <div className="flex items-center space-x-4 flex-1">
        {/* Status Icon */}
        <div className={`${status.bgColor} p-2.5 rounded-xl`}>
          {status.icon}
        </div>

        {/* Job Details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
            {job.filename}
          </p>
          <div className="flex items-center space-x-4 mt-1">
            <span className={`text-xs font-medium ${status.textColor}`}>
              {status.text}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {new Date(job.createdAt).toLocaleDateString()}
            </span>
            {job.transactionCount && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {job.transactionCount} transactions
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2">
        {job.status === 'completed' && (
          <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-[var(--color-primary-500)]/30 transition-all duration-200 group-hover:shadow-sm">
            <Download className="h-4 w-4 mr-1.5" />
            Download
          </button>
        )}
        {job.status === 'failed' && (
          <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
