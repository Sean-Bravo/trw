import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: '/signup' },
  title: 'Create an Account',
  description: 'Create a TaxFormatter account and get an API key. Free tier, no credit card required.',
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
