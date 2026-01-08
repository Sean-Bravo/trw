'use client';

import { useJobContext } from '@/contexts/JobContext';

export function DashboardStats() {
  const { jobHistory } = useJobContext();

  // Calculate stats from job history
  const totalUploads = jobHistory.length;
  const completed = jobHistory.filter((j) => j.status === 'succeeded').length;
  const processing = jobHistory.filter((j) => j.status === 'queued' || j.status === 'running').length;

  return (
    <div className="flex items-center gap-8 mb-8">
      <CircleStat value={totalUploads} max={100} label="Uploads" color="blue" />
      <CircleStat value={completed} max={100} label="Completed" color="emerald" />
      <CircleStat value={processing} max={100} label="Processing" color="amber" />
    </div>
  );
}

function CircleStat({
  value,
  max,
  label,
  color,
}: {
  value: number;
  max: number;
  label: string;
  color: 'blue' | 'emerald' | 'amber';
}) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colors = {
    blue: { stroke: 'stroke-blue-500', text: 'text-blue-400', bg: 'stroke-blue-500/20' },
    emerald: { stroke: 'stroke-emerald-500', text: 'text-emerald-400', bg: 'stroke-emerald-500/20' },
    amber: { stroke: 'stroke-amber-500', text: 'text-amber-400', bg: 'stroke-amber-500/20' },
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            strokeWidth="4"
            className={colors[color].bg}
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            className={colors[color].stroke}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: strokeDashoffset,
              transition: 'stroke-dashoffset 0.5s ease',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-bold ${colors[color].text}`}>{value}</span>
        </div>
      </div>
      <span className="text-slate-400 text-sm">{label}</span>
    </div>
  );
}
