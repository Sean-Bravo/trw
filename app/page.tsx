import { Header } from '@/components/marketing/Header';
import { Hero } from '@/components/marketing/Hero';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { CostOfClarity } from '@/components/marketing/CostOfClarity';
import { SecurityFeatures } from '@/components/marketing/SecurityFeatures';
import { Testimonials } from '@/components/marketing/Testimonials';
import { SupportedExchanges } from '@/components/marketing/SupportedExchanges';
import { ExportFormats } from '@/components/marketing/ExportFormats';
import { FAQ } from '@/components/marketing/FAQ';
import { FinalCTA } from '@/components/marketing/FinalCTA';
import { Pricing } from '@/components/marketing/Pricing';
import { Footer } from '@/components/marketing/Footer';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <HowItWorks />
      <CostOfClarity />
      <SecurityFeatures />
      <Testimonials />
      <SupportedExchanges />
      <ExportFormats />
      <FAQ />
      <Pricing />
      <FinalCTA />
      <Footer />
    </main>
  );
}
