'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import {
  PlaygroundRequestBuilder,
  type PlaygroundRequestPayload,
} from '@/components/playground/PlaygroundRequestBuilder';
import {
  PlaygroundResponseViewer,
  type ResponseStatus,
} from '@/components/playground/PlaygroundResponseViewer';

interface ResponseState {
  status: ResponseStatus;
  httpStatus?: number;
  latencyMs?: number;
  body?: unknown;
}

export default function PlaygroundPage() {
  const enabled = process.env['NEXT_PUBLIC_PLAYGROUND_ENABLED'] === 'true';
  const [response, setResponse] = useState<ResponseState>({ status: 'idle' });

  const handleSend = async (payload: PlaygroundRequestPayload) => {
    setResponse({ status: 'loading' });
    const started = performance.now();
    try {
      const res = await fetch('/api/playground/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const latencyMs = Math.round(performance.now() - started);
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = { error: 'Upstream returned non-JSON response.' };
      }
      setResponse({ status: 'response', httpStatus: res.status, latencyMs, body });
    } catch (err) {
      setResponse({
        status: 'response',
        httpStatus: 0,
        latencyMs: Math.round(performance.now() - started),
        body: { error: err instanceof Error ? err.message : 'Network error' },
      });
    }
  };

  if (!enabled) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold mb-3">Playground temporarily unavailable</h1>
          <p className="text-slate-400 mb-6">
            The interactive sandbox is disabled right now. The full API documentation is
            still available and includes runnable examples.
          </p>
          <Link
            href="/docs/api"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            View API docs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="fixed inset-0 pointer-events-none bg-mesh-dark opacity-60" />

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-3 py-1 text-xs font-mono text-primary-300 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-400 animate-pulse-subtle" />
            Live sandbox — no signup required
          </div>
          <h1 className="font-poppins text-3xl md:text-4xl font-bold tracking-tight mb-2">
            API Playground
          </h1>
          <p className="text-slate-400 max-w-2xl">
            Send a real request to{' '}
            <code className="text-slate-300 font-mono text-sm">POST /v1/parse</code>. Use the
            demo key to try it out, or paste your own{' '}
            <code className="text-slate-300 font-mono text-sm">tf_live_</code> key for
            unrestricted access.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <PlaygroundRequestBuilder
              onSend={handleSend}
              disabled={response.status === 'loading'}
            />
          </div>
          <div>
            <PlaygroundResponseViewer
              status={response.status}
              httpStatus={response.httpStatus}
              latencyMs={response.latencyMs}
              body={response.body}
            />
          </div>
        </div>

        {/* Footer CTA */}
        <div className="mt-10 rounded-xl border border-white/5 bg-[#111b2e] px-6 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-1">Ready to integrate?</h3>
            <p className="text-sm text-slate-400">
              Free tier includes 10 files/mo. Upgrade tiers at $29/$99/$249 per month.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/docs/api"
              className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              Read the docs
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
            >
              Get your API key
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
