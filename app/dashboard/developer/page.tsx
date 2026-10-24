import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getUserTier } from '@/lib/auth-db';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ApiKeyManager } from '@/components/dashboard/ApiKeyManager';

export const metadata = {
  title: 'Developer API | TaxFormatter',
  description: 'Manage your TaxFormatter API keys and usage',
};

export default async function DeveloperPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const tier = await getUserTier(session.user.id);

  return (
    <div className="min-h-screen bg-app-bg relative">

      <DashboardHeader user={session.user} tier={tier} />

      <main className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-app-text">Developer API</h1>
          <p className="text-app-muted mt-1">
            Manage your API keys and monitor usage. Parse crypto CSVs and bank statement PDFs programmatically.
          </p>
        </div>

        <ApiKeyManager />
      </main>
    </div>
  );
}
