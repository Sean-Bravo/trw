'use client';

import { SessionProvider } from 'next-auth/react';
import { IdleTimeout } from './IdleTimeout';

/**
 * Session context for the signed-in app. Refetching on window focus (the
 * SessionProvider default) lets a tab coming back from sleep learn at once
 * that the server already expired the session.
 */
export function DashboardSession({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <IdleTimeout />
    </SessionProvider>
  );
}
