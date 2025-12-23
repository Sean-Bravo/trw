'use client';

import React from 'react';
import { Container } from '../layout/Container';
import { Upload, FileCheck, Download } from 'lucide-react';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';

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

        {/* Zig-Zag Layout with Connection Lines */}
        <div className="max-w-6xl mx-auto space-y-24 relative">
          {/* Vertical connection line - hidden on mobile */}
          <div className="hidden lg:block absolute left-1/2 top-24 bottom-24 w-0.5 bg-gradient-to-b from-[#3b82f6]/20 via-[#3b82f6]/40 to-[#3b82f6]/20 -translate-x-1/2 z-0"></div>

          {steps.map((step, index) => {
            const Icon = step.icon;
            const isEven = index % 2 === 0;
            const isLast = index === steps.length - 1;

            return (
              <StepCard
                key={index}
                step={step}
                index={index}
                Icon={Icon}
                isEven={isEven}
                isLast={isLast}
              />
            );
          })}
        </div>
      </Container>
    </section>
  );
}

function StepCard({ step, index, Icon, isEven, isLast }: any) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  return (
    <div
      ref={ref}
      className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10 transition-all duration-700 ${
        isEven ? '' : 'lg:flex-row-reverse'
      } ${
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-12'
      }`}
      style={{ transitionDelay: '150ms' }}
    >
      {/* Text Content */}
      <div className={`${isEven ? 'lg:order-1' : 'lg:order-2'} space-y-6`}>
        <div className="inline-flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center shadow-lg">
            <span className="font-poppins text-xl font-bold text-white">
              {index + 1}
            </span>
          </div>
          {!isLast && (
            <div className="hidden lg:block h-0.5 w-8 bg-gradient-to-r from-[#3b82f6] to-transparent"></div>
          )}
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
        <div className="relative group">
          <div className="aspect-square bg-gradient-to-br from-[#3b82f6]/10 to-[#2563eb]/5 rounded-2xl flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-all duration-500 group-hover:shadow-2xl">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:32px_32px]"></div>

            {/* Icon */}
            <div className="relative z-10 w-32 h-32 bg-gradient-to-br from-[#3b82f6] to-[#2563eb] rounded-2xl flex items-center justify-center shadow-2xl group-hover:rotate-6 transition-transform duration-500">
              <Icon className="h-16 w-16 text-white" strokeWidth={1.5} />
            </div>

            {/* Floating number badge */}
            <div className="absolute top-6 right-6 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-[#3b82f6]/20 group-hover:scale-110 transition-transform duration-300">
              <span className="font-poppins text-2xl font-bold text-[#3b82f6]">
                {step.number}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

