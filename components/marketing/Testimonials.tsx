import React from 'react';
import { Container } from '../layout/Container';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

const testimonials = [
  {
    stars: '⭐⭐⭐⭐⭐',
    quote: 'Finally, a tool that actually works. Fixed my Coinbase CSV in seconds and exported directly to Koinly. Worth every penny.',
    author: 'Alex Chen',
    role: 'Crypto Trader',
    verified: true,
  },
  {
    stars: '⭐⭐⭐⭐⭐',
    quote: 'I was stuck with broken CSV files from multiple exchanges. TaxReadyWallet saved me hours of manual work. Highly recommend!',
    author: 'Sarah Martinez',
    role: 'Day Trader',
    verified: true,
  },
  {
    stars: '⭐⭐⭐⭐⭐',
    quote: 'Simple, fast, and reliable. No more fighting with tax software formats. This is exactly what the crypto community needed.',
    author: 'Michael Park',
    role: 'DeFi Investor',
    verified: true,
  },
];

export function Testimonials() {
  return (
    <section className="bg-white py-24 sm:py-32">
      <Container>
        <div className="text-center mb-16">
          <h2 className="font-poppins text-3xl sm:text-4xl font-bold text-[#1a365d] mb-4 leading-tight">
            Trusted by Crypto Traders
          </h2>
          <p className="text-lg text-[#4b5563] max-w-2xl mx-auto">
            Real feedback from the community
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {testimonials.map((testimonial, index) => (
            <Card key={index}>
              <div className="mb-6 text-base">{testimonial.stars}</div>
              <p className="font-sohne text-base text-[#1a365d] italic mb-6 leading-relaxed">
                "{testimonial.quote}"
              </p>
              <div className="border-t border-[#e5e7eb] pt-4 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-sm text-[#1a365d] mb-1">
                    {testimonial.author}
                  </p>
                  <p className="text-xs text-[#6b7280]">
                    {testimonial.role}
                  </p>
                </div>
                {testimonial.verified && (
                  <Badge variant="success" showIcon>
                    Verified
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-2xl p-12">
            <div className="grid grid-cols-2 divide-x divide-[#e5e7eb]">
              <div className="text-center pr-6">
                <div className="font-poppins text-4xl font-bold text-[#1a365d] mb-2">
                  10K+
                </div>
                <div className="text-sm text-[#4b5563]">
                  Files Repaired
                </div>
              </div>
              <div className="text-center pl-6">
                <div className="font-poppins text-4xl font-bold text-[#1a365d] mb-2">
                  99.9%
                </div>
                <div className="text-sm text-[#4b5563]">
                  Success Rate
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

