import { DashboardSession } from '@/components/auth/DashboardSession';

// Every signed-in page gets the session context and automatic sign-out.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardSession>{children}</DashboardSession>;
}
