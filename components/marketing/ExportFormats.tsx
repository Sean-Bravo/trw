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
    <section className="bg-gradient-to-b from-white to-[#f0f9ff] py-16 sm:py-24">
      <Container>
        <div className="text-center mb-12">
          <h2 className="font-poppins text-3xl sm:text-4xl font-bold text-[#1a365d] mb-4 leading-tight">
            Export to Any Tax Platform
          </h2>
          <p className="text-lg text-[#4b5563] max-w-2xl mx-auto">
            One tool. Universal compatibility. No vendor lock-in.
          </p>
        </div>

        {/* Logo Grid - Changed to 3 columns on desktop for wider cards */}
        <div className="max-w-5xl mx-auto mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {platforms.map((platform) => {
              const extension = platform.slug === 'blockpit' ? 'svg' : 'png';

              return (
                <div key={platform.slug} className="group cursor-pointer">
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e5e7eb] hover:shadow-xl hover:border-[#3b82f6]/40 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center gap-4 h-full">
                    
                    {/* Logo Container: Rectangular (Wide) instead of Square */}
                    <div className="relative w-full h-16 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                      <Image
                        src={`/logos/tax-platforms/${platform.slug}.${extension}`}
                        alt={platform.name}
                        // Use fill + object-contain to let the logo maximize the rectangular space
                        fill
                        className="object-contain px-4" 
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>

                    {/* Text: Larger and Darker */}
                    <p className="font-poppins text-lg font-bold text-[#1a365d] group-hover:text-[#3b82f6] transition-colors">
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