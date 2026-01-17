'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { User } from 'next-auth';
import { Logo } from '@/components/ui/Logo';

interface DashboardHeaderProps {
  user: User;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const initial = ((user.name || user.email || 'U')[0] || 'U').toUpperCase();
  const tier = user.subscriptionTier || 'free';

  return (
    <header className="sticky top-0 z-50 bg-[#030712]/80 backdrop-blur-xl border-b border-zinc-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Logo className="h-8 w-auto" />

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink href="/dashboard" active>Dashboard</NavLink>
            <NavLink href="/dashboard/settings">Settings</NavLink>
            <NavLink href="/docs">Docs</NavLink>
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {/* User Info */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-white">
                  {user.email}
                </p>
                <p className="text-xs text-zinc-500 capitalize">
                  {tier} Plan
                </p>
              </div>
              {/* Avatar */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full opacity-50 group-hover:opacity-100 transition-opacity blur-sm" />
                <div className="relative h-9 w-9 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-emerald-400 font-semibold text-sm">
                  {initial}
                </div>
              </div>
            </div>


            {/* Sign Out */}
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-sm text-zinc-500 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'text-emerald-400 bg-emerald-500/10'
          : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
      }`}
    >
      {children}
    </Link>
  );
}
