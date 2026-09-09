import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: '/login' },
  title: 'Sign In',
  description: 'Sign in to your TaxFormatter account to manage API keys, usage, and billing.',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
