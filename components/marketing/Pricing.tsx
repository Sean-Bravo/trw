'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, X, Shield, Crown, Sparkles } from 'lucide-react';

const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(true);

  // Pricing configuration
  const pricing = {
    pro: {
      monthly: 9,
      annual: 89,
    },
    premium: {
      monthly: 19,
      annual: 189,
    },
  };

  return (
    <section className="py-24 bg-[#020617] relative overflow-hidden" id="pricing">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[500px] bg-indigo-500/10 rounded-[100%] blur-[100px] pointer-events-none"></div>

      <div className="container mx-auto px-4 relative z-10">

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Simple, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Transparent</span> Pricing.
          </h2>
          <p className="text-slate-400 text-lg">
            No hidden fees. No recurring nightmares. Pay for what you need to file this year.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-16">
          <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-white' : 'text-slate-400'}`}>
            Monthly
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="relative w-16 h-8 bg-slate-800 rounded-full p-1 transition-colors border border-slate-700 hover:border-slate-600"
            aria-label="Toggle billing period"
          >
            <div
              className={`absolute top-1 w-6 h-6 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 shadow-lg transition-all duration-300 ${
                isAnnual ? 'left-[calc(100%-28px)]' : 'left-1'
              }`}
            />
          </button>
          <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-white' : 'text-slate-400'}`}>
            Annual
          </span>
          {isAnnual && (
            <span className="ml-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full">
              Save 17%
            </span>
          )}
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">

          {/* TIER 1: FREE */}
          <div className="group relative bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-slate-700 transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-800 to-slate-700 rounded-t-2xl opacity-50"></div>

            <div className="mb-8">
              <h3 className="text-lg font-medium text-slate-300 mb-2">Starter</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">$0</span>
                <span className="text-slate-400">/ forever</span>
              </div>
              <p className="text-slate-400 text-sm mt-4">
                Perfect for testing the waters and seeing if your file format is supported.
              </p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 text-slate-300 text-sm">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Format 1 CSV File</span>
              </li>
              <li className="flex items-center gap-3 text-slate-300 text-sm">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Preview Output (5 rows)</span>
              </li>
              <li className="flex items-center gap-3 text-slate-300 text-sm">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Basic Error Detection</span>
              </li>
              <li className="flex items-center gap-3 text-slate-400 text-sm opacity-50">
                <X className="w-4 h-4" />
                <span>Full Export Download</span>
              </li>
            </ul>

            <Link
              href="/signup"
              className="block w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white text-center font-medium rounded-lg transition-colors border border-slate-700"
            >
              Try For Free
            </Link>
          </div>

          {/* TIER 2: PRO (HERO CARD) */}
          <div className="relative bg-slate-900 border border-indigo-500/50 rounded-2xl p-8 shadow-[0_0_50px_-15px_rgba(99,102,241,0.3)] transform md:-translate-y-4 md:scale-105 z-10">
            {/* "Popular" Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white px-4 py-1 rounded-full text-xs font-bold tracking-wide shadow-lg flex items-center gap-1">
              <Sparkles className="w-3 h-3 fill-current" />
              MOST POPULAR
            </div>

            {/* Glow Effect behind card */}
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent rounded-2xl pointer-events-none"></div>

            <div className="mb-8 relative">
              <h3 className="text-lg font-medium text-indigo-300 mb-2 flex items-center gap-2">
                <Crown className="w-5 h-5" />
                Pro Pass
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold text-white">
                  ${isAnnual ? pricing.pro.annual : pricing.pro.monthly}
                </span>
                <span className="text-indigo-200/60">/ {isAnnual ? 'year' : 'month'}</span>
              </div>
              {isAnnual && (
                <p className="text-emerald-400 text-xs mt-2">
                  ${pricing.pro.monthly}/mo billed annually
                </p>
              )}
              <p className="text-slate-400 text-sm mt-4">
                Everything you need to file your taxes this year. Unlimited formatting for all your wallets.
              </p>
            </div>

            <ul className="space-y-4 mb-8 relative">
              <li className="flex items-center gap-3 text-white text-sm">
                <div className="p-1 rounded-full bg-indigo-500/20 text-indigo-400"><Check className="w-3 h-3" strokeWidth={3} /></div>
                <span><strong>Unlimited</strong> CSV Uploads</span>
              </li>
              <li className="flex items-center gap-3 text-white text-sm">
                <div className="p-1 rounded-full bg-indigo-500/20 text-indigo-400"><Check className="w-3 h-3" strokeWidth={3} /></div>
                <span>Full Export Capabilities</span>
              </li>
              <li className="flex items-center gap-3 text-white text-sm">
                <div className="p-1 rounded-full bg-indigo-500/20 text-indigo-400"><Check className="w-3 h-3" strokeWidth={3} /></div>
                <span>Bank PDF → Excel (Big 4)</span>
              </li>
              <li className="flex items-center gap-3 text-white text-sm">
                <div className="p-1 rounded-full bg-indigo-500/20 text-indigo-400"><Check className="w-3 h-3" strokeWidth={3} /></div>
                <span>Auto-Fix Date Errors</span>
              </li>
              <li className="flex items-center gap-3 text-white text-sm">
                <div className="p-1 rounded-full bg-indigo-500/20 text-indigo-400"><Check className="w-3 h-3" strokeWidth={3} /></div>
                <span>Email Support</span>
              </li>
            </ul>

            <Link
              href={`/signup?plan=pro&billing=${isAnnual ? 'annual' : 'monthly'}`}
              className="block w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-center font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/25 relative overflow-hidden group"
            >
              <span className="relative z-10">Get Pro Access</span>
              {/* Button Shine Effect */}
              <div className="absolute top-0 -left-full w-full h-full bg-white/20 skew-x-12 group-hover:animate-[shimmer_1.5s_infinite]"></div>
            </Link>

            <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-slate-400">
               <Shield className="w-3 h-3" />
               <span>30-Day Money Back Guarantee</span>
            </div>
          </div>

          {/* TIER 3: PREMIUM */}
          <div className="group relative bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-slate-700 transition-all duration-300">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-700 to-slate-800 rounded-t-2xl opacity-50"></div>

            <div className="mb-8">
              <h3 className="text-lg font-medium text-slate-300 mb-2">Premium</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">
                  ${isAnnual ? pricing.premium.annual : pricing.premium.monthly}
                </span>
                <span className="text-slate-400">/ {isAnnual ? 'year' : 'month'}</span>
              </div>
              {isAnnual && (
                <p className="text-emerald-400/70 text-xs mt-2">
                  ${pricing.premium.monthly}/mo billed annually
                </p>
              )}
              <p className="text-slate-400 text-sm mt-4">
                For power users who need audit-ready documentation and priority support.
              </p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 text-slate-300 text-sm">
                <Check className="w-4 h-4 text-slate-400" />
                <span><strong>Everything</strong> in Pro</span>
              </li>
              <li className="flex items-center gap-3 text-slate-300 text-sm">
                <Check className="w-4 h-4 text-slate-400" />
                <span>Bank PDF → Excel (All Banks)</span>
              </li>
              <li className="flex items-center gap-3 text-slate-300 text-sm">
                <Check className="w-4 h-4 text-slate-400" />
                <span>Request New Bank Formats</span>
              </li>
              <li className="flex items-center gap-3 text-slate-300 text-sm">
                <Check className="w-4 h-4 text-slate-400" />
                <span>AI-Generated PDF Report</span>
              </li>
              <li className="flex items-center gap-3 text-slate-300 text-sm">
                <Check className="w-4 h-4 text-slate-400" />
                <span>Priority Support</span>
              </li>
            </ul>

            <Link
              href={`/signup?plan=premium&billing=${isAnnual ? 'annual' : 'monthly'}`}
              className="block w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white text-center font-medium rounded-lg transition-colors border border-slate-700"
            >
              Get Premium Access
            </Link>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-16 text-center">
            <p className="text-slate-400 text-sm">
                Prices are in USD. Secure payments processed by <span className="text-slate-400 font-semibold">Stripe</span>.
                <br className="md:hidden" /> Questions? <Link href="/contact" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4">Talk to us</Link>.
            </p>
        </div>

      </div>
    </section>
  );
};

export { Pricing };
export default Pricing;
