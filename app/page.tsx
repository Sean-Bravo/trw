import { HeaderWithSession } from '@/components/marketing/HeaderWithSession';
import { APIHero } from '@/components/marketing/APIHero';
import { APIDemo } from '@/components/marketing/APIDemo';
import { AgentSection } from '@/components/marketing/AgentSection';
import { APICapabilities } from '@/components/marketing/APICapabilities';
import { APIPricing } from '@/components/marketing/APIPricing';
import TrustEngine from '@/components/marketing/TrustEngine';
import { FAQ } from '@/components/marketing/FAQ';
import { Footer } from '@/components/marketing/Footer';
import { SoftwareApplicationSchema } from '@/components/seo/SoftwareApplicationSchema';
import { WebAPISchemaComponent } from '@/components/seo/WebAPISchema';


export default function Home() {
  return (
    <>
      <SoftwareApplicationSchema />
      <WebAPISchemaComponent />
      <main className="min-h-screen">
        <HeaderWithSession />
        <APIHero />
        <APIDemo />
        <AgentSection />
        <APICapabilities />
        <APIPricing />
        <TrustEngine />
        <FAQ />
        <Footer />
      </main>
    </>
  );
}
