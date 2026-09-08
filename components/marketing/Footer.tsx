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
        setMessage("Thanks! You're subscribed.");
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
    <footer className="bg-surface-alt text-white">
      {/* CTA Section */}
      <div className="py-20 border-b border-slate-800">
        <Container>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-poppins text-3xl sm:text-4xl font-bold mb-4">
              Start parsing in minutes.
            </h2>
            <p className="text-lg text-slate-400 mb-8">
              Get your API key and start parsing files in minutes. Plans start at $29/mo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="primary" href="/signup" className="!bg-emerald-500 hover:!bg-emerald-400 !border-emerald-500">
                Get API Key
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Link
                href="/docs"
                className="inline-flex items-center justify-center h-10 px-6 rounded-full text-sm font-semibold text-white border-2 border-slate-600 bg-slate-800 hover:bg-slate-700 hover:-translate-y-0.5 transition-all duration-300"
              >
                Read API Docs
              </Link>
            </div>
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
                AI-Powered software with API and MCP server that validates, cleans, and formats crypto transaction CSVs and bank statement PDFs for compatibility with tax and accounting software.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-sm mb-4 text-slate-300">Product</h4>
              <ul className="space-y-2">
                {[
                  { label: 'Features', href: '/#features' },
                  { label: 'Blog', href: '/blog' },
                  { label: 'Docs', href: '/docs' },
                  { label: 'About', href: '/about' },
                ].map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">
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
                  <Link href="/contact" className="text-sm text-slate-400 hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <a href="https://twitter.com/taxformatter" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-white transition-colors">
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
                  <Link href="/privacy-policy" className="text-sm text-slate-400 hover:text-white transition-colors">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-sm text-slate-400 hover:text-white transition-colors">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* What We Are / Aren't */}
          <div className="pt-8 border-t border-slate-800 mb-8">
            <div className="max-w-2xl mx-auto text-center">
              <p className="text-xs text-slate-400 mb-2">
                <span className="font-semibold text-slate-300">What TaxFormatter Is:</span> A CSV repair and formatting tool that makes exchange exports compatible with tax software.
              </p>
              <p className="text-xs text-slate-400">
                <span className="font-semibold text-slate-300">What TaxFormatter Isn't:</span> Tax advice, cost basis calculations, or a replacement for actual tax software.
              </p>
            </div>
          </div>

          {/* Bottom */}
          <div className="pt-6 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} TaxFormatter. All rights reserved. 🇺🇸
            </p>
            <p className="text-xs text-slate-400 mt-2">
              The universal translation engine for crypto data.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Made in NYC
            </p>
          </div>
        </Container>
      </div>
    </footer>
  );
}

