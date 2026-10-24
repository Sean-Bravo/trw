import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getUserTier } from '@/lib/auth-db';
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

  const tier = await getUserTier(session.user.id);

  return (
    <div className="min-h-screen bg-app-bg text-app-text relative">

      <DashboardHeader user={session.user} tier={tier} />

      <DashboardClient userId={session.user.id}>
        <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Title + stats row */}
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <h1 className="text-[28px] font-bold tracking-tight text-app-text">Dashboard</h1>
              <p className="text-app-muted mt-1">Convert exchange CSVs and bank statements into tax-ready files.</p>
            </div>
            <DashboardStats />
          </div>

          {/* Main Grid: Upload + AI Insights - Side by Side */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6 items-start">
            {/* Upload Section with Mode Selector */}
            <UploadSection />

            {/* AI Insights Panel */}
            <AIInsightsPanel />
          </div>

          {/* What changed: renders only for a finished job */}
          <div className="mb-6 empty:hidden">
            <DiffViewer />
          </div>

          {/* Processing History */}
          <div className="bg-app-card border border-app-border rounded-2xl p-6">
            <JobHistoryTable />
          </div>
        </main>
      </DashboardClient>
    </div>
  );
}
