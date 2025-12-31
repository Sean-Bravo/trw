import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { FileUploader } from '@/components/dashboard/FileUploader';
import { JobHistoryTable } from '@/components/dashboard/JobHistoryTable';
import { StatsCards } from '@/components/dashboard/StatsCards';

export const metadata = {
  title: 'Dashboard | TaxFormatter',
  description: 'Upload and manage your crypto CSV files for tax processing',
};

export default async function DashboardPage() {
  // Check authentication
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/api/auth/signin?callbackUrl=/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Dashboard Header */}
      <DashboardHeader user={session.user} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome back, {session.user.name || 'User'}
          </h1>
          <p className="text-slate-600">
            Upload your CSV files to get AI-powered tax categorization
          </p>
        </div>

        {/* Stats Cards */}
        <Suspense fallback={<StatsCardsSkeleton />}>
          <StatsCards userId={session.user.id} />
        </Suspense>

        {/* Upload Section */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Upload CSV File
              </h2>
              <p className="text-sm text-slate-600">
                Drag and drop your CSV file or click to browse. Supports exchanges like Binance, Coinbase, Kraken, and more.
              </p>
            </div>
            <FileUploader />
          </div>
        </div>

        {/* Job History */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Processing History
            </h2>
            <p className="text-sm text-slate-600">
              Track your uploaded files and download processed results
            </p>
          </div>
          <Suspense fallback={<JobHistoryTableSkeleton />}>
            <JobHistoryTable userId={session.user.id} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

// Loading skeletons
function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse"
        >
          <div className="h-4 bg-slate-200 rounded w-24 mb-3"></div>
          <div className="h-8 bg-slate-200 rounded w-16 mb-2"></div>
          <div className="h-3 bg-slate-200 rounded w-32"></div>
        </div>
      ))}
    </div>
  );
}

function JobHistoryTableSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between p-4 bg-slate-50 rounded-lg animate-pulse"
        >
          <div className="flex-1">
            <div className="h-4 bg-slate-200 rounded w-48 mb-2"></div>
            <div className="h-3 bg-slate-200 rounded w-32"></div>
          </div>
          <div className="h-8 bg-slate-200 rounded w-24"></div>
        </div>
      ))}
    </div>
  );
}
