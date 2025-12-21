import React from 'react';
import { Container } from '../layout/Container';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/year',
    description: 'Perfect for trying out the tool',
    features: [
      '1 CSV file per month',
      'Basic repair features',
      'Export to 1 platform',
      'Community support',
    ],
    cta: 'Get Started',
    variant: 'secondary' as const,
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/year',
    description: 'For serious crypto traders',
    features: [
      'Unlimited CSV files',
      'Advanced repair features',
      'Export to all platforms',
      'Priority support',
      'Batch processing',
      'API access',
    ],
    cta: 'Start Free Trial',
    variant: 'primary' as const,
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For teams and institutions',
    features: [
      'Everything in Pro',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee',
      'On-premise deployment',
    ],
    cta: 'Contact Sales',
    variant: 'secondary' as const,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="bg-white py-24 sm:py-32">
      <Container>
        <div className="text-center mb-16">
          <h2 className="font-poppins text-3xl sm:text-4xl font-bold text-[#1a365d] mb-4 leading-tight">
            Fair pricing, scalable power
          </h2>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan, index) => {
            const isPro = plan.popular;
            return (
              <div
                key={index}
                className={`relative ${isPro ? 'md:scale-105 z-10' : ''}`}
              >
                {isPro && (
                  <div className="absolute -top-4 right-4 z-20">
                    <Badge variant="tag">POPULAR</Badge>
                  </div>
                )}
                <Card
                  className={`h-full flex flex-col ${
                    isPro
                      ? 'bg-[#0c1929] text-white border-[#0c1929] shadow-[0_12px_32px_rgba(0,0,0,0.3)]'
                      : ''
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
                    <p
                      className={`text-sm ${
                        isPro ? 'text-[#d1d5db]' : 'text-[#4b5563]'
                      }`}
                    >
                      {plan.description}
                    </p>
                  </div>

                  <ul className="space-y-3 mb-8 flex-grow">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check
                          className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                            isPro ? 'text-[#059669]' : 'text-[#059669]'
                          }`}
                        />
                        <span
                          className={`text-sm ${
                            isPro ? 'text-[#d1d5db]' : 'text-[#4b5563]'
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
                        ? 'bg-[#059669] hover:bg-[#047857] text-white border-none'
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

