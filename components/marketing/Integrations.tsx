'use client';

import React from 'react';
import { Container } from '../layout/Container';
import { ArrowDown } from 'lucide-react';
import Image from 'next/image';

const exchanges = [
  { name: 'Coinbase', logo: '/logos/coinbase.svg' },
  { name: 'Binance', logo: '/logos/binance.svg' },
  { name: 'Kraken', logo: '/logos/kraken.svg' },
  { name: 'KuCoin', logo: '/logos/kucoin.svg' },
  { name: 'Crypto.com', logo: '/logos/cryptocom.svg' },
  { name: 'Gemini', logo: '/logos/gemini.svg' },
  { name: 'Bitstamp', logo: '/logos/bitstamp.svg' },
  { name: 'Bitfinex', logo: '/logos/bitfinex.svg' },
];

const platforms = [
  { name: 'Koinly', logo: '/logos/koinly.svg' },
  { name: 'TurboTax', logo: '/logos/turbotax.svg' },
  { name: 'CoinLedger', logo: '/logos/coinledger.svg' },
  { name: 'ZenLedger', logo: '/logos/zenledger.svg' },
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
                className="flex-shrink-0 w-24 h-24 flex items-center justify-center grayscale hover:grayscale-0 opacity-50 hover:opacity-100 transition-all duration-300"
              >
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center p-3">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    {exchange.name}
                  </span>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {platforms.map((platform) => (
            <div
              key={platform.name}
              className="group bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 text-center hover:border-[var(--color-primary-500)]/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center group-hover:bg-[var(--color-primary-500)]/10 transition-colors">
                <span className="text-lg font-bold text-slate-500 dark:text-slate-400 group-hover:text-[var(--color-primary-500)]">
                  {platform.name.charAt(0)}
                </span>
              </div>
              <p className="font-semibold text-slate-900 dark:text-white text-sm">
                {platform.name}
              </p>
            </div>
          ))}
        </div>

      </Container>
    </section>
  );
}
