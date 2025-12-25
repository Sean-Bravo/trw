import React from 'react';
import { Container } from '../layout/Container';
import Image from 'next/image';

const exchanges = [
  { name: 'Binance', slug: 'binance' },
  { name: 'Bitfinex', slug: 'bitfinex' },
  { name: 'Bitstamp', slug: 'bitstamp' },
  { name: 'Bybit', slug: 'bybit' },
  { name: 'Cash App', slug: 'cashapp' },
  { name: 'Coinbase', slug: 'coinbase' },
  { name: 'Crypto.com', slug: 'crypto.com' },
  { name: 'Gate.io', slug: 'gate.io' },
  { name: 'Gemini', slug: 'gemini' },
  { name: 'Huobi', slug: 'huobi' },
  { name: 'Kraken', slug: 'kraken' },
  { name: 'KuCoin', slug: 'kucoin' },
  { name: 'OKX', slug: 'okx' },
  { name: 'PayPal', slug: 'paypal' },
  { name: 'Robinhood', slug: 'robinhood' },
  { name: 'Venmo', slug: 'venmo' },
];

export function SupportedExchanges() {
  return (
    <section className="bg-white py-24 sm:py-32 overflow-hidden">
      <Container>
        <div className="text-center mb-16">
          <h2 className="font-poppins text-3xl sm:text-4xl font-bold text-[#1a365d] mb-4 leading-tight">
            Works with 16 Exchanges
          </h2>
          <p className="text-lg text-[#4b5563] max-w-2xl mx-auto">
            Import from anywhere, export to any tax platform
          </p>
        </div>

        {/* Logo Cloud - Grid with actual SVGs */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-6 items-center justify-items-center">
            {exchanges.map((exchange) => (
              <div
                key={exchange.slug}
                className="group cursor-pointer transition-all duration-300 hover:scale-110 flex items-center justify-center"
              >
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <Image
                    src={`/logos/exchanges/${exchange.slug}.svg`}
                    alt={exchange.name}
                    width={80}
                    height={80}
                    className="object-contain opacity-100"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Message */}
        {/* <div className="text-center mt-16">
          <p className="text-[#4b5563] text-base">
            Missing an exchange?{' '}
            <a href="mailto:support@taxformatter.com" className="text-[#3b82f6] hover:text-[#2563eb] underline font-semibold">
              Let us know
            </a>
          </p>
        </div> */}
      </Container>
    </section>
  );
}