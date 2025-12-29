'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Send error to Sentry
    Sentry.captureException(error);
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-white antialiased">
        <div className="min-h-screen flex items-center justify-center px-4 py-24">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-[#fee2e2] rounded-full mb-8">
              <AlertTriangle className="h-10 w-10 text-[#ef4444]" />
            </div>

            <h1 className="text-4xl font-bold text-[#1a365d] mb-4">
              Critical Error
            </h1>

            <p className="text-lg text-[#6b7280] mb-8">
              We encountered a critical error. Please try refreshing the page.
            </p>

            {process.env.NODE_ENV === 'development' && (
              <div className="mb-8 p-4 bg-[#f3f4f6] rounded-lg text-left">
                <p className="text-sm font-mono text-[#ef4444] break-all">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="text-xs text-[#6b7280] mt-2">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center h-12 px-8 rounded-full text-white bg-[#059669] hover:bg-[#047857] font-semibold transition-all"
              >
                Try again
              </button>
              <a
                href="/"
                className="inline-flex items-center justify-center h-12 px-8 rounded-full text-[#1a365d] border-2 border-[#1a365d] hover:bg-[#1a365d] hover:text-white font-semibold transition-all"
              >
                Go home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
