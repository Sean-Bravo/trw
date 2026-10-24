'use client';

import { useState, useMemo, useEffect } from 'react';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { useJobContext } from '@/contexts/JobContext';
import { JobStatus } from '@/hooks/useJobPolling';
import { getJobInsights, AIInsights, retryJobWithExchange, getDownloadUrl, TaxSoftwareFormat } from '@/lib/upload-client';
import { ExchangeSelector } from './ExchangeSelector';
import { TaxSoftwareSelector } from './TaxSoftwareSelector';
import { ProcessingTerminal } from './ProcessingTerminal';
import { insightsLabel } from '@/lib/tier-registry';
import { engineLabel } from '@/lib/insights-engine';
import { EXCHANGE_SOURCES } from '@/lib/exchange-registry';

// The processor's result.json names the exchange `exchange` (an id such as
// "coinbase"); `exchangeDetected` is the older name this panel was built on.
function detectedExchangeName(result: Record<string, unknown> | null): string | undefined {
  const id = (result?.['exchange'] ?? result?.['exchangeDetected']) as string | undefined;
  if (!id) return undefined;
  return EXCHANGE_SOURCES.find((e) => e.id === id)?.name ?? id;
}

// "2024-01-03 14:05:00" .. "2024-11-15 16:00:00" -> "Jan 3 – Nov 15, 2024"
export function formatDateRange(start?: string | null, end?: string | null): string | undefined {
  if (!start || !end) return undefined;
  // A bare "YYYY-MM-DD" parses as UTC midnight (the day before in US zones)
  const local = (v: string) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00:00` : v.replace(' ', 'T'));
  const a = local(start);
  const b = local(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return `${start} – ${end}`;
  const md = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return a.getFullYear() === b.getFullYear()
    ? `${md(a)} – ${md(b)}, ${b.getFullYear()}`
    : `${md(a)}, ${a.getFullYear()} – ${md(b)}, ${b.getFullYear()}`;
}

export type InsightStatus = 'idle' | 'detecting' | 'analyzing' | 'complete' | 'error';

export interface AIInsightsState {
  status: InsightStatus;
  exchange?: string;
  transactionsFound?: number;
  transactionDetails?: {
    buys: number;
    sells: number;
    transfers: number;
    fees: number;
    dateRange?: string;
  };
  error?: string;
}

// Map job status to insight status
function mapJobStatusToInsightStatus(jobStatus: JobStatus): InsightStatus {
  switch (jobStatus) {
    case 'queued':
      return 'detecting';
    case 'running':
      return 'analyzing';
    case 'succeeded':
      return 'complete';
    case 'failed':
    case 'canceled':
      return 'error';
    default:
      return 'idle';
  }
}

export function AIInsightsPanel() {
  const { activeJob, setActiveJob } = useJobContext();
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Fetch AI insights when job completes
  useEffect(() => {
    if (activeJob?.status === 'succeeded' && activeJob.jobId) {
      setInsightsLoading(true);
      setInsightsError(null);

      getJobInsights(activeJob.jobId)
        .then((data) => {
          setAiInsights(data);
        })
        .catch((err) => {
          console.error('Failed to fetch AI insights:', err);
          setInsightsError(err.message || 'Failed to load insights');
        })
        .finally(() => {
          setInsightsLoading(false);
        });
    } else if (!activeJob || activeJob.status !== 'succeeded') {
      // Reset when no active job or job not complete
      setAiInsights(null);
      setInsightsError(null);
    }
  }, [activeJob?.jobId, activeJob?.status]);

  // Derive insight state from active job
  const state = useMemo((): AIInsightsState => {
    if (!activeJob) {
      return { status: 'idle', transactionsFound: 0 };
    }

    const result = activeJob.result as Record<string, unknown> | null;
    const status = mapJobStatusToInsightStatus(activeJob.status);
    const quickStats = aiInsights?.quick_stats;

    return {
      status,
      exchange: detectedExchangeName(result),
      // record_count is what the processor writes; transactionCount is the
      // name this panel was built on and nothing writes.
      transactionsFound:
        quickStats?.total_transactions ||
        (result?.['record_count'] as number) ||
        (result?.['transactionCount'] as number) ||
        0,
      transactionDetails: quickStats ? {
        buys: quickStats.transaction_types?.['buy'] || quickStats.transaction_types?.['Buy'] || 0,
        sells: quickStats.transaction_types?.['sell'] || quickStats.transaction_types?.['Sell'] || 0,
        transfers: quickStats.transaction_types?.['transfer'] || quickStats.transaction_types?.['Transfer'] || 0,
        fees: quickStats.transaction_types?.['fee'] || quickStats.transaction_types?.['Fee'] || 0,
        dateRange: formatDateRange(quickStats.date_range?.start, quickStats.date_range?.end),
      } : undefined,
      error: activeJob.error || undefined,
    };
  }, [activeJob, aiInsights]);

  const { status, exchange, transactionsFound = 0, transactionDetails, error } = state;

  const isProcessing = status === 'detecting' || status === 'analyzing';
  const isComplete = status === 'complete';
  const hasError = status === 'error';

  // Check if error is specifically an auto-detect failure
  const isDetectionFailure = hasError && error?.toLowerCase().includes('auto-detect');

  // Get detected columns and error details from error metadata if available
  const errorDetails = useMemo(() => {
    if (!activeJob?.result) return { columns: [], suggestion: '', analysis: null };
    const result = activeJob.result as Record<string, unknown>;
    const errors = result?.['errors'] as Array<{
      columns_found?: string[];
      suggestion?: string;
      analysis?: {
        has_date_column: boolean;
        has_amount_column: boolean;
        has_type_column: boolean;
      };
    }> | undefined;

    return {
      columns: errors?.[0]?.columns_found || [],
      suggestion: errors?.[0]?.suggestion || '',
      analysis: errors?.[0]?.analysis || null,
    };
  }, [activeJob?.result]);

  // Handle retry with manual exchange selection
  const handleRetryWithExchange = async (exchangeName: string) => {
    if (!activeJob?.jobId) return;

    setIsRetrying(true);
    setRetryError(null);

    try {
      await retryJobWithExchange(activeJob.jobId, exchangeName);
      // Re-trigger polling by setting the same job ID
      setActiveJob(activeJob.jobId);
    } catch (err) {
      const error = err as { message?: string };
      setRetryError(error.message || 'Failed to retry job');
    } finally {
      setIsRetrying(false);
    }
  };

  // Handle download with format selection
  const handleDownload = async (format: string) => {
    if (!activeJob?.jobId) return;

    setIsDownloading(true);
    setDownloadError(null);

    try {
      const result = await getDownloadUrl(activeJob.jobId, 'formatted', format as TaxSoftwareFormat);
      // Use window.location for S3 presigned URLs - more reliable than link.click()
      // The Content-Disposition header in the presigned URL handles the filename
      window.location.href = result.downloadUrl;
    } catch (err) {
      const error = err as { message?: string };
      setDownloadError(error.message || 'Failed to get download URL');
    } finally {
      setIsDownloading(false);
    }
  };

  const ai = aiInsights?.ai_insights;
  const worthChecking = (ai?.data_notes?.length ? ai.data_notes : ai?.potential_issues) || [];

  return (
    <section aria-labelledby="insights-title" className="bg-app-card border border-app-border rounded-2xl p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="insights-title" className="text-lg font-semibold text-app-text">Insights</h2>
        {isComplete && <Pill tone="success">Complete</Pill>}
        {isProcessing && <Pill tone="info">Converting…</Pill>}
        {hasError && <Pill tone="error">{activeJob?.status === 'canceled' ? 'Canceled' : 'Failed'}</Pill>}
      </div>

      {/* Empty state */}
      {status === 'idle' && (
        <div className="flex flex-col items-center text-center gap-2 py-12 px-4">
          <Sparkles className="w-7 h-7 text-app-subtle" aria-hidden="true" />
          <p className="font-semibold text-app-text">No file yet</p>
          <p className="text-sm text-app-muted max-w-sm">
            Upload an exchange CSV to see the detected exchange, a transaction breakdown and notes on anything to check.
          </p>
        </div>
      )}

      {/* File line: name · exchange · count · date range */}
      {status !== 'idle' && activeJob && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-app-muted">
          <span className="font-semibold text-app-text break-all">{activeJob.filename}</span>
          {exchange && <span>{exchange}</span>}
          {transactionsFound > 0 && <span>{transactionsFound} transactions</span>}
          {transactionDetails?.dateRange && <span>{transactionDetails.dateRange}</span>}
        </div>
      )}

      {isProcessing && (
        <p className="flex items-center gap-2 text-sm text-app-muted">
          <Loader2 className="w-4 h-4 animate-spin text-primary-500" aria-hidden="true" />
          {status === 'detecting' ? 'Waiting to start…' : 'Detecting the exchange and converting rows…'}
        </p>
      )}

      {isComplete && (
        <>
          {transactionDetails && (
            <div>
              <div className="grid grid-cols-3 gap-3">
                <CountTile label="Buys" value={transactionDetails.buys} />
                <CountTile label="Sells" value={transactionDetails.sells} />
                <CountTile label="Transfers" value={transactionDetails.transfers} />
              </div>
              {/* "Fees" counts rows that carry a fee, not separate transactions */}
              {transactionDetails.fees > 0 && (
                <p className="mt-2 text-[13px] text-app-muted">
                  {transactionDetails.fees} of these rows also carry a fee.
                </p>
              )}
            </div>
          )}

          {insightsLoading && (
            <p className="flex items-center gap-2 text-sm text-app-muted border-t border-app-border pt-4">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Generating insights…
            </p>
          )}

          {ai?.summary && (
            <div className="border-t border-app-border pt-4 flex flex-col gap-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-[13px] font-semibold uppercase tracking-wider text-app-muted">Summary</h3>
                {aiInsights?.tier && (
                  <span className="text-xs text-app-subtle">{insightsLabel(aiInsights.tier)} · {engineLabel()}</span>
                )}
              </div>
              <p className="text-app-text leading-relaxed">{ai.summary}</p>
              {ai.top_assets && ai.top_assets.length > 0 && (
                <ul className="flex flex-wrap gap-1.5" aria-label="Top assets">
                  {ai.top_assets.slice(0, 5).map((a) => (
                    <li key={a.asset} className="text-[13px] bg-app-raised text-app-text rounded-md px-2 py-0.5 tabular-nums">
                      {a.asset} · {a.count}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {worthChecking.length > 0 && (
            <div className="border-t border-app-border pt-4 flex flex-col gap-2.5">
              <h3 className="text-[13px] font-semibold uppercase tracking-wider text-app-muted">Worth checking</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-app-text">
                {worthChecking.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          {aiInsights?.ai_error && (
            <p className="flex items-center gap-2 text-sm text-app-warn border-t border-app-border pt-4">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              AI notes aren&apos;t available for this file. The converted CSV is unaffected.
            </p>
          )}

          <div className="border-t border-app-border pt-4">
            <TaxSoftwareSelector onDownload={handleDownload} isDownloading={isDownloading} />
            {downloadError && <p role="alert" className="mt-2 text-sm text-app-error">{downloadError}</p>}
          </div>
        </>
      )}

      {/* Detection failure: let the user pick the exchange and retry */}
      {isDetectionFailure && (
        <div className="rounded-xl border border-app-warn/30 bg-app-warn-bg p-4">
          <ExchangeSelector
            onRetry={handleRetryWithExchange}
            isRetrying={isRetrying}
            detectedColumns={errorDetails.columns}
            suggestion={errorDetails.suggestion}
            analysis={errorDetails.analysis}
          />
          {retryError && <p role="alert" className="mt-2 text-sm text-app-error">{retryError}</p>}
        </div>
      )}

      {hasError && error && !isDetectionFailure && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-app-error/30 bg-app-error-bg p-4">
          <AlertTriangle className="w-5 h-5 text-app-error shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-semibold text-app-text">Couldn&apos;t convert this file</p>
            <p className="text-sm text-app-error">{error}</p>
          </div>
        </div>
      )}

      {insightsError && (
        <p className="flex items-center gap-2 text-sm text-app-warn">
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          {insightsError}
        </p>
      )}

      {/* Real events only (see ProcessingTerminal), folded away once done */}
      {status !== 'idle' && (
        <ProcessingTerminal
          jobId={activeJob?.jobId}
          stage={status}
          exchange={exchange}
          transactionCount={transactionsFound}
          error={error}
          insightsReady={!!ai}
          insightsError={insightsError || (aiInsights?.ai_error ? 'the analysis service did not respond' : null)}
        />
      )}
    </section>
  );
}

function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-app-raised rounded-lg px-3.5 py-3">
      <p className="text-[13px] text-app-muted">{label}</p>
      <p className="text-[22px] font-bold text-app-text tabular-nums">{value}</p>
    </div>
  );
}

function Pill({ tone, children }: { tone: 'success' | 'error' | 'info'; children: React.ReactNode }) {
  const tones = {
    success: 'text-app-success bg-app-success-bg',
    error: 'text-app-error bg-app-error-bg',
    info: 'text-primary-700 bg-primary-50',
  };
  return (
    <span className={`text-[13px] font-semibold rounded-full px-2.5 py-1 ${tones[tone]}`}>
      {children}
    </span>
  );
}
