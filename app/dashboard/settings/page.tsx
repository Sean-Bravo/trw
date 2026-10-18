import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getUserTier } from '@/lib/auth-db';
import { queryOne } from '@/lib/db';
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
  // Google-only accounts have no password to re-enter before 2FA changes.
  const row = await queryOne<{ has_password: boolean }>(
    'SELECT password_hash IS NOT NULL AS has_password FROM users WHERE id = $1',
    [session.user.id]
  );

  return <SettingsClient user={session.user} tier={tier} hasPassword={row?.has_password ?? true} />;
}
