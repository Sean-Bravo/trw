import type { Metadata } from 'next';
import { HeaderWithSession } from '@/components/marketing/HeaderWithSession';
import { Footer } from '@/components/marketing/Footer';

export const metadata: Metadata = {
  alternates: { canonical: '/playground' },
  title: 'API Playground',
  description:
    'Send a live request to the TaxFormatter parse endpoint from your browser. No key required — see the JSON response before you write a line of code.',
};

export default function PlaygroundLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HeaderWithSession />
      {children}
      <Footer />
    </>
  );
}
