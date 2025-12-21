import React from 'react';
import { Container } from '../layout/Container';

const exchanges = {
  tier1: ['Coinbase', 'Kraken', 'Binance', 'Crypto.com'],
  tier2: ['FTX', 'Gemini', 'Kucoin', 'Huobi'],
  tier3: ['Bybit', 'Upbit', 'OKX', 'Bitfinex', 'Gate.io'],
};

export function SupportedExchanges() {
  return (
    <section className="bg-[#f9fafb] py-24 sm:py-32">
      <Container>
        <div className="text-center mb-16">
          <h2 className="font-poppins text-3xl sm:text-4xl font-bold text-[#1a365d] mb-4 leading-tight">
            Works with 15+ Exchanges
          </h2>
          <p className="text-lg text-[#4b5563] max-w-2xl mx-auto">
            Import from anywhere, export to any tax platform
          </p>
        </div>

        <div className="max-w-5xl mx-auto space-y-12">
          {/* Tier 1 */}
          <div>
            <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-4 px-4">
              Tier 1 - Primary Exchanges
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {exchanges.tier1.map((exchange) => (
                <div
                  key={exchange}
                  className="bg-white border-2 border-[#1a365d] rounded-lg p-6 text-center shadow-[0_4px_12px_rgba(26,54,93,0.15)] hover:shadow-[0_8px_16px_rgba(26,54,93,0.1)] transition-shadow duration-300"
                >
                  <p className="text-sm font-semibold text-[#1a365d]">
                    {exchange}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Tier 2 */}
          <div>
            <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-4 px-4">
              Tier 2 - Secondary Exchanges
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {exchanges.tier2.map((exchange) => (
                <div
                  key={exchange}
                  className="bg-white border border-[#d1d5db] rounded-lg p-6 text-center shadow-[0_4px_12px_rgba(26,54,93,0.15)] hover:shadow-[0_8px_16px_rgba(26,54,93,0.1)] transition-shadow duration-300"
                >
                  <p className="text-sm font-semibold text-[#1a365d]">
                    {exchange}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Tier 3 */}
          <div>
            <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-4 px-4">
              Tier 3 - Additional Exchanges
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {exchanges.tier3.map((exchange) => (
                <div
                  key={exchange}
                  className="bg-[#f9fafb] border border-[#e5e7eb] rounded-lg p-6 text-center shadow-[0_4px_12px_rgba(26,54,93,0.15)] hover:shadow-[0_8px_16px_rgba(26,54,93,0.1)] transition-shadow duration-300"
                >
                  <p className="text-sm font-semibold text-[#374151]">
                    {exchange}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-[#4b5563]">
            Don't see your exchange?{' '}
            <a href="#contact" className="text-[#059669] hover:text-[#047857] underline font-semibold">
              Contact us
            </a>
          </p>
        </div>
      </Container>
    </section>
  );
}

