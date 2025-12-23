'use client';

import React, { useState } from 'react';
import { Container } from '../layout/Container';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Check } from 'lucide-react';

const pricingData = {
  monthly: [
    {
      name: 'Free',
      price: '$0',
      period: '/month',
      description: 'Perfect for trying out the tool',
      features: [
        '1 CSV file per month',
        'Basic repair features',
        'Export to 1 platform',
        'Community support',
      ],
      cta: 'Get Started Free',
      variant: 'secondary' as const,
      subtitle: 'No credit card required',
    },
    {
      name: 'Pro',
      price: '$9',
      period: '/month',
      description: 'For serious crypto traders',
      features: [
        'Unlimited CSV files',
        'Advanced repair features',
        'Export to all platforms',
        'Priority email support',
        'Batch processing',
        'API access',
      ],
      cta: 'Start 14-Day Free Trial',
      variant: 'primary' as const,
      popular: true,
      subtitle: 'Billed monthly',
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For teams and institutions',
      features: [
        'Everything in Pro',
        'Custom integrations',
        'Dedicated account manager',
        '99.9% SLA guarantee',
        'On-premise deployment option',
      ],
      cta: 'Contact Sales',
      variant: 'secondary' as const,
      subtitle: 'Volume discounts available',
    },
  ],
  annual: [
    {
      name: 'Free',
      price: '$0',
      period: '/month',
      description: 'Perfect for trying out the tool',
      features: [
        '1 CSV file per month',
        'Basic repair features',
        'Export to 1 platform',
        'Community support',
      ],
      cta: 'Get Started Free',
      variant: 'secondary' as const,
      subtitle: 'No credit card required',
    },
    {
      name: 'Pro',
      price: '$49',
      period: '/year',
      originalPrice: '$108',
      description: 'For serious crypto traders',
      features: [
        'Unlimited CSV files',
        'Advanced repair features',
        'Export to all platforms',
        'Priority email support',
        'Batch processing',
        'API access',
      ],
      cta: 'Start 14-Day Free Trial',
      variant: 'primary' as const,
      popular: true,
      subtitle: 'Only $4.08/month, billed annually',
      savings: 'Save $59/year',
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For teams and institutions',
      features: [
        'Everything in Pro',
        'Custom integrations',
        'Dedicated account manager',
        '99.9% SLA guarantee',
        'On-premise deployment option',
      ],
      cta: 'Contact Sales',
      variant: 'secondary' as const,
      subtitle: 'Volume discounts available',
    },
  ],
};

export function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const plans = pricingData[billingCycle];

  return (
    <section id="pricing" className="bg-slate-50 py-24 sm:py-32">
      <Container>
        <div className="text-center mb-16">
          <h2 className="font-poppins text-3xl sm:text-4xl font-bold text-[#1a365d] mb-4 leading-tight">
            Fair pricing, scalable power
          </h2>
          <p className="text-lg text-[#6b7280] mb-8">Choose the plan that fits your needs</p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 p-1.5 bg-[#f3f4f6] rounded-full">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                billingCycle === 'monthly'
                  ? 'bg-white text-[#1a365d] shadow-md'
                  : 'text-[#6b7280] hover:text-[#1a365d]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                billingCycle === 'annual'
                  ? 'bg-white text-[#1a365d] shadow-md'
                  : 'text-[#6b7280] hover:text-[#1a365d]'
              }`}
            >
              Annual
              <span className="inline-flex items-center px-2 py-0.5 bg-gradient-to-r from-[#059669] to-[#047857] text-white text-xs font-bold rounded-full">
                Save 54%
              </span>
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan, index) => {
            const isPro = plan.popular;
            return (
              <div
                key={`${billingCycle}-${index}`}
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
                      ? 'bg-gradient-to-br from-[#0c1929] via-[#1a365d] to-[#0c1929] text-white border-2 border-[#3b82f6] shadow-[0_20px_60px_rgba(59,130,246,0.3)] hover:shadow-[0_25px_70px_rgba(59,130,246,0.4)]'
                      : 'border border-[#e5e7eb] shadow-sm hover:shadow-xl hover:border-[#3b82f6]/30'
                  }`}
                >
                  <div className="mb-6">
                    <h3
                      className={`font-poppins text-lg font-semibold mb-2 ${
                        isPro ? 'text-white' : 'text-[#1a365d]'
                      }`}
                    >
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline mb-2">
                      {(plan as any).originalPrice && billingCycle === 'annual' && (
                        <span
                          className={`text-2xl font-semibold line-through mr-2 ${
                            isPro ? 'text-[#9ca3af]' : 'text-[#9ca3af]'
                          }`}
                        >
                          {(plan as any).originalPrice}
                        </span>
                      )}
                      <span
                        className={`text-4xl font-bold ${
                          isPro ? 'text-white' : 'text-[#1a365d]'
                        }`}
                      >
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span
                          className={`ml-2 text-sm ${
                            isPro ? 'text-[#d1d5db]' : 'text-[#4b5563]'
                          }`}
                        >
                          {plan.period}
                        </span>
                      )}
                    </div>
                    {(plan as any).savings && billingCycle === 'annual' && (
                      <div className="mb-2">
                        <span className="inline-flex items-center px-2 py-1 bg-[#059669]/20 text-[#059669] text-xs font-bold rounded-full">
                          {(plan as any).savings}
                        </span>
                      </div>
                    )}
                    <p
                      className={`text-sm ${
                        isPro ? 'text-[#d1d5db]' : 'text-[#4b5563]'
                      }`}
                    >
                      {plan.description}
                    </p>
                    {plan.subtitle && (
                      <p
                        className={`text-xs mt-2 ${
                          isPro ? 'text-[#9ca3af]' : 'text-[#6b7280]'
                        }`}
                      >
                        {plan.subtitle}
                      </p>
                    )}
                  </div>

                  <ul className="space-y-4 mb-8 flex-grow">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                          isPro ? 'bg-[#059669]/20' : 'bg-[#059669]/10'
                        }`}>
                          <Check
                            className="h-4 w-4 text-[#059669] font-bold"
                            strokeWidth={3}
                          />
                        </div>
                        <span
                          className={`text-sm leading-relaxed ${
                            isPro ? 'text-[#e5e7eb]' : 'text-[#4b5563]'
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

