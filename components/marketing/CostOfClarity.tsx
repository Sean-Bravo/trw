import React from 'react';
import { Container } from '../layout/Container';
import { Card } from '../ui/Card';
import { DollarSign, Zap, Shield, Lock } from 'lucide-react';

const features = [
  {
    icon: DollarSign,
    title: 'Fair Pricing',
    description: 'Pay only for what you use. No hidden fees, no annual commitments. Start free, upgrade when you need more power.',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Repair files in seconds, not hours. Our optimized engine processes thousands of transactions instantly.',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your data never leaves your browser. All processing happens client-side with military-grade encryption.',
  },
  {
    icon: Lock,
    title: 'No Vendor Lock-in',
    description: 'Export to any tax platform. Switch between Koinly, TurboTax, or others anytime without losing your data.',
  },
];

export function CostOfClarity() {
  return (
    <section className="bg-[#f9fafb] py-24 sm:py-32">
      <Container>
        <div className="text-center mb-16">
          <h2 className="font-poppins text-3xl sm:text-4xl font-bold text-[#1a365d] mb-4 leading-tight">
            Cost of Clarity
          </h2>
          <p className="text-lg text-[#4b5563] max-w-2xl mx-auto">
            Why pay a premium for complexity you don't use?
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index}>
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="p-3 bg-[#f3f4f6] rounded-lg">
                      <Icon className="h-6 w-6 text-[#1a365d]" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-poppins text-xl font-semibold text-[#1a365d] mb-2 leading-snug">
                      {feature.title}
                    </h3>
                    <p className="text-[#4b5563] leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

