'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Logo } from '@/components/ui/Logo';
import { uploadBankStatement, validateBankFile } from '@/lib/bank-upload-client';
import { trackConversion } from '@/lib/analytics';
import Link from 'next/link';
import {
  Upload,
  Shield,
  CheckCircle2,
  Search,
  Activity,
  FileText,
  ArrowRight,
  AlertCircle,
  Download,
} from 'lucide-react';

const BANKS = [
  'Chase', 'Bank of America', 'Wells Fargo', 'Citi', 'Capital One',
  'US Bank', 'PNC', 'TD Bank', 'Mercury', 'Navy Federal', 'Regions', 'HSBC', 'BMO',
];

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

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export default function UploadLandingPage() {
  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [detectedBank, setDetectedBank] = useState<string | null>(null);
  const [transactionCount, setTransactionCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Capture UTM params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const source = params.get('utm_source');
    if (source) {
      trackConversion('landing_page_view');
    }
  }, []);

  const handleFile = useCallback(async (file: File) => {
    const validation = validateBankFile(file);
    if (!validation.valid) {
      setState('error');
      setErrorMsg(validation.error || 'Invalid file');
      return;
    }

    setState('uploading');
    setProgress(0);
    setErrorMsg('');
    trackConversion('bank_upload_started');

    try {
      const result = await uploadBankStatement(file, 'excel', (stage, percent) => {
        setProgress(percent);
        switch (stage) {
          case 'requesting':
            setProgressLabel('Detecting bank format...');
            break;
          case 'uploading':
            setProgressLabel('Uploading your statement...');
            break;
          case 'processing':
            setProgressLabel(percent >= 100 ? 'Complete!' : 'Extracting transactions...');
            break;
        }
      });

      // Capture result for download
      if (result.downloadUrl) {
        setDownloadUrl(result.downloadUrl);
      } else if (result.jobId) {
        // Fallback: fetch download URL from the download endpoint
        setJobId(result.jobId);
      }
      if (result.detectedBank) setDetectedBank(result.detectedBank);
      if (result.transactionCount) setTransactionCount(result.transactionCount);

      setState('success');
      trackConversion('bank_upload_completed');
    } catch (err: unknown) {
      setState('error');
      const msg = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Upload failed. Please try again.';
      setErrorMsg(msg);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const reset = () => {
    setState('idle');
    setProgress(0);
    setProgressLabel('');
    setErrorMsg('');
    setDownloadUrl(null);
    setJobId(null);
    setDetectedBank(null);
    setTransactionCount(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
            Files deleted after 24hrs
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
          <div
            className={`relative rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 cursor-pointer ${
              dragOver
                ? 'border-accent-500 bg-accent-500/5'
                : state === 'error'
                ? 'border-red-500/40 bg-red-500/5'
                : 'border-slate-700 bg-slate-900/60 hover:border-primary-500 hover:bg-primary-500/5'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => state === 'idle' && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={onFileChange}
            />

            {/* Idle */}
            {state === 'idle' && (
              <>
                <div className="mx-auto mb-5 w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold mb-1.5">Drop your bank statement PDF here</h3>
                <p className="text-sm text-slate-500">
                  or <span className="text-primary-400 underline underline-offset-2 decoration-primary-400/30">browse files</span> — .pdf up to 50MB
                </p>
                <p className="mt-4 text-xs text-slate-600 font-mono">
                  Chase · Bank of America · Wells Fargo · Navy Federal · 9 more
                </p>
              </>
            )}

            {/* Uploading */}
            {state === 'uploading' && (
              <>
                <div className="mx-auto mb-5 w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary-400 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-3">Processing your file...</h3>
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 font-mono">{progressLabel}</p>
              </>
            )}

            {/* Success */}
            {state === 'success' && (
              <>
                <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-accent-500/10 border-2 border-accent-500 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-accent-500" />
                </div>
                <h3 className="text-lg font-semibold text-accent-400 mb-2">
                  {transactionCount
                    ? `${transactionCount} transactions extracted!`
                    : 'Statement converted!'}
                </h3>
                {detectedBank && (
                  <p className="text-xs text-slate-500 font-mono mb-3">
                    Detected: {detectedBank}
                  </p>
                )}
                <p className="text-sm text-slate-400 mb-4">
                  Your file is ready. Download your converted spreadsheet below.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {downloadUrl ? (
                    <a
                      href={downloadUrl}
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download CSV
                    </a>
                  ) : (
                    <Link
                      href="/signup"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-colors"
                    >
                      Create Free Account
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); reset(); }}
                    className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Upload another file
                  </button>
                </div>
              </>
            )}

            {/* Error */}
            {state === 'error' && (
              <>
                <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-red-500/10 border-2 border-red-500/40 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-red-400 mb-2">Upload failed</h3>
                <p className="text-sm text-slate-400 mb-4">{errorMsg}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); reset(); }}
                  className="text-sm text-primary-400 hover:text-primary-300 underline underline-offset-2 transition-colors"
                >
                  Try again
                </button>
              </>
            )}
          </div>
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
            {BANKS.map((name) => (
              <span
                key={name}
                className="rounded-lg border border-slate-800 bg-slate-900/60 px-3.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-200"
              >
                {name}
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
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-700 text-white font-semibold text-base shadow-glow hover:shadow-[0_0_50px_-10px_rgba(99,91,255,0.4)] hover:-translate-y-0.5 transition-all duration-200"
          >
            Convert My Statement for Free
            <ArrowRight className="w-4.5 h-4.5" />
          </button>
          <div className="mt-5 flex items-center justify-center gap-5 text-xs text-slate-500 flex-wrap">
            {['Free during beta', 'No signup required', 'Files auto-deleted in 24hrs'].map((text) => (
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
