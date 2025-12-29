'use client';

import React from 'react';
import { Container } from '../layout/Container';
import { ShieldCheck, Lock, EyeOff, FileKey } from 'lucide-react';
import Link from 'next/link';

export function SecurityFeatures() {
  return (
    <section className="bg-[#0c1929] py-16 sm:py-20 relative overflow-hidden border-t border-white/5">
      
      {/* Subtle background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-[#3b82f6] rounded-full opacity-5 blur-[100px] pointer-events-none"></div>

      <Container>
        {/* Header - Updated for Truth in Advertising */}
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <h2 className="font-poppins text-2xl sm:text-3xl font-bold text-white mb-4">
            Bank-Grade Security. Intelligent Privacy.
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            We process your financial values in-memory and discard them immediately. 
            We only retain anonymous file structures to train our format detection AI.
          </p>
        </div>

        {/* 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 relative z-10">
          
          {/* Card 1: Encryption */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4 text-blue-400">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-white font-semibold mb-2">End-to-End Encrypted</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              All traffic is secured via TLS 1.3. Your data is encrypted in transit and isolated in volatile memory during processing.
            </p>
          </div>

          {/* Card 2: Privacy (Updated Copy) */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4 text-emerald-400">
              <EyeOff className="w-5 h-5" />
            </div>
            <h3 className="text-white font-semibold mb-2">Data Footprint</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              We never sell data. We retain only anonymous file headers and structural metadata to improve our recognition engine. Your transaction details are wiped instantly.
            </p>
          </div>

          {/* Card 3: Compliance */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4 text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-white font-semibold mb-2">Audit-Ready Logs</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Our infrastructure is monitored 24/7 with enterprise-grade DDoS protection. We log system access, not user financial data.
            </p>
          </div>
        </div>

        {/* Footer - Stats Removed, Link Only */}
        <div className="flex justify-center border-t border-white/10 pt-8">
            <Link 
              href="/privacy-policy" 
              className="group flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 transition-colors font-medium"
            >
              <FileKey className="w-4 h-4 group-hover:text-blue-400 transition-colors" />
              <span>Read our Privacy Policy</span>
            </Link>
        </div>

      </Container>
    </section>
  );
}