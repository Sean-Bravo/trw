'use client';

import React, { useState } from 'react';
import { Container } from '../layout/Container';
import { Button } from '../ui/Button';
import { ArrowRight, Mail } from 'lucide-react';

export function FinalCTA() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Replace with your actual email service endpoint
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
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
    <section className="bg-gradient-to-br from-[#0c1929] via-[#1a365d] to-[#0c1929] py-24 sm:py-32 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:48px_48px]"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#3b82f6] rounded-full opacity-10 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#2563eb] rounded-full opacity-10 blur-3xl"></div>

      <Container>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          {/* Logo Icon */}
          <div className="inline-flex items-center justify-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-[#3b82f6] to-[#2563eb] rounded-2xl flex items-center justify-center shadow-2xl border-4 border-white/10">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                <path d="M14 7l5 5-5 5M9 7l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <h2 className="font-poppins text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
            Start Your Free Tax Report Today
          </h2>
          <p className="text-xl text-[#e5e7eb] max-w-2xl mx-auto mb-12 leading-relaxed">
            Join 10,000+ crypto traders who trust TaxReadyWallet. No credit card required.
          </p>

          {/* Main CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-10">
            <Button variant="primary" href="#start" showArrow>
              Get Started Free
            </Button>
            <button
              className="h-12 px-8 rounded-full text-white border-2 border-white/30 bg-transparent hover:bg-white/10 active:bg-white/20 transition-all duration-300 ease-out focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 inline-flex items-center justify-center font-semibold text-base"
            >
              View Pricing
              <ArrowRight className="ml-2 h-4 w-4 flex-shrink-0" />
            </button>
          </div>

          {/* Email Capture Form */}
          <div className="max-w-md mx-auto">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6b7280] pointer-events-none" />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-12 pl-12 pr-4 rounded-full bg-white/10 border border-white/20 text-white placeholder-[#9ca3af] focus:outline-none focus:border-[#3b82f6] focus:bg-white/20 transition-all duration-300"
                />
              </div>
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="h-12 px-8 rounded-full bg-[#3b82f6] text-white font-semibold hover:bg-[#2563eb] active:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center whitespace-nowrap"
                >
                  {loading ? 'Subscribing...' : submitted ? '✓ Subscribed' : 'Subscribe'}
                </button>
              </div>
            </form>
            <p className="text-xs text-[#6b7280] mt-3">
              We respect your inbox. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}