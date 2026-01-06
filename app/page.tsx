import { Header } from '@/components/marketing/Header';
import { Hero } from '@/components/marketing/Hero';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { SocialProof } from '@/components/marketing/SocialProof';
import { Integrations } from '@/components/marketing/Integrations';
import TrustEngine from '@/components/marketing/TrustEngine';
import { Pricing } from '@/components/marketing/Pricing';
import { FAQ } from '@/components/marketing/FAQ';
import { Footer } from '@/components/marketing/Footer';
import { SoftwareApplicationSchema } from '@/components/seo/SoftwareApplicationSchema';


export default function Home() {
  return (
    <>
      <SoftwareApplicationSchema />
      <main className="min-h-screen">
        <Header />
        <Hero />
        <HowItWorks />
        <SocialProof />
        <Integrations />
        <TrustEngine />
        <Pricing />
        <FAQ />
        <Footer />
      </main>
    </>
  );
}
