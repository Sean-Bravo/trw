'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { captureException } from '@/lib/sentry';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error, { digest: error.digest, page: 'dashboard' });
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-app-error-bg border border-app-error/30 rounded-2xl mb-6">
          <AlertTriangle className="h-8 w-8 text-app-error" />
        </div>

        <h2 className="text-2xl font-semibold text-app-text mb-3">
          Something went wrong
        </h2>

        <p className="text-app-muted mb-6">
          We hit an unexpected error loading your dashboard. Our team has been notified.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-app-raised border border-app-border rounded-xl text-left">
            <p className="text-sm font-mono text-app-error break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-app-subtle mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-app-raised hover:bg-app-border text-app-text font-medium rounded-xl border border-app-border transition-colors"
          >
            <Home className="h-4 w-4" />
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
