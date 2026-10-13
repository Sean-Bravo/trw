'use client';

import React, { useRef, useEffect } from 'react';
import { Logo } from '@/components/ui/Logo';
import { trackConversion } from '@/lib/analytics';
import { ApiEquivalentPanel } from '@/components/upload/ApiEquivalentPanel';
import { BankUploadBox, BankUploadBoxHandle } from '@/components/upload/BankUploadBox';
import Link from 'next/link';
import {
  Shield,
  CheckCircle2,
  Search,
  Activity,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { BANK_SOURCES } from '@/lib/bank-registry';

// Single source: lib/bank-registry.ts (mirrors backend/configs/banks/*.yaml).
// Only banks with a parser config are listed; "support means tested support".
const BANKS = BANK_SOURCES;

const OUTPUT_FORMATS = ['CSV', 'QuickBooks (QBO)', 'Xero', 'Excel'];

const PAIN_CARDS = [
  { source: 'QuickBooks', msg: '"We couldn\'t read your bank statement PDF"' },
  { source: 'Xero', msg: '"Import failed — unexpected file format"' },
  { source: 'Excel', msg: '"Unable to extract transactions from PDF"' },
];

const FEATURES = [
  {
    icon: Search,
    title: 'Auto-detects your bank',
    desc: 'Drop the PDF. We detect if it\'s Chase, Bank of America, Wells Fargo, or 8 others.',
  },
  {
    icon: Activity,
    title: 'Extracts every transaction',
    desc: 'Dates, descriptions, amounts, running balances — all pulled from the PDF automatically.',
  },
  {
    icon: FileText,
    title: 'Exports to your format',
    desc: 'Get a clean file formatted for QuickBooks, Xero, Excel, or plain CSV.',
  },
];

export default function UploadLandingPage() {
  // The upload flow itself lives in BankUploadBox (shared with the bank
  // landing page); this page only adds the Google Ads framing around it.
  const uploadBoxRef = useRef<BankUploadBoxHandle>(null);

  // Capture UTM params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const source = params.get('utm_source');
    if (source) {
      trackConversion('landing_page_view');
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Background mesh */}
      <div className="fixed inset-0 pointer-events-none bg-mesh-dark opacity-60" />

      {/* Beta bar */}
      <div className="relative z-10 bg-primary-600 py-2 text-center text-sm">
        <span className="inline-flex items-center gap-2 text-primary-100">
          <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
          <span className="font-semibold text-white">Free Beta</span>
          <span className="hidden sm:inline">— All features unlocked while we validate parsers</span>
        </span>
      </div>

      {/* Header */}
      <header className="relative z-10 max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <Logo variant="light" />
        <div className="hidden sm:flex items-center gap-5 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-accent-500" />
            Files deleted within 30 days
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-accent-500" />
            No signup required
          </span>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="text-center px-4 pt-12 pb-8 max-w-3xl mx-auto">
          {/* Pain badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-1.5 text-xs font-mono text-red-400 mb-7">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse-subtle" />
            PROBLEM: Can&apos;t import your bank statement?
          </div>

          <h1 className="font-poppins text-3xl sm:text-5xl font-bold leading-tight tracking-tight mb-5">
            Upload your bank statement.
            <br />
            Get a <em className="not-italic text-primary-400">clean CSV</em> back.
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
            Your bank gave you a PDF. Your accounting software needs a spreadsheet. We extract every transaction and convert to CSV, QuickBooks, Xero, or Excel format.
          </p>
        </section>

        {/* Upload zone */}
        <section className="max-w-xl mx-auto px-4 pb-12">
          <BankUploadBox
            ref={uploadBoxRef}
            renderAfterSuccess={(info) => (
              // API equivalent — shown after a successful parse to bridge consumer → developer
              <ApiEquivalentPanel
                detectedBank={info.detectedBank}
                transactionCount={info.transactionCount}
                outputFormat={info.outputFormat}
                filename={info.filename}
              />
            )}
          />
        </section>

        {/* Pain point showcase */}
        <section className="max-w-3xl mx-auto px-4 pb-16">
          <h2 className="text-center text-xs font-medium text-slate-500 uppercase tracking-widest mb-6">
            Sound familiar? We can help.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PAIN_CARDS.map((card) => (
              <div
                key={card.source}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 font-mono text-xs transition-colors hover:border-slate-700"
              >
                <div className="flex items-center gap-1.5 text-slate-500 mb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                  {card.source}
                </div>
                <div className="text-red-400 leading-relaxed">{card.msg}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="max-w-4xl mx-auto px-4 pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 transition-colors hover:border-slate-700"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary-400" />
                </div>
                <h3 className="text-sm font-semibold mb-1.5">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Supported banks */}
        <section className="max-w-3xl mx-auto px-4 pb-16 text-center">
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-5">
            Supported banks
          </h2>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {BANKS.map((bank) => (
              <span
                key={bank.id}
                className="rounded-lg border border-slate-800 bg-slate-900/60 px-3.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-200"
                title={bank.status === 'verified' ? 'Verified against real statements' : 'Beta: configured, not yet verified'}
              >
                {bank.name}
                {bank.status === 'beta' && (
                  <span className="ml-1.5 text-[9px] uppercase tracking-wider text-slate-600">beta</span>
                )}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 flex-wrap">
            Converts to
            <span className="text-primary-400">→</span>
            {OUTPUT_FORMATS.map((name) => (
              <span
                key={name}
                className="rounded-md border border-accent-500/15 bg-accent-500/10 px-2.5 py-1 text-accent-400 font-medium"
              >
                {name}
              </span>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="text-center px-4 pb-20">
          <button
            onClick={() => uploadBoxRef.current?.openFilePicker()}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-linear-to-r from-primary-500 to-primary-700 text-white font-semibold text-base shadow-glow hover:shadow-[0_0_50px_-10px_rgba(99,91,255,0.4)] hover:-translate-y-0.5 transition-all duration-200"
          >
            Convert My Statement for Free
            <ArrowRight className="w-4.5 h-4.5" />
          </button>
          <div className="mt-5 flex items-center justify-center gap-5 text-xs text-slate-500 flex-wrap">
            {['Free during beta', 'No signup required', 'Files auto-deleted within 30 days'].map((text) => (
              <span key={text} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-accent-500" />
                {text}
              </span>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <p>
          © {new Date().getFullYear()} TaxFormatter ·{' '}
          <Link href="/security" className="hover:text-slate-300 transition-colors">Security</Link> ·{' '}
          <Link href="/docs" className="hover:text-slate-300 transition-colors">Docs</Link> ·{' '}
          <Link href="/privacy-policy" className="hover:text-slate-300 transition-colors">Privacy</Link> ·{' '}
          <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms</Link>
        </p>
      </footer>
    </div>
  );
}
