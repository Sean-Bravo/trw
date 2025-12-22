import React from 'react';
import { Container } from '../layout/Container';
import { FileText, Calculator, LineChart, Receipt, ArrowRight } from 'lucide-react';

const platforms = [
  { name: 'Koinly', color: 'bg-[#3b82f6]', icon: LineChart, position: 'top' },
  { name: 'TurboTax', color: 'bg-[#ef4444]', icon: Calculator, position: 'right' },
  { name: 'CoinLedger', color: 'bg-[#f59e0b]', icon: Receipt, position: 'bottom' },
  { name: 'ZenLedger', color: 'bg-[#8b5cf6]', icon: FileText, position: 'left' },
  { name: 'TaxAct', color: 'bg-[#10b981]', icon: FileText, position: 'top-right' },
  { name: 'H&R Block', color: 'bg-[#6366f1]', icon: Calculator, position: 'bottom-right' },
  { name: 'CryptoTaxCalculator', color: 'bg-[#ec4899]', icon: LineChart, position: 'bottom-left' },
  { name: 'Accointing', color: 'bg-[#14b8a6]', icon: Receipt, position: 'top-left' },
];

const positionMap: Record<string, string> = {
  'top': 'top-0 left-1/2 -translate-x-1/2 -translate-y-24',
  'right': 'top-1/2 right-0 translate-x-24 -translate-y-1/2',
  'bottom': 'bottom-0 left-1/2 -translate-x-1/2 translate-y-24',
  'left': 'top-1/2 left-0 -translate-x-24 -translate-y-1/2',
  'top-right': 'top-0 right-0 translate-x-16 -translate-y-16',
  'bottom-right': 'bottom-0 right-0 translate-x-16 translate-y-16',
  'bottom-left': 'bottom-0 left-0 -translate-x-16 translate-y-16',
  'top-left': 'top-0 left-0 -translate-x-16 -translate-y-16',
};

export function ExportFormats() {
  return (
    <section className="bg-slate-50 py-24 sm:py-32 overflow-hidden">
      <Container>
        <div className="text-center mb-20">
          <h2 className="font-poppins text-3xl sm:text-4xl font-bold text-[#1a365d] mb-4 leading-tight">
            Export to Any Tax Platform
          </h2>
          <p className="text-lg text-[#4b5563] max-w-2xl mx-auto">
            One tool. Universal compatibility. No vendor lock-in.
          </p>
        </div>

        {/* Hub and Spoke Diagram */}
        <div className="max-w-5xl mx-auto">
          <div className="relative aspect-square max-w-2xl mx-auto">
            {/* Center Hub */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <div className="relative group">
                {/* Pulsing rings */}
                <div className="absolute inset-0 bg-[#3b82f6] rounded-full opacity-20 animate-ping"></div>
                <div className="absolute inset-0 bg-[#3b82f6] rounded-full opacity-10 blur-xl"></div>

                {/* Main hub circle */}
                <div className="relative w-40 h-40 bg-gradient-to-br from-[#3b82f6] to-[#2563eb] rounded-full flex items-center justify-center shadow-2xl border-4 border-white">
                  <div className="text-center">
                    {/* Logo icon */}
                    <div className="w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                        <path d="M14 7l5 5-5 5M9 7l5 5-5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="text-white font-poppins text-sm font-bold">TaxReady</div>
                    <div className="text-white/80 font-poppins text-xs">Wallet</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Platform Nodes */}
            {platforms.map((platform, index) => {
              const Icon = platform.icon;
              const position = positionMap[platform.position];

              return (
                <div
                  key={index}
                  className={`absolute ${position} z-10 group cursor-pointer`}
                >
                  {/* Connection line */}
                  <div className="absolute top-1/2 left-1/2 w-px h-24 bg-gradient-to-b from-[#3b82f6]/40 to-transparent origin-bottom rotate-0 group-hover:from-[#3b82f6] transition-colors duration-300"
                    style={{
                      transform: `rotate(${
                        platform.position === 'top' ? '180deg' :
                        platform.position === 'right' ? '90deg' :
                        platform.position === 'bottom' ? '0deg' :
                        platform.position === 'left' ? '-90deg' :
                        platform.position === 'top-right' ? '135deg' :
                        platform.position === 'bottom-right' ? '45deg' :
                        platform.position === 'bottom-left' ? '-45deg' :
                        '-135deg'
                      })`,
                      transformOrigin: 'center',
                    }}
                  ></div>

                  {/* Platform bubble */}
                  <div className="relative bg-white rounded-2xl p-4 shadow-lg border border-[#e5e7eb] hover:shadow-xl hover:border-[#3b82f6]/30 hover:scale-110 transition-all duration-300 min-w-[140px]">
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-12 h-12 ${platform.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="text-center">
                        <p className="font-poppins text-sm font-semibold text-[#1a365d] group-hover:text-[#3b82f6] transition-colors">
                          {platform.name}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom message */}
          <div className="text-center mt-20">
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
        </div>
      </Container>
    </section>
  );
}
