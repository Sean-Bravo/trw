'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/layout/Container';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service (e.g., Sentry)
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-24">
      <Container>
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#fee2e2] rounded-full mb-8">
            <AlertTriangle className="h-10 w-10 text-[#ef4444]" />
          </div>

          <h1 className="text-4xl font-bold text-[#1a365d] font-poppins mb-4">
            Something went wrong
          </h1>

          <p className="text-lg text-[#6b7280] mb-8">
            We encountered an unexpected error. Our team has been notified and
            we're working on a fix.
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
            <Button variant="primary" onClick={reset}>
              Try again
            </Button>
            <Button variant="secondary" href="/">
              Go home
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
