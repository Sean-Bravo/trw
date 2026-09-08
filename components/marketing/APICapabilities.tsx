'use client';

import React from 'react';
import { Container } from '../layout/Container';
import {
  FileText, Building2, Repeat2, Shield, Clock, Code2,
  ArrowRight, Zap,
} from 'lucide-react';

const exchanges = [
  { name: 'Coinbase', format: 'CSV', note: 'Incl. Pro' },
  { name: 'Binance', format: '.tar.gz', note: '10K rows' },
  { name: 'Kraken', format: 'ZIP', note: 'Ledgers' },
  { name: 'Gemini', format: 'XLSX', note: 'Auto-convert' },
  { name: 'Robinhood', format: 'CSV', note: 'US dates' },
  { name: 'Crypto.com', format: 'CSV', note: 'Multi-file' },
  { name: 'PayPal', format: 'CSV', note: '4 cryptos' },
  { name: 'Cash App', format: 'CSV', note: 'BTC only' },
  { name: 'Venmo', format: 'CSV', note: 'Skip meta' },
  { name: 'KuCoin', format: 'CSV', note: 'Unix ts' },
  { name: 'Bybit', format: 'ZIP', note: 'Varies' },
  { name: 'FTX', format: 'CSV', note: 'Historical' },
  { name: 'Bitfinex', format: 'CSV', note: 'Standard' },
  { name: 'OKX', format: 'CSV', note: 'Spot + Deriv' },
];

const banks = [
  { name: 'Chase', status: 'tested' },
  { name: 'Mercury', status: 'tested' },
  { name: 'Navy Federal', status: 'tested' },
  { name: 'Bank of America', status: 'config' },
  { name: 'Wells Fargo', status: 'config' },
  { name: 'Citi', status: 'config' },
  { name: 'Capital One', status: 'config' },
];

const features = [
  {
    icon: Repeat2,
    title: 'Auto-detection',
    desc: 'Send any CSV — we detect the exchange from headers alone.',
    accent: 'text-primary-400',
    bg: 'from-primary-500/8 to-transparent',
  },
  {
    icon: FileText,
    title: 'PDF Parsing',
    desc: 'Bank statements in, structured JSON out.',
    accent: 'text-primary-400',
    bg: 'from-primary-500/8 to-transparent',
  },
  {
    icon: Code2,
    title: 'Structured Errors',
    desc: 'Machine-readable codes with actionable suggestions.',
    accent: 'text-primary-400',
    bg: 'from-primary-500/8 to-transparent',
  },
  {
    icon: Shield,
    title: 'Ephemeral',
    desc: 'In-memory processing. Nothing stored. Ever.',
    accent: 'text-emerald-400',
    bg: 'from-emerald-500/8 to-transparent',
  },
  {
    icon: Clock,
    title: 'Sub-2s',
    desc: 'CSVs under 1s. PDFs under 2s. Timing in every response.',
    accent: 'text-primary-400',
    bg: 'from-primary-500/8 to-transparent',
  },
  {
    icon: Building2,
    title: 'Enterprise Ready',
    desc: 'Rate limits, usage tracking, key management, Stripe billing.',
    accent: 'text-primary-400',
    bg: 'from-primary-500/8 to-transparent',
  },
];

const outputFormats = ['Koinly', 'TurboTax', 'CoinLedger', 'ZenLedger'];

export function APICapabilities() {
  return (
    <section className="py-28 bg-surface-alt relative overflow-hidden" id="capabilities">
      {/* Subtle gradient */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-225 h-125 bg-[#635bff]/3 rounded-[100%] blur-[150px]" />

      <Container>
        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-16">
            <p className="text-[13px] font-semibold text-primary-400 uppercase tracking-[0.15em] mb-4">What it parses</p>
            <h2 className="font-poppins text-3xl md:text-[2.75rem] font-bold text-white mb-5 tracking-tight">
              One endpoint. Every format.
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto">
              POST a file to <code className="text-[13px] font-mono text-slate-300 bg-white/4 px-2 py-0.5 rounded">/v1/parse</code> — the API handles detection, normalization, and conversion.
            </p>
          </div>

          {/* Pipeline visual: Input → Engine → Output */}
          <div className="max-w-5xl mx-auto mb-20">
            <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-6 items-stretch">

              {/* LEFT: Inputs */}
              <div className="flex flex-col">
                {/* Exchanges */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-[#635bff]" />
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Crypto Exchanges</h3>
                    <span className="text-[11px] text-slate-500 font-mono">{exchanges.length}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {exchanges.map((ex) => (
                      <div
                        key={ex.name}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/2 border border-white/5 hover:border-[#635bff]/20 hover:bg-[#635bff]/4 transition-all group min-w-0"
                      >
                        <span className="text-[13px] text-slate-300 font-medium group-hover:text-white transition-colors truncate">{ex.name}</span>
                        <span className="text-[10px] text-slate-600 font-mono shrink-0">{ex.format}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Banks */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Bank PDFs</h3>
                    <span className="text-[11px] text-slate-500 font-mono">{banks.length}+</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {banks.map((bank) => (
                      <div
                        key={bank.name}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/2 border border-white/5 hover:border-emerald-500/20 hover:bg-emerald-500/4 transition-all group min-w-0"
                      >
                        <span className="text-[13px] text-slate-300 font-medium group-hover:text-white transition-colors truncate">{bank.name}</span>
                        {bank.status === 'tested' && (
                          <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider shrink-0">✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CENTER: Arrow connector */}
              <div className="hidden lg:flex flex-col items-center justify-center">
                <div className="w-px flex-1 bg-linear-to-b from-transparent via-slate-600 to-slate-600" />
                <div className="my-4 w-14 h-14 rounded-xl bg-white/4 border border-white/8 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-amber-400" />
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest my-2 font-semibold">Engine</div>
                <div className="w-px flex-1 bg-linear-to-b from-slate-600 via-slate-600 to-transparent" />
              </div>

              {/* RIGHT: Outputs + Features */}
              <div className="flex flex-col">
                {/* Output formats */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-sky-400" />
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Output Formats</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {outputFormats.map((fmt) => (
                      <div
                        key={fmt}
                        className="px-3 py-2 rounded-lg bg-white/2 border border-white/5 text-[13px] text-slate-300 font-medium text-center"
                      >
                        {fmt}
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-3 pl-1">
                    Set <code className="font-mono text-slate-500">output_format</code> in your request. Default: Koinly.
                  </p>
                </div>

                {/* Feature list */}
                <div className="space-y-2 flex-1">
                  {features.map((feat) => (
                    <div
                      key={feat.title}
                      className="flex items-start gap-3 px-4 py-3 rounded-lg bg-white/1 hover:bg-white/3 transition-all group"
                    >
                      <feat.icon className={`w-4 h-4 mt-0.5 ${feat.accent} shrink-0`} />
                      <div>
                        <span className="text-[13px] font-semibold text-white">{feat.title}</span>
                        <span className="text-[12px] text-slate-500 ml-2">{feat.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Response preview */}
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-4">
              <span className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">Every response includes</span>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                'status',
                'summary',
                'detected_source',
                'source_type',
                'transactions[]',
                'warnings[]',
                'metadata.processing_time_ms',
                'metadata.transaction_count',
              ].map((field) => (
                <code
                  key={field}
                  className="px-3 py-1.5 rounded-md bg-white/3 border border-white/5 text-[12px] font-mono text-slate-400"
                >
                  {field}
                </code>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
