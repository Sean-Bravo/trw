import React from 'react';
import { Container } from '../layout/Container';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

const platforms = [
  { name: 'Koinly', slug: 'koinly' },
  { name: 'TurboTax', slug: 'turbotax' },
  { name: 'CoinLedger', slug: 'coinledger' },
  { name: 'ZenLedger', slug: 'zenledger' },
  { name: 'TaxAct', slug: 'taxact' },
  { name: 'H&R Block', slug: 'h-rblock' },
  { name: 'Summ', slug: 'summ' },
  { name: 'Blockpit', slug: 'blockpit' },
];

export function ExportFormats() {
  return (
    // Main section background with a subtle gradient
    <section className="bg-gradient-to-b from-blue-50 via-white to-blue-50 py-16 sm:py-24">
      <Container>
        <div className="text-center mb-12">
          <h2 className="font-poppins text-3xl sm:text-4xl font-bold text-[#1a365d] mb-4 leading-tight">
            Export to Any Tax Platform
          </h2>
          <p className="text-lg text-[#4b5563] max-w-2xl mx-auto">
            One tool. Universal compatibility. No vendor lock-in.
          </p>
        </div>

        {/* Logo Grid with Gradient Cards */}
        <div className="max-w-5xl mx-auto mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {platforms.map((platform) => {
              const extension = platform.slug === 'blockpit' ? 'svg' : 'png';

              return (
                <div key={platform.slug} className="group cursor-pointer">
                  {/* Card Redesign:
                    - Changed bg-white to a gradient (from-white to-blue-100/50)
                    - Added a soft border gradient effect on hover
                    - Increased shadow on hover
                  */}
                  <div className="bg-gradient-to-br from-white to-blue-100/30 rounded-xl p-6 shadow-md border border-blue-100 hover:shadow-xl hover:border-blue-300/50 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center gap-4 h-full relative overflow-hidden">
                    
                    {/* Decorative background element for gradient effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                    {/* Logo Container: Rectangular for better fit */}
                    <div className="relative w-full h-16 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 z-10">
                      <Image
                        src={`/logos/tax-platforms/${platform.slug}.${extension}`}
                        alt={platform.name}
                        fill
                        className="object-contain px-4" 
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      />
                    </div>

                    {/* Text: Larger and Darker */}
                    <p className="font-poppins text-lg font-bold text-[#1a365d] group-hover:text-[#3b82f6] transition-colors z-10">
                      {platform.name}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <p className="text-[#4b5563] mb-4">
            <span className="font-semibold text-[#1a365d]">8+ platforms supported</span> with more added every week
          </p>
          <a
            href="#platforms"
            className="inline-flex items-center gap-2 text-[#3b82f6] hover:text-[#2563eb] font-semibold text-lg transition-colors"
          >
            See all supported platforms
            <ArrowRight className="h-5 w-5" />
          </a>
        </div>
      </Container>
    </section>
  );
}