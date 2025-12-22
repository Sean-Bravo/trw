import React from 'react';
import { Container } from '../layout/Container';
import { Upload, FileCheck, Download } from 'lucide-react';

const steps = [
  {
    icon: Upload,
    number: '01',
    title: 'Upload Your CSV',
    description: 'Drag and drop your broken CSV file from any exchange. We support Coinbase, Binance, Kraken, and 15+ more.',
  },
  {
    icon: FileCheck,
    number: '02',
    title: 'Intelligent Parsing',
    description: 'Our AI-powered engine detects and repairs missing dates, incorrect formats, and duplicate transactions automatically.',
  },
  {
    icon: Download,
    number: '03',
    title: 'Export to Any Platform',
    description: 'Download your repaired CSV in the exact format your tax software needs. Works with Koinly, TurboTax, CoinLedger, ZenLedger, and more.',
  },
];

export function HowItWorks() {
  return (
    <section id="features" className="bg-white py-24 sm:py-32">
      <Container>
        <div className="text-center mb-20">
          <h2 className="font-poppins text-3xl sm:text-4xl font-bold text-[#1a365d] mb-4 leading-tight">
            How It Works
          </h2>
          <p className="text-lg text-[#4b5563] max-w-2xl mx-auto">
            Three simple steps to tax-ready crypto data
          </p>
        </div>

        {/* Zig-Zag Layout */}
        <div className="max-w-6xl mx-auto space-y-24">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isEven = index % 2 === 0;

            return (
              <div
                key={index}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${
                  isEven ? '' : 'lg:flex-row-reverse'
                }`}
              >
                {/* Text Content */}
                <div className={`${isEven ? 'lg:order-1' : 'lg:order-2'} space-y-6`}>
                  <div className="inline-flex items-center gap-3 mb-2">
                    <span className="font-poppins text-5xl font-bold text-[#3b82f6]/20">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="font-poppins text-3xl font-bold text-[#1a365d] leading-tight">
                    {step.title}
                  </h3>
                  <p className="text-lg text-[#4b5563] leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Visual/Icon */}
                <div className={`${isEven ? 'lg:order-2' : 'lg:order-1'}`}>
                  <div className="relative">
                    <div className="aspect-square bg-gradient-to-br from-[#3b82f6]/10 to-[#2563eb]/5 rounded-2xl flex items-center justify-center relative overflow-hidden group hover:scale-105 transition-transform duration-500">
                      {/* Background decoration */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:32px_32px]"></div>

                      {/* Icon */}
                      <div className="relative z-10 w-32 h-32 bg-gradient-to-br from-[#3b82f6] to-[#2563eb] rounded-2xl flex items-center justify-center shadow-2xl group-hover:rotate-3 transition-transform duration-500">
                        <Icon className="h-16 w-16 text-white" strokeWidth={1.5} />
                      </div>

                      {/* Floating number */}
                      <div className="absolute top-6 right-6 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <span className="font-poppins text-2xl font-bold text-[#3b82f6]">
                          {step.number}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

