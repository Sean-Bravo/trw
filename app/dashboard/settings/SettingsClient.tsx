'use client';

import { useState, useEffect } from 'react';
import { User } from 'next-auth';
import Link from 'next/link';
import { Shield, ShieldCheck, Smartphone, Key, Copy, Check, Loader2, X, AlertTriangle } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import type { UserTier } from '@/lib/auth-db';
import { tierName } from '@/lib/tier-registry';

interface SettingsClientProps {
  user: User;
  tier: UserTier;
  hasPassword: boolean;
}

interface ReauthModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  confirmVariant?: 'danger' | 'warning';
  hasPassword: boolean;
  loading: boolean;
  error: string;
  onConfirm: (password: string, code: string) => void;
  onCancel: () => void;
}

// F1: disabling 2FA or regenerating backup codes needs fresh proof, so the
// server can refuse a hijacked session that has neither.
function ReauthModal({ isOpen, title, message, confirmText, confirmVariant = 'danger', hasPassword, loading, error, onConfirm, onCancel }: ReauthModalProps) {
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setCode('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const canSubmit = !loading && code.trim().length > 0 && (!hasPassword || password.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 " onClick={onCancel} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) onConfirm(password, code.trim());
        }}
        className="relative bg-app-raised border border-app-border rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 text-app-subtle hover:text-app-text transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4 mb-6">
          <div className={`p-3 rounded-xl ${confirmVariant === 'danger' ? 'bg-app-error-bg' : 'bg-app-warn-bg'}`}>
            <AlertTriangle className={`w-6 h-6 ${confirmVariant === 'danger' ? 'text-app-error' : 'text-app-warn'}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-app-text">{title}</h3>
            <p className="text-app-muted mt-1">{message}</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {hasPassword && (
            <div>
              <label htmlFor="reauth-password" className="block text-app-muted text-sm mb-1">Current password</label>
              <input
                id="reauth-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-app-raised border border-app-border rounded-lg text-app-text focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
              />
            </div>
          )}
          <div>
            <label htmlFor="reauth-code" className="block text-app-muted text-sm mb-1">Authenticator code or backup code</label>
            <input
              id="reauth-code"
              type="text"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              className="w-full px-4 py-2 bg-app-raised border border-app-border rounded-lg text-app-text font-mono focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
            />
          </div>
          {error && <p className="text-app-error text-sm">{error}</p>}
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-app-muted hover:text-app-text transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
              confirmVariant === 'danger'
                ? 'bg-app-error-bg text-app-error border border-app-error/30 hover:bg-red-100'
                : 'bg-app-warn-bg text-app-warn border border-app-warn/30 hover:bg-amber-100'
            }`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </form>
    </div>
  );
}

