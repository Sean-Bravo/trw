'use client';

import React from 'react';
import { Container } from '../layout/Container';
import { Button } from '../ui/Button';
import { trackSignUp } from '@/lib/analytics';
import { ArrowRight, Sparkles, Check } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Gradient Mesh Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Primary gradient blob */}
        <div
          className="absolute -top-1/4 -right-1/4 w-[80%] h-[80%] rounded-full opacity-30 dark:opacity-20 blur-3xl animate-mesh"
          style={{
            background: 'radial-gradient(circle, rgba(99,91,255,0.4) 0%, rgba(99,91,255,0) 70%)',
          }}
        />
        {/* Accent gradient blob */}
        <div
          className="absolute -bottom-1/4 -left-1/4 w-[60%] h-[60%] rounded-full opacity-25 dark:opacity-15 blur-3xl animate-mesh"
          style={{
            background: 'radial-gradient(circle, rgba(0,212,170,0.4) 0%, rgba(0,212,170,0) 70%)',
            animationDelay: '-4s',
          }}
        />
        {/* Subtle top-right accent */}
        <div
          className="absolute top-1/4 right-1/3 w-[40%] h-[40%] rounded-full opacity-20 dark:opacity-10 blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(99,91,255,0.3) 0%, transparent 70%)',
          }}
        />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `linear-gradient(rgba(99,91,255,0.5) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(99,91,255,0.5) 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      <Container>
        <div className="relative z-10 max-w-4xl mx-auto text-center py-20">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-sm animate-fade-in-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent-500)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-accent-500)]"></span>
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
              AI-Powered CSV Repair
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-poppins text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white leading-[1.1] tracking-tight mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            Fix Your Broken Exchange CSVs
            <span className="block mt-2 bg-gradient-to-r from-[var(--color-primary-500)] via-[var(--color-primary-400)] to-[var(--color-accent-500)] bg-clip-text text-transparent">
              in Seconds
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            Your exchange exported garbage. We clean it, fix the formatting errors, and make it import-ready for Koinly, TurboTax, and every other tax platform. They do the math—we fix the mess.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <Button
              variant="primary"
              href="/signup"
              showArrow
              onClick={() => trackSignUp()}
              className="text-base px-8 py-3 h-12"
            >
              Fix Now
            </Button>
            <Button
              variant="secondary"
              href="#pricing"
              className="text-base px-8 py-3 h-12"
            >
              View Pricing
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600 dark:text-slate-300 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-[var(--color-accent-500)]" />
              <span>10,000+ files processed</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-[var(--color-accent-500)]" />
              <span>99.9% accuracy</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-[var(--color-accent-500)]" />
              <span>Works with 12 exchanges</span>
            </div>
          </div>

          {/* Sample Output Link */}
          <div className="mt-6 animate-fade-in-up" style={{ animationDelay: '450ms' }}>
            <a
              href="/samples"
              className="text-sm text-slate-600 dark:text-slate-300 hover:text-[var(--color-primary-500)] dark:hover:text-[var(--color-primary-400)] transition-colors underline underline-offset-4"
            >
              Not ready to upload? See sample outputs first →
            </a>
          </div>
        </div>

        {/* Product Preview Card */}
        <div className="relative z-10 max-w-3xl mx-auto mt-8 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
          <div className="relative">
            {/* Glow effect behind card */}
            <div className="absolute -inset-4 bg-gradient-to-r from-[var(--color-primary-500)]/20 via-[var(--color-accent-500)]/20 to-[var(--color-primary-500)]/20 rounded-3xl blur-2xl opacity-60 dark:opacity-40" />

            {/* Main card */}
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xl overflow-hidden">
              {/* Card header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                  <div className="w-3 h-3 rounded-full bg-green-400/80" />
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-400 font-medium ml-2">
                  TaxFormatter Pro
                </span>
              </div>

              {/* Card content */}
              <div className="p-6 sm:p-8">
                <div className="grid sm:grid-cols-2 gap-6">
                  {/* Before */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-400 dark:text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-red-400" />
                      Before
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 font-mono text-xs text-slate-400 dark:text-slate-300 space-y-1 overflow-hidden">
                      <div className="text-red-500">date,type,amount,currency</div>
                      <div className="opacity-60">2024-01-15,BUY,0.5,BTC</div>
                      <div className="text-red-500 line-through">N/A,UNKNOWN,???,ETH</div>
                      <div className="text-amber-500">01/20/24,sell,1.2,</div>
                      <div className="opacity-40">...</div>
                    </div>
                  </div>

                  {/* After */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-400 dark:text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-[var(--color-accent-500)]" />
                      After
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 font-mono text-xs text-slate-400 dark:text-slate-300 space-y-1 overflow-hidden">
                      <div className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]">date,type,amount,currency</div>
                      <div>2024-01-15,BUY,0.5,BTC</div>
                      <div className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]">2024-01-18,TRANSFER,0.25,ETH</div>
                      <div className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]">2024-01-20,SELL,1.2,ETH</div>
                      <div className="opacity-40">...</div>
                    </div>
                  </div>
                </div>

                {/* Status bar */}
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-accent-500)]/10 text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-sm font-medium">AI Enhanced</span>
                    </div>
                    <span className="text-sm text-slate-400 dark:text-slate-300">
                      4 issues fixed
                    </span>
                  </div>
                  <div className="text-sm font-medium text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]">
                    Ready for export →
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
