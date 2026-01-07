'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { Shield, Key, Loader2 } from 'lucide-react';

function TwoFactorForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    // Read credentials from sessionStorage (not URL)
    const pending = sessionStorage.getItem('2fa_pending');
    if (!pending) {
      router.push('/login');
      return;
    }
    try {
      const parsed = JSON.parse(pending);
      if (!parsed.email || !parsed.password) {
        router.push('/login');
        return;
      }
      setCredentials(parsed);
    } catch {
      router.push('/login');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!credentials) {
      router.push('/login');
      return;
    }

    setIsLoading(true);

    try {
      // Verify 2FA code
      const verifyRes = await fetch('/api/auth/2fa/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          code: code.replace(/\s/g, ''),
          isBackupCode: useBackupCode,
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        setError(verifyData.error || 'Invalid verification code');
        setIsLoading(false);
        return;
      }

      // Complete sign in with NextAuth
      const result = await signIn('credentials', {
        redirect: false,
        email: credentials.email,
        password: credentials.password,
        skip2FA: 'true', // Signal to skip 2FA check since we verified it
      });

      if (result?.error) {
        setError('Sign in failed. Please try again.');
      } else {
        // Clear credentials from sessionStorage on successful login
        sessionStorage.removeItem('2fa_pending');
        router.push('/dashboard');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Logo className="h-12 w-auto" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
          Two-Factor Authentication
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-400">
          Enter the 6-digit code from your authenticator app
        </p>
      </div>

      <div className="relative mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-zinc-900/50 border border-zinc-800 py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              {useBackupCode ? (
                <Key className="h-8 w-8 text-emerald-400" />
              ) : (
                <Shield className="h-8 w-8 text-emerald-400" />
              )}
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-zinc-300">
                {useBackupCode ? 'Backup Code' : 'Verification Code'}
              </label>
              <input
                id="code"
                name="code"
                type="text"
                inputMode={useBackupCode ? 'text' : 'numeric'}
                autoComplete="one-time-code"
                required
                maxLength={useBackupCode ? 9 : 6}
                value={code}
                onChange={(e) => setCode(useBackupCode ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, ''))}
                placeholder={useBackupCode ? 'XXXX-XXXX' : '000000'}
                className="mt-2 block w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white text-center text-2xl font-mono tracking-[0.3em] placeholder-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || (!useBackupCode && code.length !== 6)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setUseBackupCode(!useBackupCode);
                setCode('');
                setError('');
              }}
              className="text-sm text-zinc-500 hover:text-emerald-400 transition-colors"
            >
              {useBackupCode ? 'Use authenticator code instead' : 'Use a backup code'}
            </button>
          </div>

          <div className="mt-4 text-center">
            <Link href="/login" className="text-sm text-zinc-500 hover:text-white transition-colors">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TwoFactorVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
      </div>
    }>
      <TwoFactorForm />
    </Suspense>
  );
}
