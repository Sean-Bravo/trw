import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { UploadSection } from '@/components/dashboard/UploadSection';
import { JobHistoryTable } from '@/components/dashboard/JobHistoryTable';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';
import { DiffViewer } from '@/components/dashboard/DiffViewer';
import { DashboardStats } from '@/components/dashboard/DashboardStats';

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
        <div className="absolute top-20 left-1/4 w-150 h-150 bg-blue-500/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-125 h-125 bg-cyan-500/6 rounded-full blur-[120px]" />
      </div>

      <DashboardHeader user={session.user} />

      <DashboardClient userId={session.user.id}>
        <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Stats Row */}
          <DashboardStats />

          {/* Main Grid: Upload + AI Insights - Side by Side */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Upload Section with Mode Selector */}
            <UploadSection />

            {/* AI Insights Panel */}
            <AIInsightsPanel />
          </div>

          {/* Diff Viewer */}
          <div className="mb-8">
            <DiffViewer />
          </div>

          {/* Processing History */}
          <div className="bg-white/3 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Processing History</h2>
                <p className="text-slate-400 text-sm">Track uploads and download results</p>
              </div>
            </div>
            <JobHistoryTable />
          </div>
        </main>
      </DashboardClient>
    </div>
  );
}
