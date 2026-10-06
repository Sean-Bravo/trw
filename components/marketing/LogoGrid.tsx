'use client';

import React from 'react';
import { EXCHANGE_SOURCES } from '@/lib/exchange-registry';

interface Logo {
  name: string;
  src: string;
  alt: string;
}

interface LogoGridProps {
  logos: Logo[];
  className?: string;
}

// Exchanges - sources for CSV imports. Generated from the registry: an
// exchange gets a logo card only if it has a parser AND a logo file.
const exchangeLogoFiles: Record<string, string> = {
  coinbase: 'coinbase-icon.svg',
  kraken: 'kraken.svg',
  kucoin: 'kucoin.svg',
  'crypto.com': 'crypto.com.svg',
  gemini: 'gemini.svg',
  robinhood: 'robinhood.svg',
  okx: 'okx.svg',
  bybit: 'bybit.svg',
  binance: 'binance.svg',
  paypal: 'paypal.svg',
  cashapp: 'cashapp.svg',
  venmo: 'venmo.svg',
};

export const exchangeLogos: Logo[] = EXCHANGE_SOURCES.filter((ex) => ex.id in exchangeLogoFiles).map((ex) => ({
  name: ex.name,
  src: `/logos/exchanges/${exchangeLogoFiles[ex.id]}`,
  alt: ex.name,
}));

// Tax platforms - export destinations
export const taxPlatformLogos: Logo[] = [
  { name: 'TurboTax', src: '/logos/tax-platforms/turbotax.svg', alt: 'Intuit TurboTax' },
  { name: 'TaxAct', src: '/logos/tax-platforms/taxact.png', alt: 'TaxAct' },
  { name: 'H&R Block', src: '/logos/tax-platforms/h-rblock.png', alt: 'H&R Block' },
  { name: 'Koinly', src: '/logos/tax-platforms/koinly.svg', alt: 'Koinly' },
  { name: 'CoinLedger', src: '/logos/tax-platforms/coinledger.svg', alt: 'CoinLedger' },
  { name: 'ZenLedger', src: '/logos/tax-platforms/zenledger.svg', alt: 'ZenLedger' },
  { name: 'TokenTax', src: '/logos/tax-platforms/tokentax.png', alt: 'TokenTax' },
];

function LogoCard({ logo }: { logo: Logo }) {
  return (
    <div className="flex items-center justify-center h-16 w-36 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm">
      <img
        src={logo.src}
        alt={logo.alt}
        className="h-6 w-auto max-w-[80%] grayscale opacity-60 dark:opacity-50 dark:invert transition-all duration-200 hover:grayscale-0 hover:opacity-100 dark:hover:opacity-100 dark:hover:invert-0"
        loading="lazy"
      />
    </div>
  );
}

export function LogoGrid({ logos, className = '' }: LogoGridProps) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-4 ${className}`}>
      {logos.map((logo) => (
        <LogoCard key={logo.name} logo={logo} />
      ))}
    </div>
  );
}

// Pre-configured grids for common use cases
export function ExchangeLogoGrid({ className = '' }: { className?: string }) {
  return <LogoGrid logos={exchangeLogos} className={className} />;
}

export function TaxPlatformLogoGrid({ className = '' }: { className?: string }) {
  return <LogoGrid logos={taxPlatformLogos} className={className} />;
}

// Full "Works With Everything" section component
export function WorksWithSection() {
  return (
    <section className="py-16 sm:py-24 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Works With Everything
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Import from {EXCHANGE_SOURCES.length} exchanges, export to any tax platform
          </p>
        </div>

        {/* Exchanges */}
        <div className="mb-8">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider text-center mb-4">
            Import From
          </p>
          <ExchangeLogoGrid />
        </div>

        {/* Arrow */}
        <div className="flex justify-center my-6">
          <div className="h-10 w-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
            <svg
              className="h-5 w-5 text-indigo-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>

        {/* Tax Platforms */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider text-center mb-4">
            Export To
          </p>
          <TaxPlatformLogoGrid />
        </div>
      </div>
    </section>
  );
}
