'use client';

import React from 'react';
import { Container } from '../layout/Container';
import { ShieldCheck, Lock, EyeOff, FileKey } from 'lucide-react';
import Link from 'next/link';

const features = [
  {
    icon: Lock,
    title: 'End-to-End Encrypted',
    description: 'All traffic secured via TLS 1.3. Data encrypted in transit and isolated in volatile memory during processing.',
    color: 'text-[var(--color-primary-400)]',
    bgColor: 'bg-[var(--color-primary-500)]/20',
  },
  {
    icon: EyeOff,
    title: 'Privacy First',
    description: 'We never sell data. Only anonymous file structures retained for AI training. Transaction details wiped instantly.',
    color: 'text-[var(--color-accent-400)]',
    bgColor: 'bg-[var(--color-accent-500)]/20',
  },
  {
    icon: ShieldCheck,
    title: 'Audit-Ready',
    description: '24/7 monitoring with enterprise DDoS protection. We log system access, never user financial data.',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
  },
];

export function SecurityFeatures() {
  return (
    <section className="py-20 sm:py-24 bg-slate-900 dark:bg-slate-950 relative overflow-hidden">
      {/* Subtle dot pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full">
          <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="currentColor" className="text-slate-400" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      {/* Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-48 bg-[var(--color-primary-500)] rounded-full opacity-10 blur-[100px]" />

      <Container>
        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <h2 className="font-poppins text-2xl sm:text-3xl font-bold text-white mb-4">
              Bank-Grade Security
            </h2>
            <p className="text-slate-400 leading-relaxed">
              Your data is processed in-memory and discarded immediately. We only retain anonymous structures to improve our AI.
            </p>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="group p-6 rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm hover:border-[var(--color-primary-500)]/50 hover:bg-slate-800/50 transition-all duration-300"
                >
                  <div className={`w-10 h-10 ${feature.bgColor} rounded-lg flex items-center justify-center mb-4`}>
                    <Icon className={`w-5 h-5 ${feature.color}`} />
                  </div>
                  <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Privacy Link */}
          <div className="flex justify-center pt-6 border-t border-slate-700/50">
            <Link
              href="/privacy-policy"
              className="group flex items-center gap-2 text-sm text-slate-400 hover:text-[var(--color-primary-400)] transition-colors font-medium"
            >
              <FileKey className="w-4 h-4" />
              <span>Read our Privacy Policy</span>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
