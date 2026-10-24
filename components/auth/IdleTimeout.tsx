'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { ACTIVITY_PING_INTERVAL_MS, IDLE_WARNING_MS } from '@/lib/idle-timeout';
import { isIdleHeld } from '@/lib/idle-hold';

const CHANNEL = 'tf-activity';
const STORAGE_KEY = 'tf-last-activity';
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

// The parts of BroadcastChannel used here (reached via window: the lint
// config doesn't know browser-only globals).
type ActivityChannel = {
  postMessage: (value: number) => void;
  close: () => void;
  onmessage: ((e: { data: unknown }) => void) | null;
};

function readShared(): number {
  try {
    const v = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

function formatRemaining(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * The browser half of automatic sign-out (docs/AUTO_LOGOUT_PLAN.md): watches
 * real activity, shares it across tabs, refreshes the server's last-activity
 * stamp at most once a minute, warns two minutes before the limit and signs
 * out at it. The server enforces the limit on its own; this keeps the
 * experience honest and on time.
 */
export function IdleTimeout() {
  const { data: session, status, update } = useSession();
  const limitMin = session?.idleTimeoutMin;
  const limitMs = typeof limitMin === 'number' ? limitMin * 60 * 1000 : 0;

  const lastActivity = useRef<number>(Date.now());
  const lastPing = useRef<number>(0);
  const channel = useRef<ActivityChannel | null>(null);
  const signingOut = useRef(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const stayButton = useRef<HTMLButtonElement>(null);

  const doSignOut = useCallback(() => {
    if (signingOut.current) return;
    signingOut.current = true;
    signOut({ callbackUrl: '/login?reason=idle' });
  }, []);

  const ping = useCallback(
    (force = false) => {
      const now = Date.now();
      if (!force && now - lastPing.current < ACTIVITY_PING_INTERVAL_MS) return;
      lastPing.current = now;
      // Moves the server's clock; a session already past its limit stays expired.
      void update({ activity: true });
    },
    [update]
  );

  const recordActivity = useCallback(
    (broadcast = true) => {
      const now = Date.now();
      lastActivity.current = now;
      setRemaining(null);
      if (broadcast) {
        try {
          window.localStorage.setItem(STORAGE_KEY, String(now));
        } catch {
          // storage unavailable (private mode): the BroadcastChannel still works
        }
        channel.current?.postMessage(now);
        ping();
      }
    },
    [ping]
  );

  // The server already says this session is over (e.g. a laptop that slept
  // past the limit): sign out now.
  useEffect(() => {
    if (status === 'authenticated' && session?.idleExpired) doSignOut();
  }, [status, session?.idleExpired, doSignOut]);

  // Share activity across tabs.
  useEffect(() => {
    if (typeof window.BroadcastChannel !== 'undefined') {
      channel.current = new window.BroadcastChannel(CHANNEL) as unknown as ActivityChannel;
      channel.current.onmessage = (e) => {
        if (typeof e.data === 'number' && e.data > lastActivity.current) {
          lastActivity.current = e.data;
          setRemaining(null);
        }
      };
    }
    const onStorage = (e: { key: string | null; newValue: string | null }) => {
      if (e.key === STORAGE_KEY) {
        const v = Number(e.newValue);
        if (Number.isFinite(v) && v > lastActivity.current) {
          lastActivity.current = v;
          setRemaining(null);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      channel.current?.close();
      channel.current = null;
    };
  }, []);

  // Opening a dashboard page counts as activity and stamps the server clock
  // once, so a session never stays unstamped.
  useEffect(() => {
    if (status !== 'authenticated' || session?.idleExpired) return;
    lastActivity.current = Math.max(Date.now(), readShared());
    ping(true);
    // run once per sign-in
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const tick = useCallback(() => {
    if (limitMs <= 0 || signingOut.current) return;
    // An upload or conversion in progress keeps the user signed in.
    if (isIdleHeld()) {
      recordActivity();
      return;
    }
    const shared = readShared();
    if (shared > lastActivity.current) lastActivity.current = shared;
    const left = limitMs - (Date.now() - lastActivity.current);
    if (left <= 0) {
      doSignOut();
    } else if (left <= IDLE_WARNING_MS) {
      setRemaining(left);
    } else {
      setRemaining(null);
    }
  }, [limitMs, recordActivity, doSignOut]);

  // Real input only. Mouse movement and the dashboard's background polling
  // don't count.
  useEffect(() => {
    if (status !== 'authenticated' || limitMs <= 0) return;
    const onActivity = () => recordActivity();
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity));
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [status, limitMs, recordActivity, tick]);


  useEffect(() => {
    if (status !== 'authenticated' || limitMs <= 0) return;
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [status, limitMs, tick]);

  const warning = remaining !== null;
  useEffect(() => {
    if (warning) stayButton.current?.focus();
  }, [warning]);

  if (!warning) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="idle-title"
        aria-describedby="idle-desc"
        className="relative w-full max-w-md rounded-2xl border border-app-border bg-app-card p-6 shadow-2xl"
      >
        <h2 id="idle-title" className="text-lg font-semibold text-app-text">Still there?</h2>
        <p id="idle-desc" className="mt-2 text-app-muted">
          For your security you&apos;ll be signed out in{' '}
          <span className="font-semibold text-app-text tabular-nums" aria-live="polite">{formatRemaining(remaining)}</span>{' '}
          because of inactivity.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={doSignOut}
            className="min-h-11 px-4 rounded-lg text-sm font-medium text-app-muted hover:text-app-text hover:bg-app-raised"
          >
            Sign out now
          </button>
          <button
            ref={stayButton}
            type="button"
            onClick={() => {
              recordActivity();
              ping(true);
            }}
            className="min-h-11 px-5 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600"
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  );
}
