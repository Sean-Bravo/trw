import React from 'react';
import { Container } from '../layout/Container';
import { FileText, Calculator, LineChart, Receipt, ArrowRight } from 'lucide-react';

const platforms = [
  { name: 'Koinly', color: 'bg-[#3b82f6]', icon: LineChart },
  { name: 'TurboTax', color: 'bg-[#ef4444]', icon: Calculator },
  { name: 'CoinLedger', color: 'bg-[#f59e0b]', icon: Receipt },
  { name: 'ZenLedger', color: 'bg-[#8b5cf6]', icon: FileText },
  { name: 'TaxAct', color: 'bg-[#10b981]', icon: FileText },
  { name: 'H&R Block', color: 'bg-[#6366f1]', icon: Calculator },
  { name: 'Summ', color: 'bg-[#ec4899]', icon: LineChart },
  { name: 'Accointing', color: 'bg-[#14b8a6]', icon: Receipt },
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

        {/* Simple Grid */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {platforms.map((platform, index) => {
              const Icon = platform.icon;

              return (
                <div
                  key={index}
                  className="group cursor-pointer"
                >
                  <div className="bg-white rounded-2xl p-6 shadow-md border border-[#e5e7eb] hover:shadow-lg hover:border-[#3b82f6]/30 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center gap-3 h-full">
                    <div className={`w-14 h-14 ${platform.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <p className="font-poppins text-sm font-semibold text-[#1a365d] text-center group-hover:text-[#3b82f6] transition-colors line-clamp-2">
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
            className="inline-flex items-center gap-2 text-[#3b82f6] hover:text-[#2563eb] font-semibold transition-colors"
          >
            See all supported platforms
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </Container>
    </section>
  );
}