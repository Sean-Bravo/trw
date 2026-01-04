'use client';

import React from 'react';
import { Container } from '../layout/Container';
import { Button } from '../ui/Button';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    description: "Understand what's broken before you fix it.",
    features: [
      'Upload and analyze CSV files',
      'AI insight panels',
      'Issue detection (wash sales, duplicates)',
      'No export',
    ],
    cta: 'Analyze Free',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$89',
    period: '/tax year',
    description: 'Get a corrected CSV for tax software.',
    features: [
      'Tax-compliant corrected CSV',
      'Cost basis adjustments',
      'Wash sale handling',
      'All platform exports',
      'Unlimited re-runs',
      'Email support',
    ],
    cta: 'Get Pro',
    popular: true,
  },
  {
    name: 'Premium',
    price: '$189',
    period: '/tax year',
    description: 'Audit-ready documentation.',
    features: [
      'Everything in Pro',
      'AI-generated PDF report',
      'Line-by-line explanations',
      'Audit-ready notes',
      'Priority support',
    ],
    cta: 'Get Premium',
    popular: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 sm:py-32 bg-slate-50 dark:bg-slate-900">
      <Container>
        <div className="text-center mb-16">
          {/* Coming Soon Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-[var(--color-primary-500)]/10 border border-[var(--color-primary-500)]/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-primary-500)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-primary-500)]"></span>
            </span>
            <span className="text-sm font-semibold text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]">
              Launching Q1 2026
            </span>
          </div>

          <h2 className="font-poppins text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Simple, One-Time Pricing
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-3">
            Pay once per tax year. No subscriptions.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500 italic">
            TaxFormatter cleans and formats your data. Pair it with Koinly, TurboTax, or any tax software for cost basis calculations.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan, idx) => {
            const isPro = plan.popular;

            return (
              <div
                key={idx}
                className={`relative ${isPro ? 'md:-mt-4 md:mb-4 z-10' : ''}`}
              >
                {/* Glow effect for Pro */}
                {isPro && (
                  <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-accent-500)] opacity-100" />
                )}

                <div
                  className={`relative h-full rounded-2xl p-6 sm:p-8 flex flex-col ${
                    isPro
                      ? 'bg-slate-900 text-white'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {/* Popular badge */}
                  {isPro && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-4 py-1 bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-accent-500)] text-white text-xs font-bold rounded-full">
                        POPULAR
                      </span>
                    </div>
                  )}

                  {/* Plan header */}
                  <div className="mb-6">
                    <h3 className={`text-lg font-semibold mb-2 ${isPro ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className={`text-4xl font-bold ${isPro ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span className={`text-sm ${isPro ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>
                          {plan.period}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${isPro ? 'text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
                      {plan.description}
                    </p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8 flex-grow">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className={`w-5 h-5 flex-shrink-0 ${isPro ? 'text-[var(--color-accent-400)]' : 'text-[var(--color-accent-500)]'}`} />
                        <span className={`text-sm ${isPro ? 'text-slate-300' : 'text-slate-600 dark:text-slate-400'}`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button
                    variant={isPro ? 'primary' : 'secondary'}
                    className={`w-full ${isPro ? '' : ''}`}
                    disabled
                  >
                    {plan.cta}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
