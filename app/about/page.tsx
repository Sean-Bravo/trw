import { Metadata } from 'next';
import { Header } from '@/components/marketing/Header';
import { Footer } from '@/components/marketing/Footer';
import { Container } from '@/components/layout/Container';
import {
  ArrowRight,
  CheckCircle2,
  Shield,
  Terminal,
  User,
  AlertTriangle,
  Sparkles,
  Database,
  FileSpreadsheet
} from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About | TaxFormatter',
  description: 'The CSV repair tool that fixes messy exchange exports. Founded by Sean at Quantum Transfer Group.',
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#020617] text-slate-300 relative selection:bg-indigo-500/30">

        {/* Technical Background Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-indigo-500 opacity-20 blur-[100px]" />

        <div className="pt-32 pb-24 relative z-10">
          <Container>

            {/* 1. Hero Section */}
            <div className="max-w-4xl mx-auto text-center mb-24">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-8">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Founded by Sean @ Quantum Transfer Group</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 tracking-tight">
                The CSV repair tool <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                  I wish existed.
                </span>
              </h1>

              <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Every tax season brings the same headache. We built TaxFormatter to fix messy exchange exports in seconds, not hours.
              </p>
            </div>

            {/* 2. The Narrative (Split Layout) */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* The Problem Card */}
              <div className="p-8 md:p-10 rounded-3xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm relative overflow-hidden group hover:border-red-500/30 transition-colors duration-500">
                <div className="absolute top-0 right-0 p-32 bg-red-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                <div className="relative z-10">
                  <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mb-6 border border-slate-700">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-4">The April Nightmare</h2>
                  <p className="text-slate-400 leading-relaxed">
                    "It was the same ritual every year: export transactions from Coinbase, try to import into TurboTax, and watch it fail with cryptic CSV errors. I'd spend hours manually reformatting columns, fixing date formats, and scrubbing metadata rows. Then I'd have to repeat that process for every single exchange."
                  </p>
                </div>
              </div>

              {/* The Solution Card */}
              <div className="p-8 md:p-10 rounded-3xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm relative overflow-hidden group hover:border-emerald-500/30 transition-colors duration-500">
                <div className="absolute top-0 right-0 p-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                <div className="relative z-10">
                  <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mb-6 border border-slate-700">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-4">The Instant Fix</h2>
                  <p className="text-slate-400 leading-relaxed">
                    TaxFormatter is the answer to that frustration. It is a dedicated utility that takes your messy exchange export and returns a clean, standardized file that actually works. We focused on one thing: making your data compatible with your tax software instantly.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. The Bento Grid (Capabilities) */}
            <div className="grid md:grid-cols-3 gap-8 mb-24">

              {/* Card: Support */}
              <div className="md:col-span-2 p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/30 transition-all group">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                      <Terminal className="w-5 h-5 text-indigo-400" />
                      Universal Translator
                    </h3>
                    <p className="text-slate-400 mb-4 md:mb-0">
                      We support <strong className="text-white">14+ exchanges</strong> (including Coinbase, Binance, Kraken) and convert them into <strong className="text-white">4 distinct export formats</strong>.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700 text-xs font-mono text-slate-300">
                       <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                       TurboTax
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700 text-xs font-mono text-slate-300">
                       <Database className="w-3.5 h-3.5 text-blue-400" />
                       Koinly
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700 text-xs font-mono text-slate-300">
                       <Terminal className="w-3.5 h-3.5 text-purple-400" />
                       ZenLedger
                    </div>
                  </div>
                </div>
              </div>

              {/* Card: Privacy */}
              <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-cyan-500/30 transition-all">
                <Shield className="w-8 h-8 text-cyan-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">You Control Data</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  We don't sell data. Files are retained for your convenience for 1 year, or you can delete them anytime instantly from your dashboard.
                </p>
              </div>

              {/* Card: What we are not */}
              <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all md:col-span-1">
                 <h3 className="text-lg font-semibold text-slate-200 mb-4">What we are not</h3>
                 <ul className="space-y-3 text-sm text-slate-400">
                    <li className="flex gap-3 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                      <span>Not a CPA firm</span>
                    </li>
                    <li className="flex gap-3 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                      <span>No tax advice provided</span>
                    </li>
                    <li className="flex gap-3 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                      <span>Not a long-term storage vault</span>
                    </li>
                 </ul>
              </div>

               {/* Card: The Founder */}
               <div className="md:col-span-2 p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 relative overflow-hidden">
                  <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center shrink-0 border-2 border-slate-600 shadow-xl">
                      <User className="w-8 h-8 text-slate-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">A Note from Sean</h3>
                      <p className="text-slate-300 italic mb-4 text-lg">
                        "I've been in the crypto space for years. I built this because I needed it, and I realized thousands of others did too."
                      </p>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                         <span className="text-slate-400 font-medium">Founder, Quantum Transfer Group</span>
                         <a href="mailto:sean@taxformatter.com" className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium">sean@taxformatter.com</a>
                      </div>
                    </div>
                  </div>
              </div>

            </div>

            {/* 4. Footer CTA */}
            <div className="text-center border-t border-slate-800 pt-16">
              <p className="text-slate-500 mb-8 max-w-2xl mx-auto text-sm">
                Disclaimer: TaxFormatter is a formatting utility, not a tax preparation service. Always consult a qualified tax professional for tax advice.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className="px-8 py-4 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2"
                >
                  Start Fixing CSVs
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/contact"
                  className="px-8 py-4 bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 font-medium rounded-xl transition-all"
                >
                  Contact Support
                </Link>
              </div>
            </div>

          </Container>
        </div>
      </main>
      <Footer />
    </>
  );
}