export function SettingsClient({ user, tier, hasPassword }: SettingsClientProps) {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showRegenerateCodes, setShowRegenerateCodes] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [reauthError, setReauthError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup');

  useEffect(() => {
    // Check if 2FA is enabled
    fetch('/api/auth/2fa/status')
      .then(res => res.json())
      .then(data => setTwoFactorEnabled(data.enabled))
      .catch(() => {});
  }, []);

  const startSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setQrCode(data.qrCode);
      setSecret(data.secret);
      setShowSetup(true);
      setStep('setup');
    } catch (err: any) {
      setError(err.message || 'Failed to start setup');
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnable = async () => {
    if (verificationCode.length !== 6) {
      setError('Enter the 6-digit code from your authenticator');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setBackupCodes(data.backupCodes);
      setStep('backup');
    } catch (err: any) {
      setError(err.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const finishSetup = () => {
    setTwoFactorEnabled(true);
    setShowSetup(false);
    setSuccess('Two-factor authentication enabled successfully');
    setTimeout(() => setSuccess(''), 5000);
  };

  const disable2FA = async (password: string, code: string) => {
    setLoading(true);
    setReauthError('');
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to disable');

      setShowDisableConfirm(false);
      setTwoFactorEnabled(false);
      setSuccess('Two-factor authentication disabled');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setReauthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerateBackupCodes = async (password: string, code: string) => {
    setLoading(true);
    setReauthError('');
    try {
      const res = await fetch('/api/auth/2fa/regenerate-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);

      setShowRegenerateConfirm(false);
      setBackupCodes(data.backupCodes);
      setShowRegenerateCodes(true);
    } catch (err: any) {
      setReauthError(err.message || 'Failed to regenerate codes');
    } finally {
      setLoading(false);
    }
  };

  const closeRegenerateCodes = () => {
    setShowRegenerateCodes(false);
    setBackupCodes([]);
    setSuccess('Backup codes regenerated successfully');
    setTimeout(() => setSuccess(''), 5000);
  };

  return (
    <div className="min-h-screen bg-app-bg">
      <DashboardHeader user={user} tier={tier} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-app-text mb-2">Settings</h1>
        <p className="text-app-subtle mb-10">Manage your account security</p>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-app-success-bg border border-app-success/30 rounded-xl flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-app-success" />
            <p className="text-app-success">{success}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-app-error-bg border border-app-error/30 rounded-xl">
            <p className="text-app-error">{error}</p>
          </div>
        )}

        {/* 2FA Section */}
        <div className="bg-app-raised border border-app-border rounded-2xl p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${twoFactorEnabled ? 'bg-app-success-bg' : 'bg-app-raised'}`}>
                {twoFactorEnabled ? (
                  <ShieldCheck className="w-6 h-6 text-app-success" />
                ) : (
                  <Shield className="w-6 h-6 text-app-subtle" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-app-text">Two-Factor Authentication</h2>
                <p className="text-app-subtle mt-1">
                  Add an extra layer of security to your account using an authenticator app
                </p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              twoFactorEnabled
                ? 'bg-app-success-bg text-app-success border border-app-success/30'
                : 'bg-app-raised text-app-muted'
            }`}>
              {twoFactorEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>

          {!showSetup && !showRegenerateCodes ? (
            <div className="flex flex-wrap gap-3">
              {twoFactorEnabled ? (
                <>
                  <button
                    onClick={() => { setReauthError(''); setShowRegenerateConfirm(true); }}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-app-raised text-app-text border border-app-border rounded-lg hover:bg-app-border transition-colors disabled:opacity-50"
                  >
                    <Key className="w-4 h-4" />
                    {loading ? 'Generating...' : 'Regenerate Backup Codes'}
                  </button>
                  <button
                    onClick={() => { setReauthError(''); setShowDisableConfirm(true); }}
                    disabled={loading}
                    className="px-4 py-2 bg-app-error-bg text-app-error border border-app-error/30 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Disabling...' : 'Disable 2FA'}
                  </button>
                </>
              ) : (
                <button
                  onClick={startSetup}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Smartphone className="w-4 h-4" />
                  )}
                  Set Up 2FA
                </button>
              )}
            </div>
          ) : showSetup ? (
            <div className="mt-6 pt-6 border-t border-app-border">
              {step === 'setup' && (
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <h3 className="font-medium text-app-text mb-2">Scan QR Code</h3>
                      <p className="text-app-subtle text-sm mb-4">
                        Open your authenticator app (Google Authenticator, Authy, 1Password) and scan this QR code
                      </p>
                      {qrCode && (
                        <div className="inline-block p-4 bg-white rounded-xl">
                          <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-app-raised text-app-text flex items-center justify-center text-sm font-bold">2</div>
                    <div className="flex-1">
                      <h3 className="font-medium text-app-text mb-2">Or Enter Code Manually</h3>
                      <p className="text-app-subtle text-sm mb-3">
                        If you can't scan the QR code, enter this secret key manually
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-4 py-3 bg-app-raised border border-app-border rounded-lg text-app-success font-mono text-sm break-all">
                          {secret}
                        </code>
                        <button
                          onClick={copySecret}
                          className="p-3 bg-app-raised border border-app-border rounded-lg hover:bg-app-border transition-colors"
                        >
                          {copied ? <Check className="w-4 h-4 text-app-success" /> : <Copy className="w-4 h-4 text-app-muted" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setStep('verify')}
                      className="px-5 py-2.5 bg-app-card border border-app-border-strong text-app-text font-medium rounded-lg hover:bg-app-raised transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {step === 'verify' && (
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold">3</div>
                    <div className="flex-1">
                      <h3 className="font-medium text-app-text mb-2">Enter Verification Code</h3>
                      <p className="text-app-subtle text-sm mb-4">
                        Enter the 6-digit code from your authenticator app to verify setup
                      </p>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="w-full max-w-xs px-4 py-3 bg-app-raised border border-app-border rounded-lg text-app-text text-center text-2xl font-mono tracking-[0.5em] focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button
                      onClick={() => setStep('setup')}
                      className="px-4 py-2 text-app-muted hover:text-app-text transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={verifyAndEnable}
                      disabled={loading || verificationCode.length !== 6}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-all disabled:opacity-50"
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Verify & Enable
                    </button>
                  </div>
                </div>
              )}

              {step === 'backup' && (
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center">
                      <Key className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-app-text mb-2">Save Your Backup Codes</h3>
                      <p className="text-app-subtle text-sm mb-4">
                        Store these codes somewhere safe. You can use each code once if you lose access to your authenticator.
                      </p>
                      <div className="bg-app-raised border border-app-border rounded-xl p-4">
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {backupCodes.map((code, i) => (
                            <code key={i} className="px-3 py-2 bg-app-raised rounded-lg text-app-success font-mono text-sm text-center">
                              {code}
                            </code>
                          ))}
                        </div>
                        <button
                          onClick={copyBackupCodes}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-app-raised rounded-lg hover:bg-app-border transition-colors text-sm"
                        >
                          {copied ? <Check className="w-4 h-4 text-app-success" /> : <Copy className="w-4 h-4" />}
                          {copied ? 'Copied!' : 'Copy All Codes'}
                        </button>
                      </div>
                      <p className="text-app-warn text-sm mt-4 flex items-start gap-2">
                        <span className="text-lg">&#x26a0;&#xfe0f;</span>
                        These codes will only be shown once. Save them now!
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={finishSetup}
                      className="px-5 py-2.5 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-all"
                    >
                      I've Saved My Codes
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : showRegenerateCodes ? (
            <div className="mt-6 pt-6 border-t border-app-border">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-app-text mb-2">Your New Backup Codes</h3>
                    <p className="text-app-subtle text-sm mb-4">
                      Your old codes have been invalidated. Save these new codes somewhere safe.
                    </p>
                    <div className="bg-app-raised border border-app-border rounded-xl p-4">
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {backupCodes.map((code, i) => (
                          <code key={i} className="px-3 py-2 bg-app-raised rounded-lg text-app-success font-mono text-sm text-center">
                            {code}
                          </code>
                        ))}
                      </div>
                      <button
                        onClick={copyBackupCodes}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-app-raised rounded-lg hover:bg-app-border transition-colors text-sm"
                      >
                        {copied ? <Check className="w-4 h-4 text-app-success" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied!' : 'Copy All Codes'}
                      </button>
                    </div>
                    <p className="text-app-warn text-sm mt-4 flex items-start gap-2">
                      <span className="text-lg">&#x26a0;&#xfe0f;</span>
                      These codes will only be shown once. Save them now!
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={closeRegenerateCodes}
                    className="px-5 py-2.5 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-all"
                  >
                    I've Saved My Codes
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Account Info */}
        <div className="mt-6 bg-app-raised border border-app-border rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-app-text mb-4">Account</h2>
          <div className="space-y-4">
            <div>
              <label className="text-app-subtle text-sm">Email</label>
              <p className="text-app-text">{user.email}</p>
            </div>
            <div>
              <label className="text-app-subtle text-sm">Plan</label>
              <p className="text-app-text">{tierName(tier)}</p>
            </div>
          </div>
        </div>
      </main>

      {/* Confirmation Modals */}
      <ReauthModal
        isOpen={showDisableConfirm}
        title="Disable Two-Factor Authentication"
        message="Are you sure you want to disable two-factor authentication? This will make your account less secure."
        confirmText="Disable 2FA"
        confirmVariant="danger"
        hasPassword={hasPassword}
        loading={loading}
        error={reauthError}
        onConfirm={disable2FA}
        onCancel={() => setShowDisableConfirm(false)}
      />

      <ReauthModal
        isOpen={showRegenerateConfirm}
        title="Regenerate Backup Codes"
        message="This will invalidate all your existing backup codes. Make sure you save the new codes after regenerating."
        confirmText="Regenerate Codes"
        confirmVariant="warning"
        hasPassword={hasPassword}
        loading={loading}
        error={reauthError}
        onConfirm={regenerateBackupCodes}
        onCancel={() => setShowRegenerateConfirm(false)}
      />
    </div>
  );
}
