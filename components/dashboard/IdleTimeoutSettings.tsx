'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Clock, AlertTriangle, Loader2 } from 'lucide-react';
import {
  IDLE_TIMEOUT_OPTIONS,
  idleTimeoutLabel,
  type IdleTimeoutMinutes,
} from '@/lib/idle-timeout';

const REAUTH_URL = '/login?next=%2Fdashboard%2Fsettings&reason=reauth';

/**
 * Settings → Automatic sign-out (docs/AUTO_LOGOUT_PLAN.md). Choosing Never
 * goes through a warning, and the server also requires a recent sign-in.
 */
export function IdleTimeoutSettings({ initialMinutes }: { initialMinutes: IdleTimeoutMinutes }) {
  const { update } = useSession();
  const [saved, setSaved] = useState<IdleTimeoutMinutes>(initialMinutes);
  const [choice, setChoice] = useState<IdleTimeoutMinutes>(initialMinutes);
  const [confirmNever, setConfirmNever] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const save = async (minutes: IdleTimeoutMinutes) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/user/idle-timeout', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 403 && data.code === 'reauth_required') {
        setNeedsReauth(true);
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Could not save this setting');
      await update({ idleTimeoutChanged: true });
      setSaved(minutes);
      setConfirmNever(false);
      setSuccess(
        minutes === 0
          ? 'Automatic sign-out is off. You’ll still be signed out after 7 days.'
          : `You’ll be signed out after ${idleTimeoutLabel(minutes)} of inactivity.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this setting');
    } finally {
      setSaving(false);
    }
  };

  const onSave = () => {
    if (choice === 0) {
      setConfirmNever(true);
      return;
    }
    void save(choice);
  };

  return (
    <section aria-labelledby="idle-settings-title" className="mt-6 bg-app-card border border-app-border rounded-2xl p-6">
      <div className="flex items-start gap-3">
        <Clock className="w-5 h-5 text-app-muted mt-1 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <h2 id="idle-settings-title" className="text-xl font-semibold text-app-text">Automatic sign-out</h2>
          <p className="text-app-muted mt-1">
            Sign out after a period of inactivity, so nobody else can open your tax files on a device you left signed in.
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="idle-timeout" className="text-sm font-medium text-app-text">Sign me out after</label>
              <select
                id="idle-timeout"
                value={choice}
                disabled={saving}
                onChange={(e) => {
                  setChoice(Number(e.target.value) as IdleTimeoutMinutes);
                  setSuccess('');
                  setError('');
                  setNeedsReauth(false);
                }}
                className="min-h-11 min-w-48 rounded-lg border border-app-border-strong bg-app-card px-3 text-app-text focus:outline-none focus:ring-2 focus:ring-primary-400"
              >
                {IDLE_TIMEOUT_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m === 0 ? 'Never (not recommended)' : `${idleTimeoutLabel(m)}${m === 30 ? ' (default)' : ''}`}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || choice === saved}
              className="inline-flex items-center gap-2 min-h-11 px-5 rounded-lg bg-primary-500 text-white font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              Save
            </button>
          </div>

          {saved === 0 && (
            <p className="mt-3 flex items-center gap-2 text-sm text-app-warn">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              Automatic sign-out is off. Sessions still end after 7 days.
            </p>
          )}
          {success && <p role="status" className="mt-3 text-sm text-app-success">{success}</p>}
          {error && <p role="alert" className="mt-3 text-sm text-app-error">{error}</p>}
          {needsReauth && (
            <div role="alert" className="mt-3 rounded-lg border border-app-warn/30 bg-app-warn-bg p-3 text-sm text-app-text">
              For your security, turning this off needs a sign-in from the last few minutes.{' '}
              <a href={REAUTH_URL} className="font-semibold text-app-link hover:underline">Sign in again</a>, then choose Never once more.
            </div>
          )}
        </div>
      </div>

      {confirmNever && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => !saving && setConfirmNever(false)} />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="never-title"
            aria-describedby="never-desc"
            className="relative w-full max-w-md rounded-2xl border border-app-border bg-app-card p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-app-warn-bg flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-app-warn" aria-hidden="true" />
              </span>
              <h3 id="never-title" className="text-lg font-semibold text-app-text">Turn off automatic sign-out?</h3>
            </div>
            <div id="never-desc" className="mt-3 space-y-2 text-app-muted">
              <p>Anyone with access to this device can open your uploads and download your tax files.</p>
              <p>Only do this on a private device you trust. You&apos;ll still be signed out after 7 days, and we&apos;ll email you about this change.</p>
            </div>
            {needsReauth && (
              <p role="alert" className="mt-3 text-sm text-app-text">
                You need to <a href={REAUTH_URL} className="font-semibold text-app-link hover:underline">sign in again</a> first.
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmNever(false)}
                disabled={saving}
                className="min-h-11 px-4 rounded-lg text-sm font-medium text-app-muted hover:text-app-text hover:bg-app-raised"
              >
                Keep it on
              </button>
              <button
                type="button"
                onClick={() => void save(0)}
                disabled={saving}
                className="inline-flex items-center gap-2 min-h-11 px-4 rounded-lg bg-app-warn text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                Turn it off
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
