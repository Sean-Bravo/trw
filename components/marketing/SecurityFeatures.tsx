'use client';

import React from 'react';
import { Container } from '../layout/Container';
import { ShieldCheck, Lock, EyeOff, FileKey } from 'lucide-react';
import Link from 'next/link';

export function SecurityFeatures() {
  return (
    <section className="bg-[#0c1929] py-16 sm:py-20 relative overflow-hidden border-t border-white/5">
      
      {/* Subtle background glow - Reduced intensity */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-[#3b82f6] rounded-full opacity-5 blur-[100px] pointer-events-none"></div>

      <Container>
        {/* Compact Header */}
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <h2 className="font-poppins text-2xl sm:text-3xl font-bold text-white mb-3">
            Bank-Grade Security. Zero Retention.
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            We process your files in-memory and discard them immediately. 
            <br className="hidden sm:block" />
            Your financial data never touches a hard drive.
          </p>
        </div>

        {/* 3-Column Grid (Replaces the 4-grid + Big Card) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 relative z-10">
          
          {/* Card 1: Encryption */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4 text-blue-400">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-white font-semibold mb-2">End-to-End Encrypted</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              All traffic is secured via TLS 1.3. Your data is encrypted in transit and isolated during processing.
            </p>
          </div>

          {/* Card 2: Privacy (The "Zero" selling point) */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4 text-emerald-400">
              <EyeOff className="w-5 h-5" />
            </div>
            <h3 className="text-white font-semibold mb-2">Zero Data Retention</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              We don't sell data. We don't store files. Once your export is complete, your data is wiped instantly.
            </p>
          </div>

          {/* Card 3: Compliance */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4 text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-white font-semibold mb-2">Audit-Ready</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Our infrastructure is monitored 24/7 with enterprise-grade DDoS protection and automated audit logging.
            </p>
          </div>
        </div>

        {/* Slim Stats Bar + Link */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 border-t border-white/10 pt-8">
            <div className="flex gap-8 text-center">
                <div>
                    <div className="text-xl font-bold text-white">0</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Breaches</div>
                </div>
                <div>
                    <div className="text-xl font-bold text-white">100%</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Encrypted</div>
                </div>
            </div>
            
            <div className="hidden md:block w-px h-8 bg-white/10"></div>
            
            <Link 
              href="/privacy-policy" 
              className="group flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              <FileKey className="w-4 h-4" />
              <span>Read our Privacy Policy</span>
            </Link>
        </div>

      </Container>
    </section>
  );
}