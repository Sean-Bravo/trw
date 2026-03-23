'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { User } from 'next-auth';
import { Logo } from '@/components/ui/Logo';
import { Menu, X } from 'lucide-react';

interface DashboardHeaderProps {
  user: User;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const initial = ((user.name || user.email || 'U')[0] || 'U').toUpperCase();
  const rawTier = user.subscriptionTier || 'free';
  const tierLabel = rawTier === 'free' ? 'Starter' : rawTier;

  return (
    <header className="sticky top-0 z-50 bg-[#030712]/80 backdrop-blur-xl border-b border-zinc-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Logo className="h-8 w-auto" />

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink href="/dashboard" active>Dashboard</NavLink>
            <NavLink href="/dashboard/developer">Developer</NavLink>
            <NavLink href="/dashboard/settings">Settings</NavLink>
            <NavLink href="/docs">Docs</NavLink>
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {/* User Info - Desktop */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-white">
                  {user.email}
                </p>
                <p className="text-xs text-zinc-500 capitalize">
                  {tierLabel} Plan
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

            {/* Sign Out - Desktop */}
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="hidden md:block text-sm text-zinc-500 hover:text-white transition-colors"
            >
              Sign Out
            </button>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-800/50 bg-[#030712]/95 backdrop-blur-xl">
          <nav className="flex flex-col px-4 py-4 space-y-1">
            <MobileNavLink href="/dashboard" onClick={() => setMobileMenuOpen(false)}>Dashboard</MobileNavLink>
            <MobileNavLink href="/dashboard/developer" onClick={() => setMobileMenuOpen(false)}>Developer</MobileNavLink>
            <MobileNavLink href="/dashboard/settings" onClick={() => setMobileMenuOpen(false)}>Settings</MobileNavLink>
            <MobileNavLink href="/docs" onClick={() => setMobileMenuOpen(false)}>Docs</MobileNavLink>
            <div className="pt-4 border-t border-zinc-800 mt-2">
              <div className="flex items-center gap-3 px-3 py-2 mb-3">
                <div className="relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full opacity-50 blur-sm" />
                  <div className="relative h-8 w-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-emerald-400 font-semibold text-sm">
                    {initial}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-white truncate max-w-[180px]">
                    {user.email}
                  </p>
                  <p className="text-xs text-zinc-500 capitalize">
                    {tierLabel} Plan
                  </p>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="w-full text-left px-3 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors text-base font-medium rounded-lg"
              >
                Sign Out
              </button>
            </div>
          </nav>
        </div>
      )}
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

function MobileNavLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="text-zinc-200 hover:text-emerald-400 hover:bg-zinc-800/50 transition-colors text-base font-medium py-3 px-3 rounded-lg"
    >
      {children}
    </Link>
  );
}
