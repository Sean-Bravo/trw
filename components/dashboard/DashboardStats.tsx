'use client';

import { useJobContext } from '@/contexts/JobContext';
import { isTimedOut } from '@/lib/job-staleness';

export function DashboardStats() {
  const { unifiedHistory } = useJobContext();

  // Calculate stats from unified history (crypto + bank jobs)
  const totalUploads = unifiedHistory.length;
  const completed = unifiedHistory.filter((j) => j.status === 'completed').length;
  const failed = unifiedHistory.filter((j) => j.status === 'failed').length;
  // Stuck jobs used to count as "Processing" forever.
  const timedOut = unifiedHistory.filter((j) => isTimedOut(j)).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full sm:w-auto sm:min-w-120">
      <StatTile label="Uploads" value={totalUploads} />
      <StatTile label="Completed" value={completed} tone="text-app-success" />
      <StatTile label="Failed" value={failed} tone="text-app-error" />
      <StatTile label="Timed out" value={timedOut} tone="text-app-warn" />
    </div>
  );
}

function StatTile({ label, value, tone = 'text-app-text' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="bg-app-card border border-app-border rounded-xl px-4 py-3">
      <p className="text-[13px] text-app-muted">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}
