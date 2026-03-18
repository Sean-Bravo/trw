import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ApiKeyManager } from '@/components/dashboard/ApiKeyManager';

export const metadata = {
  title: 'Developer API | TaxFormatter',
  description: 'Manage your TaxFormatter API keys and usage',
};

export default async function DeveloperPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[#0a1628] relative">
      {/* Gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-[600px] h-[600px] bg-blue-500/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/6 rounded-full blur-[120px]" />
      </div>

      <DashboardHeader user={session.user} />

      <main className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">Developer API</h1>
          <p className="text-gray-400 mt-1">
            Manage your API keys and monitor usage. Parse crypto CSVs and bank statement PDFs programmatically.
          </p>
        </div>

        <ApiKeyManager />
      </main>
    </div>
  );
}
