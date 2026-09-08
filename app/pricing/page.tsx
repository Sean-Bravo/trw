import { Metadata } from 'next';
import { HeaderWithSession } from '@/components/marketing/HeaderWithSession';
import { APIPricing } from '@/components/marketing/APIPricing';
import { FAQ } from '@/components/marketing/FAQ';
import { Footer } from '@/components/marketing/Footer';

export const metadata: Metadata = {
  alternates: { canonical: '/pricing' },
  title: 'API Pricing',
  description: 'Simple API pricing that scales with you. Parse crypto CSVs and bank statement PDFs programmatically.',
  openGraph: {
    title: 'Pricing | TaxFormatter API',
    description: 'Simple API pricing that scales with you. Parse crypto CSVs and bank statement PDFs programmatically.',
  },
};

export default function PricingPage() {
  return (
    <>
      <HeaderWithSession />
      <main className="min-h-screen bg-[#020617]">
        <div className="pt-20">
          <APIPricing />
          <FAQ />
        </div>
      </main>
      <Footer />
    </>
  );
}
