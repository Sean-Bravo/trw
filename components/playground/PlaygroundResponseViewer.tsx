'use client';

import { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';

export type ResponseStatus = 'idle' | 'loading' | 'response';

interface PlaygroundResponseViewerProps {
  status: ResponseStatus;
  httpStatus?: number;
  latencyMs?: number;
  body?: unknown;
}

function statusPillStyles(httpStatus: number | undefined): string {
  if (httpStatus === undefined) return 'bg-slate-800 text-slate-400';
  if (httpStatus >= 200 && httpStatus < 300) return 'bg-accent-500/10 text-accent-400 border border-accent-500/20';
  if (httpStatus >= 400 && httpStatus < 500) return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
  if (httpStatus >= 500) return 'bg-red-500/10 text-red-400 border border-red-500/20';
  return 'bg-slate-800 text-slate-400';
}

export function PlaygroundResponseViewer({
  status,
  httpStatus,
  latencyMs,
  body,
}: PlaygroundResponseViewerProps) {
  const [copied, setCopied] = useState(false);

  const formatted = body === undefined ? '' : JSON.stringify(body, null, 2);

  const handleCopy = async () => {
    if (!formatted) return;
    await navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-white/5 bg-[#111b2e] overflow-hidden flex flex-col h-full min-h-[480px]">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-300">Response</span>
          {status === 'response' && httpStatus !== undefined && (
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-medium ${statusPillStyles(httpStatus)}`}
            >
              {httpStatus}
            </span>
          )}
          {status === 'response' && latencyMs !== undefined && (
            <span className="text-[11px] font-mono text-slate-500">
              {latencyMs < 1000 ? `${latencyMs}ms` : `${(latencyMs / 1000).toFixed(2)}s`}
            </span>
          )}
        </div>
        {status === 'response' && formatted && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors"
            aria-label="Copy response"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-accent-400" />
                <span className="text-accent-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {status === 'idle' && (
          <div className="h-full flex items-center justify-center p-8 text-center">
            <p className="text-sm text-slate-500 max-w-xs">
              Send a request to see the response here. The playground hits the real
              <span className="font-mono text-slate-400"> /v1/parse </span>
              endpoint — same response shape as your production code.
            </p>
          </div>
        )}
        {status === 'loading' && (
          <div className="h-full flex items-center justify-center p-8">
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
              </svg>
              Calling /v1/parse…
            </div>
          </div>
        )}
        {status === 'response' && (
          <pre className="p-4 overflow-auto font-mono text-[12px] leading-relaxed text-slate-300">
            <code>{formatted}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
