import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { FileUploader } from '@/components/dashboard/FileUploader';
import { JobHistoryTable } from '@/components/dashboard/JobHistoryTable';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';

export const metadata = {
  title: 'Dashboard | TaxFormatter',
  description: 'Upload and manage your crypto CSV files for tax processing',
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  if (!session.user.id) {
    console.error('[Dashboard] Session missing user.id, forcing re-auth');
    redirect('/api/auth/signout?callbackUrl=/api/auth/signin');
  }

  return (
    <div className="min-h-screen bg-[#0a1628] relative">
      {/* Gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-[600px] h-[600px] bg-blue-500/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/6 rounded-full blur-[120px]" />
      </div>

      <DashboardHeader user={session.user} />

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Welcome */}
        <div className="mb-10">
          <p className="text-xl text-slate-300">Upload your CSV files to get AI-powered tax categorization</p>
        </div>

        {/* Stats Row - Compact circular indicators */}
        <div className="flex items-center gap-8 mb-8">
          <CircleStat value={0} max={100} label="Uploads" color="blue" />
          <CircleStat value={0} max={100} label="Completed" color="emerald" />
          <CircleStat value={0} max={100} label="Processing" color="amber" />
        </div>

        {/* Main Grid: Upload + AI Insights - Side by Side */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Upload Section */}
          <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white mb-1">Upload CSV File</h2>
              <p className="text-slate-400 text-sm">Drag and drop your CSV file or click to browse</p>
            </div>
            <FileUploader />
          </div>

          {/* AI Insights Panel */}
          <AIInsightsPanel />
        </div>

        {/* Processing History */}
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Processing History</h2>
              <p className="text-slate-400 text-sm">Track uploads and download results</p>
            </div>
          </div>
          <Suspense fallback={<JobHistoryTableSkeleton />}>
            <JobHistoryTable userId={session.user.id} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

function CircleStat({ value, max, label, color }: { value: number; max: number; label: string; color: 'blue' | 'emerald' | 'amber' }) {
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

function JobHistoryTableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl animate-pulse">
          <div className="flex-1">
            <div className="h-4 bg-white/10 rounded w-48 mb-2" />
            <div className="h-3 bg-white/10 rounded w-32" />
          </div>
          <div className="h-8 bg-white/10 rounded w-24" />
        </div>
      ))}
    </div>
  );
}
