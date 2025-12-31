import { Download, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';

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
        <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">
          No uploads yet
        </h3>
        <p className="text-sm text-slate-600 mb-6">
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

function FileText({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function JobRow({ job }: { job: any }) {
  const statusConfig = {
    queued: {
      icon: <Clock className="h-5 w-5 text-slate-500" />,
      text: 'Queued',
      bgColor: 'bg-slate-100',
      textColor: 'text-slate-700',
    },
    processing: {
      icon: <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />,
      text: 'Processing',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
    },
    completed: {
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      text: 'Completed',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
    },
    failed: {
      icon: <XCircle className="h-5 w-5 text-red-600" />,
      text: 'Failed',
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
    },
  };

  const status = statusConfig[job.status as keyof typeof statusConfig] || statusConfig.queued;

  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200">
      <div className="flex items-center space-x-4 flex-1">
        {/* Status Icon */}
        <div className={`${status.bgColor} p-2 rounded-lg`}>
          {status.icon}
        </div>

        {/* Job Details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">
            {job.filename}
          </p>
          <div className="flex items-center space-x-4 mt-1">
            <span className={`text-xs font-medium ${status.textColor}`}>
              {status.text}
            </span>
            <span className="text-xs text-slate-500">
              {new Date(job.createdAt).toLocaleDateString()}
            </span>
            {job.transactionCount && (
              <span className="text-xs text-slate-500">
                {job.transactionCount} transactions
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2">
        {job.status === 'completed' && (
          <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            <Download className="h-4 w-4 mr-1" />
            Download
          </button>
        )}
        {job.status === 'failed' && (
          <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
