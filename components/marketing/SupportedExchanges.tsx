import React from 'react';
import { Container } from '../layout/Container';

const exchanges = [
  'binance',
  'bitfinex',
  'bitstamp', 
  'bybit',
  'cashapp',
  'coinbase',
  'crypto.com',
  'gate.io',
  'gemini',
  'huobi',
  'kraken',
  'kucoin',
  'okx',
  'paypal',
  'robinhood',
  'venmo',
];

export function SupportedExchanges() {
  return (
    <section className="bg-white py-24 sm:py-32 overflow-hidden">
      <Container>
        <div className="text-center mb-16">
          <h2 className="font-poppins text-3xl sm:text-4xl font-bold text-[#1a365d] mb-4 leading-tight">
            Works with 15+ Exchanges
          </h2>
          <p className="text-lg text-[#4b5563] max-w-2xl mx-auto">
            Import from anywhere, export to any tax platform
          </p>
        </div>

        {/* Logo Cloud - Simple Grid */}
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
            {exchanges.map((exchange) => (
              <div
                key={exchange}
                className="group cursor-pointer transition-all duration-300 hover:scale-110"
              >
                <div className="font-poppins text-2xl font-bold text-[#9ca3af] group-hover:text-[#3b82f6] transition-colors duration-300">
                  {exchange}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Message */}
        <div className="text-center mt-16">
          <p className="text-[#4b5563] text-lg">
            Don't see your exchange?{' '}
            <a href="#contact" className="text-[#3b82f6] hover:text-[#2563eb] underline font-semibold">
              We'll add it
            </a>
          </p>
        </div>
      </Container>
    </section>
  );
}

