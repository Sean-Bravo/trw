import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getUserTier } from '@/lib/auth-db';
import { SettingsClient } from './SettingsClient';

export const metadata = {
  title: 'Settings | TaxFormatter',
  description: 'Manage your account settings and security',
};

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const tier = await getUserTier(session.user.id);

  return <SettingsClient user={session.user} tier={tier} />;
}
