'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '../docs/ThemeToggle';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/#features', label: 'Features' },
    { href: '/#pricing', label: 'Pricing' },
    { href: '/docs', label: 'Docs' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-white to-blue-50/30 dark:from-gray-950 dark:to-gray-900/30 backdrop-blur-md border-b border-[#e5e7eb] dark:border-gray-800 shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <Logo />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[#1a365d] dark:text-gray-200 hover:text-[#3b82f6] dark:hover:text-blue-400 transition-colors text-sm font-semibold relative group"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#3b82f6] dark:bg-blue-400 group-hover:w-full transition-all duration-300"></span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/#signin" className="hidden md:block text-[#1a365d] dark:text-gray-200 hover:text-[#3b82f6] dark:hover:text-blue-400 transition-colors text-sm font-semibold">
            Sign In
          </Link>
          <ThemeToggle />
          <Button variant="primary" href="/#start" className="hidden sm:inline-flex shadow-lg shadow-[#3b82f6]/20">
            Start Free
          </Button>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#1a365d] dark:text-gray-200 hover:text-[#3b82f6] dark:hover:text-blue-400 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#e5e7eb] dark:border-gray-800 bg-white dark:bg-gray-950">
          <nav className="flex flex-col px-4 py-4 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#1a365d] dark:text-gray-200 hover:text-[#3b82f6] dark:hover:text-blue-400 transition-colors text-base font-medium py-2"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/#signin"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#1a365d] dark:text-gray-200 hover:text-[#3b82f6] dark:hover:text-blue-400 transition-colors text-base font-medium py-2"
            >
              Sign In
            </Link>
            <Button variant="primary" href="/#start" className="w-full justify-center" onClick={() => setMobileMenuOpen(false)}>
              Start Free
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
