import { Metadata } from 'next';
import { HeaderWithSession } from '@/components/marketing/HeaderWithSession';
import { Footer } from '@/components/marketing/Footer';
import { Container } from '@/components/layout/Container';
import {
  ArrowRight,
  CheckCircle2,
  Shield,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About | TaxFormatter',
  description: 'Learn about TaxFormatter - the CSV repair tool that fixes messy exchange exports in seconds. Founded by Sean at Quantum Transfer Group.',
};

export default function AboutPage() {
  return (
    <>
      <HeaderWithSession />
      <main className="min-h-screen bg-[#020617] text-slate-300 relative overflow-hidden">
        {/* Background ambient glows */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-cyan-600/5 rounded-full blur-[100px]" />
        </div>

        <div className="pt-32 pb-20 relative z-10">
          <Container>
            {/* Hero Section */}
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
                About TaxFormatter
              </h1>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                The CSV repair tool I wish existed every tax season.
              </p>
            </div>

            {/* The Problem */}
            <div className="max-w-3xl mx-auto mb-16">
              <div className="p-8 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-800/40 to-slate-900/80">
                <h2 className="text-2xl font-semibold text-white mb-4">
                  The Problem I Kept Running Into
                </h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Every tax season, the same nightmare: export transactions from Coinbase, try to import into TurboTax, watch it fail with cryptic CSV errors. Spend hours reformatting columns, fixing date formats, removing metadata rows. Repeat for every exchange.
                </p>
                <p className="text-slate-300 font-medium">
                  I built TaxFormatter to fix this in seconds instead of hours.
                </p>
              </div>
            </div>

            {/* What TaxFormatter Does */}
            <div className="max-w-3xl mx-auto mb-16">
              <h2 className="text-2xl font-semibold text-white mb-6 text-center">
                What TaxFormatter Does
              </h2>
              <p className="text-slate-400 text-center mb-8 max-w-xl mx-auto">
                TaxFormatter is a CSV repair tool. Upload your messy exchange export, get back a clean file that actually imports into your tax software. That's it.
              </p>

              <div className="grid sm:grid-cols-2 gap-6">
                {/* We Support */}
                <div className="p-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                  <h3 className="text-lg font-medium text-emerald-400 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    We support
                  </h3>
                  <ul className="space-y-3 text-slate-300">
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                      <span><strong className="text-white">14 exchanges</strong> (Coinbase, Binance, Kraken, and more)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                      <span><strong className="text-white">4 export formats</strong> (TurboTax, Koinly, CoinLedger, ZenLedger)</span>
                    </li>
                  </ul>
                </div>

                {/* We Are Not */}
                <div className="p-6 rounded-xl border border-slate-700 bg-slate-800/30">
                  <h3 className="text-lg font-medium text-slate-400 mb-4">
                    We are not
                  </h3>
                  <ul className="space-y-3 text-slate-400">
                    <li className="flex items-start gap-2">
                      <span className="text-slate-600 mt-1">—</span>
                      <span>Tax advisors</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-slate-600 mt-1">—</span>
                      <span>A replacement for tax software</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-slate-600 mt-1">—</span>
                      <span>A place to store your data long-term</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* How Your Data Is Handled */}
            <div className="max-w-3xl mx-auto mb-16">
              <div className="p-8 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 via-slate-900 to-slate-900">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-white mb-4">
                      How Your Data Is Handled
                    </h2>
                    <p className="text-slate-400 leading-relaxed mb-4">
                      Your files are processed, converted, and available for download. We don't sell your data or use it for anything other than generating your formatted export.
                    </p>
                    <div className="flex items-center gap-2 text-cyan-400 font-medium">
                      <Trash2 className="w-4 h-4" />
                      <span>You control your data</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-3">
                      Delete your files anytime from your dashboard. Files are retained for up to 1 year for your convenience, then automatically removed.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Who's Behind This */}
            <div className="max-w-3xl mx-auto mb-16">
              <div className="p-8 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-800/40 to-slate-900/80">
                <h2 className="text-2xl font-semibold text-white mb-4">
                  Who's Behind This
                </h2>
                <p className="text-slate-400 leading-relaxed">
                  I'm Sean Palomino, founder of Quantum Transfer Group. I've been in the crypto space for years and got tired of the same CSV headaches every April. TaxFormatter is the tool I wished existed.
                </p>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-sm text-slate-500 border-t border-slate-800 pt-8">
                TaxFormatter is a formatting utility, not a tax preparation service. Always consult a qualified tax professional for tax advice.
              </p>
            </div>

            {/* CTA */}
            <div className="text-center py-12 mt-8">
              <div className="flex items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl transition-colors"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white font-medium rounded-xl transition-colors"
                >
                  Contact Us
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
