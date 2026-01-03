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

  // If session exists but user.id is missing, force re-authentication
  if (!session.user.id) {
    console.error('[Dashboard] Session missing user.id, forcing re-auth');
    redirect('/api/auth/signout?callbackUrl=/api/auth/signin');
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Gradient mesh background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--color-primary-500)]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[var(--color-accent-500)]/10 rounded-full blur-[100px]" />
      </div>

      {/* Dashboard Header */}
      <DashboardHeader user={session.user} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Welcome back, {session.user.name || 'User'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Upload your CSV files to get AI-powered tax categorization
          </p>
        </div>

        {/* Stats Cards */}
        <Suspense fallback={<StatsCardsSkeleton />}>
          <StatsCards userId={session.user.id} />
        </Suspense>

        {/* Upload Section + AI Insights - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Upload CSV - Left */}
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl shadow-lg shadow-black/5 border border-white/20 dark:border-slate-700/50 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Upload CSV File
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Drag and drop your CSV file or click to browse. Supports exchanges like Binance, Coinbase, Kraken, and more.
              </p>
            </div>
            <FileUploader />
          </div>

          {/* AI Insights - Right */}
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl shadow-lg shadow-black/5 border border-white/20 dark:border-slate-700/50 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                AI-Powered Insights
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Our AI automatically categorizes your transactions for tax reporting
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white">Smart Categorization</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Automatically identifies trades, transfers, staking rewards, and more</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white">Cost Basis Tracking</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">FIFO, LIFO, and specific identification methods supported</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white">Tax-Ready Export</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Export to TurboTax, TaxAct, Koinly, and Form 8949</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Job History */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl shadow-lg shadow-black/5 border border-white/20 dark:border-slate-700/50 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Processing History
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
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
          className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl shadow-lg shadow-black/5 border border-white/20 dark:border-slate-700/50 p-6 animate-pulse"
        >
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-3"></div>
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16 mb-2"></div>
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
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
          className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl animate-pulse"
        >
          <div className="flex-1">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-2"></div>
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
          </div>
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
        </div>
      ))}
    </div>
  );
}
