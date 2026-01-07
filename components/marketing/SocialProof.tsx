'use client';

import React from 'react';
import { Container } from '../layout/Container';
import { FileWarning, Clock, ArrowLeftRight, Terminal } from 'lucide-react';

const nightmares = [
  {
    title: "Timestamp Normalization",
    // We treat the description as JSX to allow specific styling
    description: (
      <>
        Exchanges mix formats. Coinbase uses <span className="font-mono text-xs text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-200 px-1 py-0.5 rounded">ISO-8601</span> while Kraken uses <span className="font-mono text-xs text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-200 px-1 py-0.5 rounded">Unix Epoch</span>. We standardize everything to <span className="font-mono text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-200 px-1 py-0.5 rounded">UTC</span> to prevent "Future Date" lockouts.
      </>
    ),
    icon: Clock,
  },
  {
    title: "Transfer Detection",
    description: (
      <>
        Moving ETH from Binance to MetaMask? Most tools see a <span className="font-mono text-xs text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-200 px-1 py-0.5 rounded">SALE</span> event. We trace the blockchain to flag it as a non-taxable <span className="font-mono text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-200 px-1 py-0.5 rounded">TRANSFER</span>, preserving your original cost basis.
      </>
    ),
    icon: ArrowLeftRight,
  },
  {
    title: "Schema Compliance",
    description: (
      <>
        TurboTax rejects generic CSVs. They enforce headers like <span className="font-mono text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 px-1 py-0.5 rounded">Cost Basis (USD)</span>. We remap your columns to match their strict schema version <span className="font-mono text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-1 py-0.5 rounded">v2024.1</span>.
      </>
    ),
    icon: FileWarning,
  },
];

export function SocialProof() {
  return (
    <section className="py-24 bg-white dark:bg-slate-950 border-y border-slate-100 dark:border-slate-900">
      <Container>
        <div className="relative z-10">
          
          {/* Section Header */}
          <div className="flex flex-col md:flex-row gap-8 md:items-end justify-between mb-12 border-b border-slate-100 dark:border-slate-800 pb-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)] font-mono text-xs font-medium tracking-wider uppercase mb-3">
                <Terminal className="w-3 h-3" />
                <span>Error Log Analysis</span>
              </div>
              <h2 className="font-poppins text-3xl font-bold text-slate-900 dark:text-white mb-4">
                Why your import keeps failing.
              </h2>
              <p className="text-slate-400 dark:text-slate-300 leading-relaxed text-lg">
                We analyzed 10,000+ failed CSV uploads. These are the three most common reasons tax software rejects your files.
              </p>
            </div>
            
            {/* "Boring" Stat */}
            <div className="hidden md:block text-right">
              <p className="text-4xl font-mono font-bold text-slate-200 dark:text-slate-800">
                03
              </p>
              <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                Critical Errors Found
              </p>
            </div>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {nightmares.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="group relative bg-slate-50 dark:bg-slate-900 rounded-xl p-8 border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="absolute top-8 right-8 text-slate-400 dark:text-slate-400 group-hover:text-slate-400 dark:group-hover:text-slate-400 transition-colors">
                    <Icon className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  
                  <h3 className="font-mono text-sm font-semibold text-slate-900 dark:text-white mb-4 uppercase tracking-wide">
                    {item.title}
                  </h3>
                  
                  <p className="text-slate-400 dark:text-slate-300 leading-relaxed text-sm">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>

        </div>
      </Container>
    </section>
  );
}