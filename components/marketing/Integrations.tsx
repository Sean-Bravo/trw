'use client';

import React from 'react';
import { Container } from '../layout/Container';
import { ArrowDown } from 'lucide-react';
import Image from 'next/image';

const exchanges = [
  { name: 'Coinbase', logo: '/logos/exchanges/coinbase-icon.svg' },
  { name: 'Binance', logo: '/logos/exchanges/binance.svg' },
  { name: 'Kraken', logo: '/logos/exchanges/kraken.svg' },
  { name: 'KuCoin', logo: '/logos/exchanges/kucoin.svg' },
  { name: 'Crypto.com', logo: '/logos/exchanges/crypto.com.svg' },
  { name: 'Gemini', logo: '/logos/exchanges/gemini.svg' },
  { name: 'Bitstamp', logo: '/logos/exchanges/bitstamp.svg' },
  { name: 'Robinhood', logo: '/logos/exchanges/robinhood.svg' },
  { name: 'eToro', logo: '/logos/exchanges/etoro.svg' },
  { name: 'OKX', logo: '/logos/exchanges/okx.svg' },
  { name: 'Bybit', logo: '/logos/exchanges/bybit.svg' },
  { name: 'Gate.io', logo: '/logos/exchanges/gate.io.svg' },
];

const platforms = [
  { name: 'TurboTax', logo: '/logos/tax-platforms/turbotax.svg' },
  { name: 'TaxAct', logo: '/logos/tax-platforms/taxact.png' },
  { name: 'H&R Block', logo: '/logos/tax-platforms/h-rblock.png' },
  { name: 'Koinly', logo: '/logos/tax-platforms/koinly.svg' },
  { name: 'TokenTax', logo: '/logos/tax-platforms/tokentax.png' },
  { name: 'CoinLedger', logo: '/logos/tax-platforms/coinledger.svg' },
  { name: 'ZenLedger', logo: '/logos/tax-platforms/zenledger.svg' },
];

export function Integrations() {
  return (
    <section className="py-24 sm:py-32 bg-white dark:bg-slate-950 overflow-hidden">
      <Container>
        <div className="text-center mb-16">
          <h2 className="font-poppins text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Works With Everything
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Import from 12 exchanges, export to any tax platform
          </p>
        </div>

        {/* Exchanges Marquee */}
        <div className="relative mb-12">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white dark:from-slate-950 to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white dark:from-slate-950 to-transparent z-10" />

          {/* Scrolling logos */}
          <div className="flex gap-12 animate-marquee">
            {[...exchanges, ...exchanges].map((exchange, i) => (
              <div
                key={`${exchange.name}-${i}`}
                className="flex-shrink-0 w-24 h-24 flex items-center justify-center grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300"
              >
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center p-2">
                  <Image
                    src={exchange.logo}
                    alt={exchange.name}
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center mb-12">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <ArrowDown className="w-5 h-5 text-[var(--color-primary-500)] animate-bounce" />
          </div>
        </div>

        {/* Tax Platforms */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 max-w-5xl mx-auto">
          {platforms.map((platform) => (
            <div
              key={platform.name}
              className="group bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 text-center hover:border-[var(--color-primary-500)]/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 aspect-[4/3] flex items-center justify-center"
            >
              <div className="w-20 h-8 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Image
                  src={platform.logo}
                  alt={platform.name}
                  width={80}
                  height={32}
                  className="object-contain w-full h-full grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                />
              </div>
            </div>
          ))}
        </div>

      </Container>
    </section>
  );
}
