'use client';

import React from 'react';
import { Container } from '../layout/Container';
import { Check, Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const tiers = [
  {
    name: 'Starter',
    price: '$29',
    period: '/ month',
    description: 'For solo developers and small projects.',
    features: [
      '100 files / month',
      '30 requests / minute',
      'All 14 exchanges',
      'Auto-detection',
      'JSON response',
    ],
    cta: 'Get Started',
    ctaHref: '/signup?api_tier=starter',
    style: 'bg-white/2 border-white/6',
    checkColor: 'text-slate-500',
  },
  {
    name: 'Growth',
    price: '$99',
    period: '/ month',
    description: 'For apps and services processing user files.',
    badge: 'POPULAR',
    features: [
      '500 files / month',
      '60 requests / minute',
      'Bank PDF parsing',
      'All output formats',
      'Priority support',
      'Usage analytics',
    ],
    cta: 'Start Building',
    ctaHref: '/signup?api_tier=growth',
    highlight: true,
    style: 'bg-[#111b2e] border-[#635bff]/30',
    checkColor: 'text-[#635bff]',
  },
  {
    name: 'Business',
    price: '$249',
    period: '/ month',
    description: 'High-volume parsing for platforms and enterprises.',
    features: [
      '2,000 files / month',
      '120 requests / minute',
      'Everything in Growth',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
    ],
    cta: 'Get Started',
    ctaHref: '/signup?api_tier=business',
    style: 'bg-white/2 border-white/6',
    checkColor: 'text-slate-500',
  },
];

export function APIPricing() {
  return (
    <section className="py-28 bg-[#0b1121] relative overflow-hidden" id="pricing">
      {/* Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-225 h-100 bg-[#635bff]/5 rounded-[100%] blur-[120px]" />

      <Container>
        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-16">
            <p className="text-[13px] font-semibold text-[#635bff] uppercase tracking-[0.15em] mb-4">API Pricing</p>
            <h2 className="font-poppins text-3xl md:text-[2.75rem] font-bold text-white mb-5 tracking-tight">
              Pay for what you parse.
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto text-lg">
              Simple plans that scale with you. No hidden fees.
            </p>
          </div>

          {/* Grid */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl border p-8 flex flex-col transition-all ${tier.style} ${
                  tier.highlight ? 'md:-translate-y-2 shadow-[0_0_60px_-15px_rgba(99,91,255,0.2)]' : ''
                }`}
              >
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-linear-to-r from-[#635bff] to-primary-400 text-[11px] font-bold text-white tracking-wide shadow-lg">
                    {tier.badge}
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-slate-300 mb-3">{tier.name}</h3>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-bold text-white">{tier.price}</span>
                    <span className="text-slate-500 text-sm">{tier.period}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-3">{tier.description}</p>
                </div>

                <ul className="space-y-3.5 mb-8 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-[14px] text-slate-300">
                      <Check className={`w-4 h-4 shrink-0 ${tier.checkColor}`} />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.ctaHref}
                  className={`block w-full py-3.5 px-4 text-center font-semibold rounded-xl text-[14px] transition-all ${
                    tier.highlight
                      ? 'bg-linear-to-r from-[#635bff] to-primary-400 text-white hover:opacity-90 shadow-lg shadow-[#635bff]/20'
                      : 'bg-white/4 text-slate-300 border border-white/8 hover:bg-white/6 hover:border-white/12'
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* Also available note */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/2 border border-white/5">
              <Zap className="w-5 h-5 text-amber-400" />
              <p className="text-sm text-slate-400">
                <span className="text-white font-medium">Not a developer?</span>
                {' '}Upload CSVs directly at{' '}
                <Link href="/dashboard" className="text-[#635bff] hover:underline underline-offset-4">
                  taxformatter.com/dashboard
                </Link>
                {' '}— no code required.
              </p>
              <ArrowRight className="w-4 h-4 text-slate-600" />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
