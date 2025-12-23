import React from 'react';
import { Container } from '../layout/Container';
import { Check, X, Clock, DollarSign, Shield, Zap } from 'lucide-react';

export function CostOfClarity() {
  return (
    <section className="bg-gradient-to-b from-white via-[#f8f9ff] to-white py-16 sm:py-20 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-[#3b82f6]/8 rounded-full blur-3xl animate-float animation-delay-500"></div>
        <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-[#059669]/5 rounded-full blur-3xl animate-float animation-delay-300"></div>
      </div>

      <Container>
        <div className="text-center mb-8 relative z-10">
          <h2 className="font-poppins text-4xl sm:text-5xl font-bold text-[#1a365d] mb-3 leading-tight">
            Why We Win
          </h2>
          <p className="text-lg text-[#4b5563] max-w-2xl mx-auto">
            Stop overpaying for tools that still require manual work.
          </p>
        </div>

        <div className="max-w-5xl mx-auto overflow-visible rounded-2xl border-2 border-[#e5e7eb] shadow-2xl bg-white relative z-10">
          <div className="grid grid-cols-3">
            
            {/* Column 1: Feature Labels */}
            <div className="bg-gradient-to-b from-[#f9fafb] to-[#f3f4f6] p-8 flex flex-col justify-center gap-8 border-r border-[#e5e7eb]">
              <div className="h-12"></div> {/* Spacer for header */}
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#3b82f6]/10 rounded-lg">
                  <Clock className="h-5 w-5 text-[#3b82f6]" />
                </div>
                <span className="font-semibold text-[#1a365d]">Time per file</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#059669]/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-[#059669]" />
                </div>
                <span className="font-semibold text-[#1a365d]">Cost per year</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#8B5CF6]/10 rounded-lg">
                  <Shield className="h-5 w-5 text-[#8B5CF6]" />
                </div>
                <span className="font-semibold text-[#1a365d]">Accuracy</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#F59E0B]/10 rounded-lg">
                  <Zap className="h-5 w-5 text-[#F59E0B]" />
                </div>
                <span className="font-semibold text-[#1a365d]">Auto-Formatting</span>
              </div>
            </div>

            {/* Column 2: Manual / CPAs */}
            <div className="p-8 flex flex-col items-center gap-8 border-r border-[#e5e7eb] bg-gradient-to-b from-[#f9fafb]/50 to-white hover:bg-gradient-to-b hover:from-[#f3f4f6] hover:to-[#fafbfc] transition-all duration-300">
              <div className="h-12 flex items-center justify-center">
                <span className="font-bold text-[#6b7280] uppercase tracking-wider text-xs">Manual / CPAs</span>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-[#DC2626] mb-1">8 hrs</div>
                <div className="text-xs text-[#6b7280]">per file</div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-[#DC2626] mb-1">$1,500+</div>
                <div className="text-xs text-[#6b7280]">or your time</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <X className="h-6 w-6 text-[#EF4444]" />
                  <span className="text-xl font-bold text-[#EF4444]">15%</span>
                </div>
                <div className="text-xs text-[#6b7280]">error prone</div>
              </div>

              <div className="flex justify-center">
                <div className="p-2 bg-[#FEE2E2] rounded-lg">
                  <X className="h-6 w-6 text-[#DC2626]" />
                </div>
              </div>
            </div>

            {/* Column 3: TaxReadyWallet (The Winner) */}
            <div className="relative pt-8 px-8 pb-8 flex flex-col items-center gap-8 bg-gradient-to-br from-[#1a365d] to-[#0f172a] text-white group hover:shadow-inner transition-all duration-300">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              {/* "Best Choice" Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg transform hover:scale-110 transition-transform duration-300 z-20 whitespace-nowrap">
                ⭐ BEST VALUE
              </div>

              <div className="h-12 flex items-center justify-center relative z-10">
                <span className="font-poppins font-bold text-white uppercase tracking-wider text-lg">TaxReadyWallet</span>
              </div>

              <div className="text-center relative z-10 group/item">
                <div className="text-4xl font-bold text-[#60A5FA] mb-1">30s</div>
                <div className="text-sm text-[#93C5FD]">per file</div>
              </div>

              <div className="text-center relative z-10">
                <div className="text-4xl font-bold text-[#4ADE80] mb-1">$49</div>
                <div className="text-sm text-[#86EFAC]">/ year</div>
              </div>

              <div className="text-center relative z-10">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Shield className="h-6 w-6 text-[#60A5FA]" />
                  <span className="text-2xl font-bold text-[#93C5FD]">99.9%</span>
                </div>
                <div className="text-sm text-[#93C5FD]">accurate</div>
              </div>

              <div className="flex justify-center relative z-10">
                <div className="p-3 bg-gradient-to-br from-[#4ADE80] to-[#22C55E] rounded-full shadow-lg shadow-green-500/50 transform group-hover:scale-110 transition-transform duration-300">
                  <Check className="h-6 w-6 text-white font-bold" strokeWidth={3} />
                </div>
              </div>

              {/* Animated shine effect on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-10 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </div>
            </div>
          </div>

          {/* Bottom trust bar */}
          <div className="grid grid-cols-3 border-t border-[#e5e7eb] bg-gradient-to-r from-[#f9fafb] via-white to-[#f9fafb]">
            <div className="p-4 text-center border-r border-[#e5e7eb]">
              <p className="text-xs text-[#6b7280]">No credit card</p>
            </div>
            <div className="p-4 text-center border-r border-[#e5e7eb]">
              <p className="text-xs text-[#6b7280]">No lock-in</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-xs text-[#6b7280]">Export anywhere</p>
            </div>
          </div>
        </div>

        {/* Quick stats below */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto relative z-10">
          <div className="text-center p-4 rounded-xl bg-white border border-[#e5e7eb] hover:shadow-lg transition-all duration-300">
            <p className="text-2xl font-bold text-[#3b82f6] mb-1">960x</p>
            <p className="text-xs text-[#6b7280]">faster than manual</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-white border border-[#e5e7eb] hover:shadow-lg transition-all duration-300">
            <p className="text-2xl font-bold text-[#059669] mb-1">$1,451</p>
            <p className="text-xs text-[#6b7280]">saved per year</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-white border border-[#e5e7eb] hover:shadow-lg transition-all duration-300">
            <p className="text-2xl font-bold text-[#8B5CF6] mb-1">10k+</p>
            <p className="text-xs text-[#6b7280]">files processed</p>
          </div>
        </div>
      </Container>
    </section>
  );
}