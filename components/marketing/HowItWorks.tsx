import React from 'react';
import { Container } from '../layout/Container';
import { Card } from '../ui/Card';
import { Upload, FileCheck, Download } from 'lucide-react';

const steps = [
  {
    icon: Upload,
    title: 'Upload Your CSV',
    description: 'Drag and drop your broken CSV file from any exchange. We support Coinbase, Binance, Kraken, and 15+ more.',
  },
  {
    icon: FileCheck,
    title: 'Intelligent Parsing',
    description: 'Our AI-powered engine detects and repairs missing dates, incorrect formats, and duplicate transactions automatically.',
  },
  {
    icon: Download,
    title: 'Export to Any Platform',
    description: 'Download your repaired CSV in the exact format your tax software needs. Works with Koinly, TurboTax, CoinLedger, ZenLedger, and more.',
  },
];

export function HowItWorks() {
  return (
    <section id="features" className="bg-white py-24 sm:py-32">
      <Container>
        <div className="text-center mb-16">
          <h2 className="font-poppins text-3xl sm:text-4xl font-bold text-[#1a365d] mb-4 leading-tight">
            How It Works
          </h2>
          <p className="text-lg text-[#4b5563] max-w-2xl mx-auto">
            Three simple steps to tax-ready crypto data
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card key={index}>
                <div className="flex flex-col items-start">
                  <div className="mb-4 p-3 bg-[#f3f4f6] rounded-lg">
                    <Icon className="h-6 w-6 text-[#1a365d]" />
                  </div>
                  <h3 className="font-poppins text-xl font-semibold text-[#1a365d] mb-3 leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-[#4b5563] leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

