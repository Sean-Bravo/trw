'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Container } from '../layout/Container';
import { Logo } from '../ui/Logo';
import { Button } from '../ui/Button';
import Link from 'next/link';
import { Mail, CheckCircle2, ArrowRight } from 'lucide-react';

export function Footer() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

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
        setMessage("Thanks! We'll notify you when we launch.");
        setEmail('');
      } else {
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setStatus('idle');
      setMessage('');
    }, 5000);
  };

  return (
    <footer className="bg-slate-900 dark:bg-slate-950 text-white">
      {/* CTA Section */}
      <div className="py-20 border-b border-slate-800">
        <Container>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-poppins text-3xl sm:text-4xl font-bold mb-4">
              Ready to Fix Your CSVs?
            </h2>
            <p className="text-lg text-slate-400 mb-8">
              Join thousands of crypto traders who've simplified their tax filing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="primary" href="/signup">
                Get Started Free
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button variant="secondary" href="#pricing" className="border-slate-700 text-white hover:bg-slate-800">
                View Pricing
              </Button>
            </div>
          </div>
        </Container>
      </div>

      {/* Newsletter Section */}
      <div className="py-12 border-b border-slate-800">
        <Container>
          <div className="max-w-md mx-auto text-center">
            <h3 className="font-semibold text-lg mb-2">Join the Waitlist</h3>
            <p className="text-sm text-slate-400 mb-4">
              Get notified when we launch in Q1 2026.
            </p>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={status === 'loading' || status === 'success'}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-full text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-transparent disabled:opacity-50"
                />
              </div>
              <button
                type="submit"
                disabled={status === 'loading' || status === 'success'}
                className="px-5 py-2.5 bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-600)] disabled:bg-[var(--color-primary-700)] text-white text-sm font-semibold rounded-full transition-colors"
              >
                {status === 'loading' ? '...' : status === 'success' ? 'Done!' : 'Notify Me'}
              </button>
            </form>
            {message && (
              <div className={`mt-3 flex items-center justify-center gap-2 text-sm ${
                status === 'success' ? 'text-[var(--color-accent-400)]' : 'text-red-400'
              }`}>
                {status === 'success' && <CheckCircle2 className="w-4 h-4" />}
                {message}
              </div>
            )}
          </div>
        </Container>
      </div>

      {/* Links Section */}
      <div className="py-12">
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Logo variant="light" className="mb-4" />
              <p className="text-sm text-slate-400 leading-relaxed">
                Cloud-based software that validates, cleans, and formats cryptocurrency transaction CSV files for compatibility with tax and accounting software.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-sm mb-4 text-slate-300">Product</h4>
              <ul className="space-y-2">
                {[
                  { label: 'Features', href: '/#features' },
                  { label: 'Pricing', href: '/#pricing' },
                  { label: 'Blog', href: '/blog' },
                  { label: 'Docs', href: '/docs' },
                ].map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-slate-500 hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold text-sm mb-4 text-slate-300">Support</h4>
              <ul className="space-y-2">
                <li>
                  <a href="mailto:support@taxformatter.com" className="text-sm text-slate-500 hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="https://twitter.com/taxformatter" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:text-white transition-colors">
                    Twitter
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-sm mb-4 text-slate-300">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/privacy-policy" className="text-sm text-slate-500 hover:text-white transition-colors">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-sm text-slate-500 hover:text-white transition-colors">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="pt-8 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} TaxFormatter. All rights reserved. 🇺🇸
            </p>
            <p className="text-xs text-slate-400 mt-2">
              The universal translation engine for crypto data.
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Made in NYC
            </p>
          </div>
        </Container>
      </div>
    </footer>
  );
}
