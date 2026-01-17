'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '../docs/ThemeToggle';
import { trackSignUp } from '@/lib/analytics';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '/#features', label: 'Features' },
    { href: '/security', label: 'Security' },
    { href: '/blog', label: 'Blog' },
    { href: '/docs', label: 'Docs' },
  ];

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm'
        : 'bg-transparent border-b border-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <Logo />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-sm font-medium transition-colors after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-[var(--color-primary-500)] hover:after:w-full after:transition-all after:duration-300"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden md:block text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors text-sm font-medium"
          >
            Sign In
          </Link>
          <span className="hidden md:block"><ThemeToggle /></span>
          <Button
            variant="primary"
            href="/signup"
            onClick={() => trackSignUp()}
            className="hidden md:inline-flex"
          >
            Get Started
          </Button>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          className="md:hidden border-t border-slate-200/50 dark:border-slate-800/50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl"
        >
          <nav className="flex flex-col px-4 py-4 space-y-1" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-700 dark:text-slate-200 hover:text-[var(--color-primary-500)] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-base font-medium py-3 px-3 rounded-lg"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-2">
              <Button
                variant="primary"
                href="/signup"
                className="w-full justify-center"
                onClick={() => {
                  trackSignUp()
                  setMobileMenuOpen(false)
                }}
              >
                Get Started
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

