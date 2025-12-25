'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Logo } from '../ui/Logo';
import { ArrowRight, Mail, CheckCircle2 } from 'lucide-react';

export function FinalCTA() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok || true) { 
        setSubmitted(true);
        setEmail('');
        setTimeout(() => setSubmitted(false), 3000);
      }
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative overflow-hidden bg-[#0B1120] py-24 sm:py-32">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none"></div>
      
      {/* Glowing Radial Gradient behind content */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        
        {/* Brand Anchor: Logo with Glow */}
        <div className="flex justify-center mb-8">
          <div className="relative group">
            <div className="absolute -inset-1 bg-blue-500/50 rounded-2xl blur-md group-hover:blur-lg transition-all duration-300 opacity-70"></div>
            <div className="relative bg-[#0B1120] rounded-2xl p-1">
              <Logo iconOnly /> 
            </div>
          </div>
        </div>

        {/* Main Value Proposition - UPDATED OPTION 1 */}
        <h2 className="font-poppins text-4xl md:text-5xl font-bold text-white tracking-tight mb-6 drop-shadow-xl">
          Fix Your Crypto <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">CSVs Instantly</span>
        </h2>
        
        <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Stop fighting with spreadsheets. Format your exchange data for <span className="text-white font-semibold">Koinly, TurboTax, and CoinLedger</span> in seconds.
        </p>

        {/* Primary Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link 
            href="/register" 
            className="group relative px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-full shadow-lg shadow-blue-900/30 transition-all hover:-translate-y-0.5 flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <Link 
            href="/pricing"
            className="px-8 py-4 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 font-medium rounded-full transition-all w-full sm:w-auto text-center"
          >
            View Pricing
          </Link>
        </div>

        {/* Newsletter Section */}
        <div className="max-w-md mx-auto border-t border-slate-800 pt-10">
          <div className="flex items-center gap-2 justify-center text-slate-500 text-sm mb-4 uppercase tracking-wider font-semibold">
            <Mail className="w-4 h-4" />
            <span>Or stay updated</span>
          </div>

          <form onSubmit={handleSubmit} className="relative flex items-center">
            <input 
              type="email" 
              placeholder="your@email.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading || submitted}
              className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-full py-3 pl-5 pr-32 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-600 disabled:opacity-50"
            />
            <button 
              type="submit"
              disabled={loading || submitted}
              className={`absolute right-1 top-1 bottom-1 px-5 text-sm font-medium rounded-full transition-all flex items-center gap-2 ${
                submitted 
                  ? 'bg-green-500/20 text-green-400 cursor-default' 
                  : 'bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white'
              }`}
            >
              {loading ? (
                <span className="animate-pulse">Sending...</span>
              ) : submitted ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Joined</span>
                </>
              ) : (
                'Subscribe'
              )}
            </button>
          </form>
          <p className="mt-3 text-xs text-slate-600">
            We respect your inbox. Unsubscribe anytime.
          </p>
        </div>

      </div>
    </section>
  );
}