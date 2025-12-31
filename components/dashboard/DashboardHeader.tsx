'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { User } from 'next-auth';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

interface DashboardHeaderProps {
  user: User;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Logo className="h-8 w-auto" />
            <span className="ml-2 text-xl font-bold text-slate-900">
              TaxFormatter
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/dashboard"
              className="text-slate-700 hover:text-slate-900 font-medium transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/docs"
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              Docs
            </Link>
            <Link
              href="/pricing"
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              Pricing
            </Link>
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* User Info */}
            <div className="hidden sm:flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">
                  {user.name || user.email}
                </p>
                <p className="text-xs text-slate-500">
                  {user.subscriptionTier || 'Free'} Plan
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                {((user.name || user.email || 'U')[0] || 'U').toUpperCase()}
              </div>
            </div>

            {/* Upgrade Button (if free tier) */}
            {(!user.subscriptionTier || user.subscriptionTier === 'free') && (
              <Link href="/pricing">
                <Button variant="primary">
                  Upgrade
                </Button>
              </Link>
            )}

            {/* Sign Out */}
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
