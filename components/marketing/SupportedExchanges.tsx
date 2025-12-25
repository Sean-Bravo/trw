'use client';

import React from 'react';
import Image from 'next/image';
import { Container } from '../layout/Container';

const exchanges = [
  { name: 'Coinbase', logo: '/logos/exchanges/coinbase.svg' },
  { name: 'Binance', logo: '/logos/exchanges/binance.svg' },
  { name: 'Kraken', logo: '/logos/exchanges/kraken.svg' },
  { name: 'Crypto.com', logo: '/logos/exchanges/crypto.com.svg' },
  { name: 'Gemini', logo: '/logos/exchanges/gemini.svg' },
  { name: 'Kucoin', logo: '/logos/exchanges/kucoin.svg' },
  { name: 'Bybit', logo: '/logos/exchanges/bybit.svg' },
  { name: 'OKX', logo: '/logos/exchanges/okx.svg' },
  { name: 'Bitfinex', logo: '/logos/exchanges/bitfinex.svg' },
  { name: 'Huobi', logo: '/logos/exchanges/huobi.svg' },
  { name: 'Gate.io', logo: '/logos/exchanges/gate.io.svg' },
  { name: 'Bitstamp', logo: '/logos/exchanges/bitstamp.svg' },
  { name: 'PayPal', logo: '/logos/exchanges/paypal.svg' },
  { name: 'Robinhood', logo: '/logos/exchanges/robinhood.svg' },
  { name: 'Venmo', logo: '/logos/exchanges/venmo.svg' },
  { name: 'Cash App', logo: '/logos/exchanges/cashapp.svg' },
];

export function SupportedExchanges() {
  return (
    <section className="bg-white py-24 sm:py-32 overflow-hidden">
      <Container>
        <div className="text-center mb-16">
          <h2 className="font-poppins text-3xl sm:text-4xl font-bold text-[#1a365d] mb-4 leading-tight">
            Works with 16+ Exchanges & Platforms
          </h2>
          <p className="text-lg text-[#4b5563] max-w-2xl mx-auto">
            Crypto exchanges, payment apps, and trading platforms - all in one place
          </p>
        </div>

        {/* Logo Cloud - Real Exchange Logos */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-8">
            {exchanges.map((exchange) => (
              <div
                key={exchange.name}
                className="group flex flex-col items-center gap-3 cursor-pointer transition-all duration-300 hover:scale-105"
              >
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-white shadow-md group-hover:shadow-xl transition-all duration-300 border border-gray-100 p-3">
                  <Image
                    src={exchange.logo}
                    alt={`${exchange.name} logo`}
                    width={64}
                    height={64}
                    className="object-contain transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
                <span className="font-poppins text-sm font-semibold text-[#6b7280] group-hover:text-[#1a365d] transition-colors duration-300 text-center">
                  {exchange.name}
                </span>
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

