'use client';

import React from 'react';
import { Container } from '../layout/Container';
import { ShieldCheck, Lock, Trash2, FileKey, ArrowRight, Cpu } from 'lucide-react';
import Link from 'next/link';

const features = [
  {
    icon: FileKey,
    title: 'No Private Keys',
    description: 'We never ask for wallet access, seed phrases, or API keys with withdrawal permissions. You simply upload a static CSV.',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
  },
  {
    icon: Trash2,
    title: '24-Hour Kill Switch',
    description: 'We don’t hoard data. Your files are processed and automatically permanently deleted from our servers after 24 hours.',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/20',
  },
  {
    icon: Cpu,
    title: 'RAM-Only Processing',
    description: 'Your data is isolated in volatile memory during formatting and encrypted at rest using AES-256 before deletion.',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
];

export function SecurityFeatures() {
  return (
    <section className="py-24 bg-slate-900 dark:bg-slate-950 relative overflow-hidden border-t border-slate-800">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-[var(--color-primary-500)] rounded-full opacity-5 blur-[120px] pointer-events-none" />

      <Container>
        <div className="relative z-10">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row gap-12 items-center mb-16">
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 mb-6">
                <ShieldCheck className="w-3 h-3 text-[var(--color-primary-400)]" />
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Zero-Retention Architecture
                </span>
              </div>
              <h2 className="font-poppins text-3xl sm:text-4xl font-bold text-white mb-6 leading-tight">
                We Don't Want Your <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary-400)] to-[var(--color-primary-200)]">
                  Private Keys.
                </span>
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed max-w-xl">
                Most tax tools track your portfolio forever. We are different. 
                We format your CSV, give you the file, and then 
                <span className="text-slate-200 font-medium"> delete everything.</span>
              </p>
            </div>

            {/* CTA Box (Right Side) */}
            <div className="flex-shrink-0 w-full md:w-auto">
               <Link 
                 href="/security"
                 className="group flex items-center justify-between gap-6 p-1 pr-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-full transition-all"
               >
                 <span className="pl-6 font-medium text-slate-300 group-hover:text-white">
                   Read our Security Policy
                 </span>
                 <div className="w-10 h-10 rounded-full bg-[var(--color-primary-500)] flex items-center justify-center text-white">
                   <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                 </div>
               </Link>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className={`group relative p-8 rounded-2xl border ${feature.borderColor} bg-slate-900/50 hover:bg-slate-800/50 transition-colors duration-300`}
                >
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-b from-white/5 to-transparent pointer-events-none rounded-2xl`} />
                  
                  <div className={`w-12 h-12 ${feature.bgColor} rounded-xl flex items-center justify-center mb-6 ring-1 ring-inset ${feature.borderColor}`}>
                    <Icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>

        </div>
      </Container>
    </section>
  );
}