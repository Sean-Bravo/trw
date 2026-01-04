'use client';

import React, { useState } from 'react';
import { Container } from '../layout/Container';
import { Upload, Sparkles, Download, Check, ArrowRight } from 'lucide-react';

const steps = [
  {
    id: 1,
    label: 'Upload',
    icon: Upload,
    title: 'Drop Your CSV',
    description: 'Upload your export from Coinbase, Binance, Kraken, or any of 12 supported exchanges.',
    demo: 'upload',
  },
  {
    id: 2,
    label: 'Process',
    icon: Sparkles,
    title: 'AI Fixes Issues',
    description: 'Our AI detects and repairs missing dates, duplicates, format errors, and inconsistent data.',
    demo: 'process',
  },
  {
    id: 3,
    label: 'Export',
    icon: Download,
    title: 'Download Ready File',
    description: 'Get your cleaned CSV formatted perfectly for Koinly, TurboTax, CoinLedger, or any tax platform.',
    demo: 'export',
  },
];

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="features" className="py-24 sm:py-32 bg-white dark:bg-slate-900 relative overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-900 dark:to-slate-900" />

      <Container>
        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="font-poppins text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-4">
              Three simple steps to tax-ready data
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500 max-w-2xl mx-auto">
              TaxFormatter is a formatting tool, not tax software. We fix broken CSVs so your tax platform can actually read them. Cost basis and gain/loss calculations happen in your tax software of choice.
            </p>
          </div>

          {/* Horizontal Stepper */}
          <div className="flex items-center justify-center mb-16">
            <div className="flex items-center gap-0">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isActive = activeStep === idx;
                const isCompleted = activeStep > idx;

                return (
                  <React.Fragment key={step.id}>
                    <button
                      onClick={() => setActiveStep(idx)}
                      className={`relative flex flex-col items-center gap-3 px-6 sm:px-10 py-4 rounded-xl transition-all duration-300 ${
                        isActive
                          ? 'bg-[var(--color-primary-500)]/10 dark:bg-[var(--color-primary-500)]/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                          isActive
                            ? 'bg-[var(--color-primary-500)] text-white shadow-lg shadow-[var(--color-primary-500)]/30'
                            : isCompleted
                            ? 'bg-[var(--color-accent-500)] text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </div>
                      <span
                        className={`text-sm font-semibold transition-colors ${
                          isActive
                            ? 'text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    </button>

                    {/* Connector line */}
                    {idx < steps.length - 1 && (
                      <div className="hidden sm:flex items-center">
                        <div
                          className={`w-12 lg:w-20 h-0.5 transition-colors duration-300 ${
                            activeStep > idx
                              ? 'bg-[var(--color-accent-500)]'
                              : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                        />
                        <ArrowRight
                          className={`w-4 h-4 -ml-1 transition-colors duration-300 ${
                            activeStep > idx
                              ? 'text-[var(--color-accent-500)]'
                              : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Content Area */}
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left: Description */}
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-primary-500)]/10 text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]">
                  <span className="font-bold">Step {activeStep + 1}</span>
                  <span className="text-slate-400 dark:text-slate-500">/</span>
                  <span className="text-slate-500 dark:text-slate-400">3</span>
                </div>

                <h3 className="font-poppins text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                  {steps[activeStep]?.title}
                </h3>

                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                  {steps[activeStep]?.description}
                </p>

                {/* Step-specific badges */}
                {activeStep === 0 && (
                  <div className="flex flex-wrap gap-2">
                    {['Coinbase', 'Binance', 'Kraken', 'KuCoin'].map((ex) => (
                      <span
                        key={ex}
                        className="px-3 py-1 text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full"
                      >
                        {ex}
                      </span>
                    ))}
                    <span className="px-3 py-1 text-sm font-medium bg-[var(--color-primary-500)]/10 text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)] rounded-full">
                      +12 more
                    </span>
                  </div>
                )}

                {activeStep === 1 && (
                  <div className="space-y-2">
                    {[
                      { label: 'Missing dates filled', color: 'text-[var(--color-accent-500)]' },
                      { label: 'Duplicates removed', color: 'text-[var(--color-accent-500)]' },
                      { label: 'Formats standardized', color: 'text-[var(--color-accent-500)]' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <Check className={`w-4 h-4 ${item.color}`} />
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {activeStep === 2 && (
                  <div className="flex flex-wrap gap-2">
                    {['Koinly', 'TurboTax', 'CoinLedger', 'ZenLedger'].map((pl) => (
                      <span
                        key={pl}
                        className="px-3 py-1 text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full"
                      >
                        {pl}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Demo Visual */}
              <div className="relative">
                {/* Glow behind card */}
                <div className="absolute -inset-4 bg-gradient-to-r from-[var(--color-primary-500)]/10 to-[var(--color-accent-500)]/10 rounded-3xl blur-2xl opacity-50" />

                <div className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
                  {/* Card Header */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                      <div className="w-3 h-3 rounded-full bg-green-400/80" />
                    </div>
                  </div>

                  {/* Demo Content */}
                  <div className="p-6">
                    {activeStep === 0 && <UploadDemo />}
                    {activeStep === 1 && <ProcessDemo />}
                    {activeStep === 2 && <ExportDemo />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function UploadDemo() {
  return (
    <div className="text-center space-y-4">
      <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 hover:border-[var(--color-primary-500)] hover:bg-[var(--color-primary-500)]/5 transition-all cursor-pointer">
        <div className="w-16 h-16 mx-auto bg-[var(--color-primary-500)]/10 rounded-xl flex items-center justify-center mb-4">
          <Upload className="w-8 h-8 text-[var(--color-primary-500)]" />
        </div>
        <p className="font-semibold text-slate-900 dark:text-white">Drop your CSV here</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">or click to browse</p>
      </div>
      <div className="text-xs text-slate-400 dark:text-slate-500">
        Supports CSV, XLS, XLSX up to 50MB
      </div>
    </div>
  );
}

function ProcessDemo() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Processing...</span>
        <span className="text-sm font-bold text-[var(--color-accent-500)]">4 issues fixed</span>
      </div>

      {/* Progress animation */}
      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full w-full bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-accent-500)] animate-pulse" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mt-6">
        <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <p className="text-2xl font-bold text-[var(--color-accent-500)]">4</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Fixed</p>
        </div>
        <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <p className="text-2xl font-bold text-[var(--color-primary-500)]">847</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Rows</p>
        </div>
        <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">0.8s</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Time</p>
        </div>
      </div>
    </div>
  );
}

function ExportDemo() {
  return (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 mx-auto bg-[var(--color-accent-500)]/10 rounded-xl flex items-center justify-center">
        <Download className="w-8 h-8 text-[var(--color-accent-500)]" />
      </div>
      <div>
        <p className="font-semibold text-slate-900 dark:text-white">taxformatter_export.csv</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">Ready for Koinly</p>
      </div>
      <button className="w-full bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-600)] text-white font-semibold py-3 rounded-lg transition-colors">
        Download CSV
      </button>
      <p className="text-xs text-slate-400 dark:text-slate-500">
        Encrypted • Auto-deleted in 24h
      </p>
    </div>
  );
}
