import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { FileUploader } from '@/components/dashboard/FileUploader';
import { JobHistoryTable } from '@/components/dashboard/JobHistoryTable';

export const metadata = {
  title: 'Dashboard | TaxFormatter',
  description: 'Upload and manage your crypto CSV files for tax processing',
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/api/auth/signin?callbackUrl=/dashboard');
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
          <h1 className="text-3xl font-bold text-white">
            Welcome back, {session.user.name?.split(' ')[0] || session.user.email?.split('@')[0] || 'there'}
          </h1>
          <p className="text-slate-400 mt-1">Upload your CSV files to get AI-powered tax categorization</p>
        </div>

        {/* Stats Row - Compact */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard number="0" label="Total Uploads" />
          <StatCard number="0" label="Completed" accent />
          <StatCard number="0" label="Processing" />
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

          {/* AI Insights Panel - Matching the design from docs */}
          <div className="bg-[#0d2847]/80 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden">
            {/* Subtle glow effects */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-[60px]" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-[50px]" />

            <h2 className="text-lg font-semibold text-white mb-5 relative">AI Insights Panel</h2>

            <div className="space-y-3 relative">
              {/* Exchange Detected */}
              <div className="bg-white rounded-xl p-4 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Exchange Detected:</p>
                    <p className="text-slate-600 text-sm">Waiting for upload...</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded-full">
                  Idle
                </span>
              </div>

              {/* Analyzing Transactions */}
              <div className="bg-white rounded-xl p-4 shadow-lg border-2 border-amber-400/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-slate-800">Analyzing Transactions...</p>
                  <span className="text-slate-500 text-sm">0 found</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full w-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500" />
                </div>
              </div>

              {/* Tax Flags */}
              <div className="bg-orange-50 rounded-xl p-4 flex items-center gap-3 shadow-lg">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Tax Flags</p>
                  <p className="text-slate-500 text-sm">No issues detected yet</p>
                </div>
              </div>
            </div>

            {/* Bottom info */}
            <div className="mt-5 pt-4 border-t border-white/10 relative">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span>Panels update in real-time during processing</span>
              </div>
            </div>
          </div>
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

function StatCard({ number, label, accent }: { number: string; label: string; accent?: boolean }) {
  return (
    <div className={`bg-white/[0.03] backdrop-blur-sm border rounded-xl p-4 ${accent ? 'border-emerald-500/30' : 'border-white/10'}`}>
      <p className={`text-2xl font-bold ${accent ? 'text-emerald-400' : 'text-white'}`}>{number}</p>
      <p className="text-slate-400 text-sm">{label}</p>
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
