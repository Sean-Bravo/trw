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
    <header className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-white/20 dark:border-slate-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <Logo className="h-8 w-auto" />
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/dashboard"
              className="text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)] font-medium transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/docs"
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Docs
            </Link>
            <Link
              href="/#pricing"
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Pricing
            </Link>
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* User Info */}
            <div className="hidden sm:flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {user.name || user.email}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {user.subscriptionTier || 'Free'} Plan
                </p>
              </div>
              {/* Avatar with gradient ring */}
              <div className="relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-accent-500)] rounded-full opacity-75" />
                <div className="relative h-10 w-10 rounded-full bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-accent-500)] flex items-center justify-center text-white font-semibold">
                  {((user.name || user.email || 'U')[0] || 'U').toUpperCase()}
                </div>
              </div>
            </div>

            {/* Upgrade Button (if free tier) */}
            {(!user.subscriptionTier || user.subscriptionTier === 'free') && (
              <Link href="/#pricing">
                <Button variant="primary">
                  Upgrade
                </Button>
              </Link>
            )}

            {/* Sign Out */}
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
