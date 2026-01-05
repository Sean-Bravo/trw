'use client';

import React from 'react';
import { Container } from '../layout/Container';
import { Network } from 'lucide-react';
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
    <section className="py-24 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900 overflow-hidden">
      <Container>
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-mono font-medium mb-6">
            <Network className="w-3 h-3" />
            <span>UNIVERSAL_ADAPTER_PROTOCOL</span>
          </div>
          <h2 className="font-poppins text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Works With Everything
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            We normalize data from 12+ exchanges into a format accepted by every major tax platform.
          </p>
        </div>

        {/* INPUT: Exchanges Marquee */}
        <div className="relative mb-16 group">
          {/* Gradient Masks */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white dark:from-slate-950 to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white dark:from-slate-950 to-transparent z-10" />

          {/* Scrolling Container */}
          <div className="flex gap-12 animate-marquee w-max hover:[animation-play-state:paused]">
            {/* We map 3 times to ensure smooth infinite loop on wide screens */}
            {[...exchanges, ...exchanges, ...exchanges].map((exchange, i) => (
              <div
                key={`${exchange.name}-${i}`}
                className="flex-shrink-0 w-24 h-24 flex items-center justify-center grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500"
              >
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-center p-3 shadow-sm hover:shadow-md hover:scale-105 transition-all">
                  <Image
                    src={exchange.logo}
                    alt={exchange.name}
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PROCESSING: Pipeline Visual */}
        <div className="flex flex-col items-center justify-center gap-2 mb-16">
          <div className="h-12 w-px bg-gradient-to-b from-slate-200 via-blue-500 to-slate-200 dark:from-slate-800 dark:via-blue-500 dark:to-slate-800" />
          <div className="px-4 py-1.5 rounded-full bg-slate-900 text-white text-xs font-mono border border-slate-700 shadow-xl">
            Processing & Formatting Engine
          </div>
          <div className="h-12 w-px bg-gradient-to-b from-slate-200 via-blue-500 to-slate-200 dark:from-slate-800 dark:via-blue-500 dark:to-slate-800" />
        </div>

        {/* OUTPUT: Tax Platforms (Static Grid) */}
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center opacity-70">
            {platforms.map((platform) => (
              <div
                key={platform.name}
                className="group relative w-full flex items-center justify-center p-4 grayscale hover:grayscale-0 transition-all duration-300"
              >
                <Image
                  src={platform.logo}
                  alt={platform.name}
                  width={140}
                  height={40}
                  className="object-contain h-8 w-auto opacity-60 group-hover:opacity-100 transition-all"
                />
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-slate-400 mt-12 font-mono">
            * All trademarks property of their respective owners.
          </p>
        </div>
      </Container>
    </section>
  );
}
