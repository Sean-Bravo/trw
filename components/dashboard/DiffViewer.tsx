'use client';

import { useState, useMemo } from 'react';
import { useJobContext } from '@/contexts/JobContext';

const PREVIEW_ROWS = 3;

type Row = Record<string, unknown>;

function formatAmount(amount: unknown, currency: unknown): string {
  if (amount === null || amount === undefined || amount === '') return '—';
  const n = typeof amount === 'number' ? amount : Number(amount);
  const text = Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: 8 }) : String(amount);
  return currency ? `${text} ${currency}` : text;
}

// "2024-01-03 14:05:00" -> "Jan 3, 2024 14:05"; midnight drops the time
function formatDate(value: unknown): string {
  if (!value) return '—';
  const raw = String(value);
  // A bare "YYYY-MM-DD" parses as UTC midnight and shows as the day before
  // in US time zones; read it as a local date.
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return raw;
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const hhmm = raw.match(/[T ](\d{2}:\d{2})/)?.[1];
  return hhmm && hhmm !== '00:00' ? `${date} ${hhmm}` : date;
}

/**
 * "What changed": the converted (tax-ready) rows of the finished job. Hidden
 * until a job has succeeded; the Insights card covers the in-progress states.
 */
export function DiffViewer() {
  const { activeJob } = useJobContext();
  const [showAll, setShowAll] = useState(false);

  const data = useMemo(() => {
    if (activeJob?.status !== 'succeeded' || !activeJob.result) return null;
    const result = activeJob.result as Row;
    const processed = result['processed'] as Row[] | undefined;
    if (!processed || processed.length === 0) return null;
    const total = (result['record_count'] as number) || processed.length;
    return { processed, total, exchange: result['exchange'] as string | undefined };
  }, [activeJob?.status, activeJob?.result]);

  if (!data) return null;

  const rows = showAll ? data.processed : data.processed.slice(0, PREVIEW_ROWS);
  const source = data.exchange ? `${data.exchange.charAt(0).toUpperCase()}${data.exchange.slice(1)} export` : 'Your file';

  return (
    <section aria-labelledby="what-changed-title" className="bg-app-card border border-app-border rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="what-changed-title" className="text-lg font-semibold text-app-text">What changed</h2>
        <p className="text-sm text-app-muted">
          {source} → tax-ready rows · {rows.length} of {data.total} shown
        </p>
      </div>

      <div className="overflow-x-auto border border-app-border rounded-xl">
        <table className="w-full min-w-170 text-sm">
          <thead>
            <tr className="bg-app-raised text-left text-app-muted">
              <th scope="col" className="px-3.5 py-2.5 font-medium">Date</th>
              <th scope="col" className="px-3.5 py-2.5 font-medium">Original</th>
              <th scope="col" className="px-3.5 py-2.5 font-medium">Sent</th>
              <th scope="col" className="px-3.5 py-2.5 font-medium">Received</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-app-border tabular-nums">
                <td className="px-3.5 py-2.5 text-app-text whitespace-nowrap">{formatDate(row['Date'])}</td>
                <td className="px-3.5 py-2.5 text-app-muted">{String(row['Description'] ?? row['Label'] ?? '—')}</td>
                <td className="px-3.5 py-2.5 text-app-text">{formatAmount(row['Sent Amount'], row['Sent Currency'])}</td>
                <td className="px-3.5 py-2.5 text-app-text">{formatAmount(row['Received Amount'], row['Received Currency'])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.processed.length > PREVIEW_ROWS && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="self-start min-h-11 text-sm font-semibold text-app-link hover:underline"
        >
          {showAll ? 'Show fewer rows' : `Show all ${data.processed.length} rows`}
        </button>
      )}
    </section>
  );
}
