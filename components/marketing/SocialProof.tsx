'use client';

import React from 'react';
import { Container } from '../layout/Container';
import { Star } from 'lucide-react';

const stats = [
  { value: '10K+', label: 'Files Processed' },
  { value: '99.9%', label: 'Accuracy Rate' },
  { value: '<30s', label: 'Average Time' },
];

const testimonials = [
  {
    quote: "Saved me hours of manual work. My Coinbase export had 200+ errors and TaxFormatter fixed them all instantly.",
    name: "Alex Chen",
    role: "Crypto Trader",
    initials: "AC",
  },
  {
    quote: "Finally, a tool that actually works. No more fighting with spreadsheets before tax season.",
    name: "Sarah Kim",
    role: "DeFi Investor",
    initials: "SK",
  },
  {
    quote: "The AI categorization is incredible. It correctly identified staking rewards, airdrops, and wash sales.",
    name: "Marcus Johnson",
    role: "Portfolio Manager",
    initials: "MJ",
  },
];

export function SocialProof() {
  return (
    <section className="py-24 sm:py-32 bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
        backgroundSize: '32px 32px',
      }} />

      <Container>
        <div className="relative z-10">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto mb-20">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-accent-500)] bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* Testimonials */}
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, idx) => (
              <div
                key={idx}
                className="group bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-lg hover:border-[var(--color-primary-500)]/30 transition-all duration-300"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-accent-500)] flex items-center justify-center text-white font-bold text-sm">
                    {testimonial.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
