'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Download, FileSearch, Shield, Upload } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { BankUploadBox, BankUploadBoxHandle } from '@/components/upload/BankUploadBox';
import { BankBeforeAfter } from '@/components/upload/BankBeforeAfter';
import { STATEMENTS_PER_HOUR_ACCOUNT, STATEMENTS_PER_HOUR_ANON } from '@/lib/bank-allowance';
import { trackConversion } from '@/lib/analytics';
import { BETA_BANKS, VERIFIED_BANKS, formatBankList } from '@/lib/bank-registry';

/**
 * Bank landing page — the nontechnical destination for the bank funnel.
 *
 * Rules this page keeps (go/no-go, Oct 12–14): the upload box sits above
 * the fold, the headline is the outcome the visitor came for, and nothing
 * here speaks to developers — no API, keys, code, or model names. Those
 * live on the developer pages. The upload flow itself is BankUploadBox,
 * shared with /upload, so both funnels fire the same conversion events.
 */

const STEPS = [
  {
    icon: Upload,
    title: 'Upload the PDF',
    desc: 'The monthly statement you download from online banking or get by email. Nothing to install, no account to create.',
  },
  {
    icon: FileSearch,
    title: 'We find every transaction',
    desc: 'Dates, descriptions and amounts are pulled off every page and lined up one transaction per row.',
  },
  {
    icon: Download,
    title: 'Download your spreadsheet',
    desc: 'Open it in Excel, or import it straight into QuickBooks or Xero. Switch formats after the fact if you need to.',
  },
];

export default function BankStatementLandingPage() {
  const uploadBoxRef = useRef<BankUploadBoxHandle>(null);

  // Same acquisition hook as /upload so ad landings are counted.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('utm_source')) {
      trackConversion('landing_page_view');
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="fixed inset-0 pointer-events-none bg-mesh-dark opacity-60" />

      <header className="relative z-10 max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <Logo variant="light" />
        <div className="hidden sm:flex items-center gap-5 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-accent-500" />
            No signup required
          </span>
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-accent-500" />
            Files deleted within 30 days
          </span>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero: the outcome, then the box — both above the fold */}
        <section className="text-center px-4 pt-10 pb-6 max-w-3xl mx-auto">
          <p className="text-xs font-medium uppercase tracking-widest text-primary-400 mb-4">
            Bank statement PDF to spreadsheet
          </p>
          <h1 className="font-poppins text-3xl sm:text-5xl font-bold leading-tight tracking-tight mb-4">
            Your bank statement, as a{' '}
            <em className="not-italic text-primary-400">clean spreadsheet</em>.
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
            Upload the PDF your bank gave you. Get back a file that opens in Excel or imports into QuickBooks or Xero, with every transaction on its own row. Usually under a minute.
          </p>
        </section>

        <section className="max-w-xl mx-auto px-4 pb-12">
          <BankUploadBox ref={uploadBoxRef} showExample={false} />
          <p className="mt-3 text-center text-xs text-slate-500">
            Free while we&apos;re in beta · No account needed · Files deleted within 30 days
          </p>
        </section>

        <BankBeforeAfter />

        {/* How it works */}
        <section className="max-w-4xl mx-auto px-4 pb-16">
          <h2 className="text-center text-xs font-medium text-slate-500 uppercase tracking-widest mb-6">
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 transition-colors hover:border-slate-700"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-primary-400" />
                  </div>
                  <span className="text-xs font-mono text-slate-600">{i + 1}</span>
                </div>
                <h3 className="text-sm font-semibold mb-1.5">{step.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Banks: verified = supported; beta kept visibly apart */}
        <section className="max-w-3xl mx-auto px-4 pb-16 text-center">
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-5">
            Works with statements from
          </h2>
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {VERIFIED_BANKS.map((bank) => (
              <span
                key={bank.id}
                className="rounded-lg border border-slate-800 bg-slate-900/60 px-3.5 py-1.5 text-xs font-medium text-slate-300"
                title="Tested against real statements"
              >
                {bank.name}
              </span>
            ))}
          </div>
          {BETA_BANKS.length > 0 && (
            <p className="text-xs text-slate-500">
              In testing: {formatBankList(BETA_BANKS)}. Statements from these banks may need a second look after conversion.
            </p>
          )}
        </section>

        {/* What it costs and what happens to the file — in the policy's own words */}
        <section className="max-w-3xl mx-auto px-4 pb-16" aria-labelledby="trust-heading">
          <h2 id="trust-heading" className="text-center text-xs font-medium text-slate-500 uppercase tracking-widest mb-5">
            Price and privacy
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h3 className="text-sm font-semibold mb-1.5">Free while we&apos;re in beta</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                No account needed and nothing to pay. Convert up to {STATEMENTS_PER_HOUR_ANON} statements an hour, or {STATEMENTS_PER_HOUR_ACCOUNT} an hour with a free account. If we ever charge for this, the price will be on this page before it applies.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h3 className="text-sm font-semibold mb-1.5">Deleted within 30 days</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Everything you send us is deleted within 30 days: the uploaded statement, the converted file, and the extracted rows. We keep only anonymous processing details such as the bank detected and the row count. We never train on your data, and neither do our providers.
              </p>
            </div>
          </div>
        </section>

        {/* One CTA, back to the box */}
        <section className="text-center px-4 pb-20">
          <button
            onClick={() => uploadBoxRef.current?.openFilePicker()}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-linear-to-r from-primary-500 to-primary-700 text-white font-semibold text-base shadow-glow hover:shadow-[0_0_50px_-10px_rgba(99,91,255,0.4)] hover:-translate-y-0.5 transition-all duration-200"
          >
            Convert my statement
            <ArrowRight className="w-4.5 h-4.5" />
          </button>
        </section>
      </main>

      <footer className="relative z-10 border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <p>
          © {new Date().getFullYear()} TaxFormatter ·{' '}
          <Link href="/security" className="hover:text-slate-300 transition-colors">Security</Link> ·{' '}
          <Link href="/privacy-policy" className="hover:text-slate-300 transition-colors">Privacy</Link> ·{' '}
          <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms</Link>
        </p>
      </footer>
    </div>
  );
}
