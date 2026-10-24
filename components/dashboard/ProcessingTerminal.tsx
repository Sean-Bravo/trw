'use client';

import { useState, useEffect, useRef } from 'react';

export type LogLevel = 'INFO' | 'WARN' | 'FIX' | 'ERROR' | 'SUCCESS';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}

export type TerminalStage = 'idle' | 'detecting' | 'analyzing' | 'complete' | 'error';

interface ProcessingTerminalProps {
  /** Logs reset when this changes. */
  jobId?: string;
  stage: TerminalStage;
  exchange?: string;
  transactionCount?: number;
  error?: string;
  insightsReady?: boolean;
  insightsError?: string | null;
}

interface LogEvent {
  key: string;
  level: LogLevel;
  message: string;
}

// Every line is something the dashboard actually observed for this job.
// This used to replay a fixed script, including sample warnings ("Row 312:
// Duplicate Transaction ID") that were shown as if found in the user's file.
export function eventsFor(props: ProcessingTerminalProps): LogEvent[] {
  const { stage, exchange, transactionCount, error, insightsReady, insightsError } = props;
  const events: LogEvent[] = [];
  if (stage === 'detecting') {
    events.push({ key: 'queued', level: 'INFO', message: 'Upload received, queued for processing' });
  }
  if (stage === 'analyzing') {
    events.push({ key: 'running', level: 'INFO', message: 'Scanning and parsing file...' });
  }
  if (exchange) {
    events.push({ key: 'exchange', level: 'INFO', message: `Detected exchange: ${exchange}` });
  }
  if (stage === 'complete') {
    events.push({
      key: 'complete',
      level: 'SUCCESS',
      message: transactionCount && transactionCount > 0
        ? `Converted ${transactionCount} transactions`
        : 'Conversion complete',
    });
  }
  if (insightsReady) {
    events.push({ key: 'insights', level: 'INFO', message: 'AI insights ready' });
  }
  if (insightsError) {
    events.push({ key: 'insights-error', level: 'WARN', message: `AI insights unavailable: ${insightsError}` });
  }
  if (stage === 'error') {
    events.push({ key: 'error', level: 'ERROR', message: `Processing failed: ${error || 'Unknown error'}` });
  }
  return events;
}

function elapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

const levelColors: Record<LogLevel, string> = {
  INFO: 'text-app-muted',
  WARN: 'text-app-warn',
  FIX: 'text-app-success',
  ERROR: 'text-app-error',
  SUCCESS: 'text-app-success',
};

export function ProcessingTerminal(props: ProcessingTerminalProps) {
  const { jobId, stage } = props;
  const [logs, setLogs] = useState<(LogEntry & { key: string })[]>([]);
  const startedAt = useRef<number | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // New job, new log.
  useEffect(() => {
    setLogs([]);
    startedAt.current = null;
  }, [jobId]);

  // Append each event the first time it is observed, stamped with real elapsed time.
  const events = eventsFor(props);
  const eventKeys = events.map((e) => e.key).join('|');
  useEffect(() => {
    setLogs((prev) => {
      const seen = new Set(prev.map((l) => l.key));
      const fresh = events.filter((e) => !seen.has(e.key));
      if (fresh.length === 0) return prev;
      const now = Date.now();
      if (startedAt.current === null) startedAt.current = now;
      const timestamp = elapsed(now - startedAt.current);
      return [...prev, ...fresh.map((e) => ({ key: e.key, level: e.level, message: e.message, timestamp }))];
    });
    // eventKeys captures every change in `events`; jobId re-runs this after
    // the reset above even when the new job's events match the old one's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventKeys, jobId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const isProcessing = stage === 'detecting' || stage === 'analyzing';

  if (logs.length === 0) {
    return null;
  }

  return (
    <details open={isProcessing || undefined} className="border-t border-app-border pt-3 text-sm text-app-muted">
      <summary className="cursor-pointer py-1.5 select-none hover:text-app-text">
        Processing log · {logs.length} {logs.length === 1 ? 'event' : 'events'}
      </summary>
      <div
        ref={terminalRef}
        className="mt-2 font-mono text-[13px] max-h-48 overflow-y-auto flex flex-col gap-1"
      >
        {logs.map((log) => (
          <div key={log.key} className="flex gap-3">
            <span className="text-app-subtle w-11 shrink-0 tabular-nums">{log.timestamp}</span>
            <span className={levelColors[log.level]}>{log.message}</span>
          </div>
        ))}
      </div>
    </details>
  );
}
