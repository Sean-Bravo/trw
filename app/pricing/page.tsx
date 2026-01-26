import { Metadata } from 'next';
import { HeaderWithSession } from '@/components/marketing/HeaderWithSession';
import { Pricing } from '@/components/marketing/Pricing';
import { FAQ } from '@/components/marketing/FAQ';
import { Footer } from '@/components/marketing/Footer';

export const metadata: Metadata = {
  title: 'Pricing | TaxFormatter',
  description: 'Simple, transparent pricing. No hidden fees. Pay for what you need to file your crypto taxes this year.',
  openGraph: {
    title: 'Pricing | TaxFormatter',
    description: 'Simple, transparent pricing. No hidden fees. Pay for what you need to file your crypto taxes this year.',
  },
};

export default function PricingPage() {
  return (
    <>
      <HeaderWithSession />
      <main className="min-h-screen bg-[#020617]">
        <div className="pt-20">
          <Pricing />
          <FAQ />
        </div>
      </main>
      <Footer />
    </>
  );
}
