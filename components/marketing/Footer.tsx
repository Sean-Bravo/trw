'use client';

import React, { useState } from 'react';
import { Container } from '../layout/Container';
import { Logo } from '../ui/Logo';
import Link from 'next/link';
import { Mail, CheckCircle2 } from 'lucide-react';

export function Footer() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setStatus('success');
        setMessage('Thanks! We\'ll notify you when we launch.');
        setEmail('');
      } else {
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }

    setTimeout(() => {
      setStatus('idle');
      setMessage('');
    }, 5000);
  };

  return (
    <footer className="bg-[#0c1929] text-white py-16 border-t border-[#1f2937]">
      <Container>
        {/* Waitlist Section */}
        <div className="mb-12 p-8 bg-gradient-to-r from-blue-900/30 to-indigo-900/30 rounded-2xl border border-blue-800/50">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="font-poppins text-2xl font-bold mb-2">Join the Waitlist</h3>
            <p className="text-[#d1d5db] mb-6">
              Be the first to know when we launch in Q1 2026. Get early access and exclusive launch pricing.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9ca3af]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={status === 'loading' || status === 'success'}
                  className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-full text-white placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <button
                type="submit"
                disabled={status === 'loading' || status === 'success'}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-full transition-colors duration-200 whitespace-nowrap"
              >
                {status === 'loading' ? 'Joining...' : status === 'success' ? 'Joined!' : 'Notify Me'}
              </button>
            </form>

            {message && (
              <div className={`mt-4 flex items-center justify-center gap-2 text-sm ${
                status === 'success' ? 'text-green-400' : 'text-red-400'
              }`}>
                {status === 'success' && <CheckCircle2 className="w-4 h-4" />}
                {message}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Branding */}
          <div>
            <Logo variant="light" className="mb-4" />
            <p className="text-sm text-[#d1d5db] leading-relaxed">
              Cloud-based software that validates, cleans, and formats cryptocurrency transaction CSV files for compatibility with tax and accounting software.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-poppins text-base font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/#features" className="text-sm text-[#9ca3af] hover:text-[#e5e7eb] transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="text-sm text-[#9ca3af] hover:text-[#e5e7eb] transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-sm text-[#9ca3af] hover:text-[#e5e7eb] transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/docs" className="text-sm text-[#9ca3af] hover:text-[#e5e7eb] transition-colors">
                  Documentation
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-poppins text-base font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <a href="mailto:support@taxformatter.com" className="text-sm text-[#9ca3af] hover:text-[#e5e7eb] transition-colors">
                  Contact Support
                </a>
              </li>
              <li>
                <a href="https://twitter.com/taxformatter" target="_blank" rel="noopener noreferrer" className="text-sm text-[#9ca3af] hover:text-[#e5e7eb] transition-colors">
                  Twitter
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-poppins text-base font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <span className="text-sm text-[#6b7280]">Privacy Policy - Coming Soon</span>
              </li>
              <li>
                <span className="text-sm text-[#6b7280]">Terms of Service - Coming Soon</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#1f2937] pt-8 text-center">
          <p className="text-xs text-[#6b7280]">
            © 2025 TaxFormatter. All rights reserved. 🇺🇸
          </p>
          <p className="text-xs text-[#6b7280]">
             The universal translation engine for crypto data
          </p>
          <p className="text-xs text-[#6b7280] mt-2">
            Made in NYC 
          </p>
        </div>
      </Container>
    </footer>
  );
}
