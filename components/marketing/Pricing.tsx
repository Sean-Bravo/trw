'use client';

import React from 'react';
import { Container } from '../layout/Container';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Check } from 'lucide-react';

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  variant: 'primary' | 'secondary';
  subtitle: string;
  popular?: boolean;
}

const pricingData: PricingPlan[] = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    description: "Understand what's broken before you fix it.",
    features: [
      'Upload and analyze CSV files',
      'AI insight panels explaining all issues',
      'Wash sale, duplicate, and data integrity detection',
      'No export',
    ],
    cta: 'Analyze My CSV',
    variant: 'secondary',
    subtitle: 'No credit card required',
  },
  {
    name: 'Pro',
    price: '$89',
    period: '/tax year',
    description: 'Get a corrected CSV you can upload directly to tax software.',
    features: [
      'Tax-compliant corrected CSV',
      'Cost basis adjustments applied',
      'Wash sale handling reflected in output',
      'Timestamp and currency normalization',
      'Upload to TurboTax, Koinly, CoinLedger, ZenLedger',
      'Unlimited re-runs for the same tax year',
      'Email support',
    ],
    cta: 'Download Fixed CSV',
    variant: 'primary',
    popular: true,
    subtitle: 'One-time purchase per tax year',
  },
  {
    name: 'Premium',
    price: '$189',
    period: '/tax year',
    description: 'Audit-ready documentation and full AI explanations.',
    features: [
      'Everything in Pro',
      'AI-generated PDF tax report',
      'Line-by-line explanations for accountants',
      'Audit-ready notes and transaction lineage',
      'Priority support',
    ],
    cta: 'Get Audit-Ready Output',
    variant: 'secondary',
    subtitle: 'Best for complex or high-volume traders',
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="bg-slate-50 dark:bg-slate-900 py-24 sm:py-32">
      <Container>
        <div className="text-center mb-16">
          <h2 className="font-poppins text-3xl sm:text-4xl font-bold text-[#1a365d] dark:text-slate-100 mb-4 leading-tight">
            Simple pricing, powerful results
          </h2>
          <p className="text-lg text-[#6b7280] dark:text-slate-300 mb-2">
            One-time purchase per tax year. No subscriptions.
          </p>
          <p className="text-sm text-[#9ca3af] dark:text-slate-400">
            Fix your crypto CSV files and ensure tax compliance
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {pricingData.map((plan, index) => {
            const isPro = plan.popular;
            return (
              <div
                key={index}
                className={`relative ${isPro ? 'md:scale-105 z-20' : 'z-10'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {isPro && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-30">
                    <div className="rounded-full bg-gradient-to-r from-[#3b82f6] to-[#2563eb] px-5 py-2 text-sm font-bold text-white shadow-lg border-2 border-white">
                      Most Popular
                    </div>
                  </div>
                )}
                <Card
                  className={`h-full flex flex-col transition-all duration-300 ${
                    isPro
                      ? 'bg-gradient-to-br from-[#0c1929] via-[#1a365d] to-[#0c1929] dark:from-[#1a365d] dark:via-[#2d5a8f] dark:to-[#1a365d] text-white border-2 border-[#3b82f6] shadow-[0_20px_60px_rgba(59,130,246,0.3)] hover:shadow-[0_25px_70px_rgba(59,130,246,0.4)]'
                      : 'border border-[#e5e7eb] dark:border-slate-600 dark:bg-slate-800 shadow-sm hover:shadow-xl hover:border-[#3b82f6]/30 dark:hover:border-blue-400/30'
                  }`}
                >
                  <div className="mb-6">
                    <h3
                      className={`font-poppins text-lg font-semibold mb-2 ${
                        isPro ? 'text-white' : 'text-[#1a365d] dark:text-slate-100'
                      }`}
                    >
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline mb-2">
                      <span
                        className={`text-4xl font-bold ${
                          isPro ? 'text-white' : 'text-[#1a365d] dark:text-slate-100'
                        }`}
                      >
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span
                          className={`ml-2 text-sm ${
                            isPro ? 'text-[#d1d5db]' : 'text-[#4b5563] dark:text-slate-400'
                          }`}
                        >
                          {plan.period}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-sm ${
                        isPro ? 'text-[#d1d5db]' : 'text-[#4b5563] dark:text-slate-300'
                      }`}
                    >
                      {plan.description}
                    </p>
                    {plan.subtitle && (
                      <p
                        className={`text-xs mt-2 ${
                          isPro ? 'text-[#9ca3af]' : 'text-[#6b7280] dark:text-slate-400'
                        }`}
                      >
                        {plan.subtitle}
                      </p>
                    )}
                  </div>

                  <ul className="space-y-4 mb-8 flex-grow">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div
                          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                            isPro ? 'bg-[#059669]/20' : 'bg-[#059669]/10 dark:bg-[#059669]/20'
                          }`}
                        >
                          <Check
                            className="h-4 w-4 text-[#059669] dark:text-green-400 font-bold"
                            strokeWidth={3}
                          />
                        </div>
                        <span
                          className={`text-sm leading-relaxed ${
                            isPro ? 'text-[#e5e7eb]' : 'text-[#4b5563] dark:text-slate-300'
                          }`}
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={plan.variant}
                    href="#start"
                    className={`w-full ${
                      isPro
                        ? 'bg-[#3b82f6] hover:bg-[#2563eb] text-white border-none'
                        : ''
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </Card>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
