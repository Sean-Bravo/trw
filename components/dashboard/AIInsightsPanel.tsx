'use client';

import { useState, useMemo, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Loader2, Sparkles, ChevronDown, TrendingUp, Calendar, Coins, Lightbulb } from 'lucide-react';
import { useJobContext } from '@/contexts/JobContext';
import { JobStatus } from '@/hooks/useJobPolling';
import { getJobInsights, AIInsights } from '@/lib/upload-client';

export type InsightStatus = 'idle' | 'detecting' | 'analyzing' | 'complete' | 'error';

export interface AIInsightsState {
  status: InsightStatus;
  exchange?: string;
  exchangeDetails?: {
    format: string;
    dateFormat: string;
    columns: string[];
    confidence: number;
  };
  transactionsFound?: number;
  transactionsAnalyzed?: number;
  transactionDetails?: {
    buys: number;
    sells: number;
    transfers: number;
    fees: number;
    dateRange?: string;
  };
  progress?: number;
  taxFlags?: {
    count: number;
    issues: string[];
  };
  error?: string;
}

// Default fallback values for expanded panels
const defaultExchangeDetails = {
  format: 'CSV',
  dateFormat: 'YYYY-MM-DD',
  columns: [] as string[],
  confidence: 0,
};

const defaultTransactionDetails = {
  buys: 0,
  sells: 0,
  transfers: 0,
  fees: 0,
  dateRange: undefined as string | undefined,
};

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
  const { activeJob, isPolling } = useJobContext();
  const [expandedPanel, setExpandedPanel] = useState<'exchange' | 'transactions' | 'flags' | 'ai' | null>(null);
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

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
      return { status: 'idle', transactionsFound: 0, transactionsAnalyzed: 0, progress: 0 };
    }

    const result = activeJob.result as Record<string, unknown> | null;
    const status = mapJobStatusToInsightStatus(activeJob.status);

    // Calculate progress based on status
    let progress = 0;
    if (activeJob.status === 'queued') progress = 25;
    else if (activeJob.status === 'running') progress = 60;
    else if (activeJob.status === 'succeeded') progress = 100;

    // Use AI insights data if available
    const quickStats = aiInsights?.quick_stats;
    const aiData = aiInsights?.ai_insights;

    return {
      status,
      exchange: result?.['exchangeDetected'] as string | undefined,
      exchangeDetails: result?.['exchangeDetails'] as AIInsightsState['exchangeDetails'],
      transactionsFound: quickStats?.total_transactions || (result?.['transactionCount'] as number) || 0,
      transactionsAnalyzed: status === 'complete' ? (quickStats?.total_transactions || (result?.['transactionCount'] as number) || 0) : 0,
      transactionDetails: quickStats ? {
        buys: quickStats.transaction_types?.['buy'] || quickStats.transaction_types?.['Buy'] || 0,
        sells: quickStats.transaction_types?.['sell'] || quickStats.transaction_types?.['Sell'] || 0,
        transfers: quickStats.transaction_types?.['transfer'] || quickStats.transaction_types?.['Transfer'] || 0,
        fees: quickStats.transaction_types?.['fee'] || quickStats.transaction_types?.['Fee'] || 0,
        dateRange: quickStats.date_range?.start && quickStats.date_range?.end
          ? `${quickStats.date_range.start} - ${quickStats.date_range.end}`
          : undefined,
      } : (result?.['transactionDetails'] as AIInsightsState['transactionDetails']),
      progress,
      taxFlags: aiData?.potential_issues?.length ? {
        count: aiData.potential_issues.length,
        issues: aiData.potential_issues,
      } : (result?.['taxFlags'] as AIInsightsState['taxFlags']),
      error: activeJob.error || undefined,
    };
  }, [activeJob, aiInsights]);

  const { status, exchange, exchangeDetails, transactionsFound = 0, transactionsAnalyzed = 0, transactionDetails, progress = 0, taxFlags, error } = state;

  const isProcessing = status === 'detecting' || status === 'analyzing';
  const isComplete = status === 'complete';
  const hasError = status === 'error';

  return (
    <div className="bg-[#0d2847]/80 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden">
      {/* Subtle glow effects */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-[60px]" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-[50px]" />

      <div className="flex items-center gap-2 mb-5 relative">
        <Sparkles className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-semibold text-white">AI Insights Panel</h2>
      </div>

      <div className="space-y-3 relative">
        {/* Exchange Detected */}
        <button
          onClick={() => setExpandedPanel(expandedPanel === 'exchange' ? null : 'exchange')}
          className={`w-full bg-white rounded-xl p-4 shadow-lg transition-all text-left hover:shadow-xl ${
            isComplete && exchange ? 'border-2 border-emerald-400/50' : ''
          } ${expandedPanel === 'exchange' ? 'ring-2 ring-blue-400/50' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                exchange ? 'bg-emerald-100' : 'bg-slate-100'
              }`}>
                {status === 'detecting' ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : exchange ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="font-semibold text-slate-800">Exchange Detected:</p>
                <p className="text-slate-400 text-sm">
                  {status === 'detecting' ? 'Scanning file...' : exchange || 'Waiting for upload...'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={exchange ? 'complete' : status} />
              {exchange && (
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedPanel === 'exchange' ? 'rotate-180' : ''}`} />
              )}
            </div>
          </div>

          {/* Expanded Details */}
          {expandedPanel === 'exchange' && exchange && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
              {(() => {
                const details = exchangeDetails || defaultExchangeDetails;
                return (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Format</span>
                      <span className="text-slate-800 font-medium">{details.format}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Date Format</span>
                      <span className="text-slate-800 font-mono text-xs">{details.dateFormat}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Confidence</span>
                      <span className="text-emerald-600 font-medium">{details.confidence}%</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-slate-500 block mb-2">Columns Detected</span>
                      <div className="flex flex-wrap gap-1">
                        {details.columns.map((col, i) => (
                          <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </button>

        {/* Analyzing Transactions */}
        <button
          onClick={() => setExpandedPanel(expandedPanel === 'transactions' ? null : 'transactions')}
          className={`w-full bg-white rounded-xl p-4 shadow-lg transition-all text-left hover:shadow-xl ${
            status === 'analyzing' ? 'border-2 border-amber-400/50' : isComplete ? 'border-2 border-emerald-400/50' : ''
          } ${expandedPanel === 'transactions' ? 'ring-2 ring-blue-400/50' : ''}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {status === 'analyzing' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
              <p className="font-semibold text-slate-800">
                {status === 'analyzing' ? 'Analyzing Transactions...' : 'Transaction Analysis'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">
                {isComplete ? `${transactionsAnalyzed} analyzed` : `${transactionsFound} found`}
              </span>
              {(isComplete || transactionsFound > 0) && (
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedPanel === 'transactions' ? 'rotate-180' : ''}`} />
              )}
            </div>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isComplete ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-blue-400 to-blue-600'
              }`}
              style={{ width: `${isComplete ? 100 : progress}%` }}
            />
          </div>

          {/* Expanded Details */}
          {expandedPanel === 'transactions' && (isComplete || transactionsFound > 0) && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
              {(() => {
                const details = transactionDetails || defaultTransactionDetails;
                return (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-emerald-50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-emerald-600">{details.buys}</p>
                        <p className="text-xs text-slate-500">Buys</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-red-600">{details.sells}</p>
                        <p className="text-xs text-slate-500">Sells</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-blue-600">{details.transfers}</p>
                        <p className="text-xs text-slate-500">Transfers</p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-amber-600">{details.fees}</p>
                        <p className="text-xs text-slate-500">Fees</p>
                      </div>
                    </div>
                    {details.dateRange && (
                      <div className="flex justify-between text-sm pt-2">
                        <span className="text-slate-500">Date Range</span>
                        <span className="text-slate-800 font-medium">{details.dateRange}</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </button>

        {/* Tax Flags */}
        <button
          onClick={() => setExpandedPanel(expandedPanel === 'flags' ? null : 'flags')}
          className={`w-full rounded-xl p-4 shadow-lg transition-all text-left hover:shadow-xl ${
            taxFlags && taxFlags.count > 0
              ? 'bg-orange-50 border-2 border-orange-400/50'
              : isComplete
                ? 'bg-emerald-50'
                : 'bg-orange-50'
          } ${expandedPanel === 'flags' ? 'ring-2 ring-blue-400/50' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                taxFlags && taxFlags.count > 0
                  ? 'bg-orange-100'
                  : isComplete
                    ? 'bg-emerald-100'
                    : 'bg-orange-100'
              }`}>
                {taxFlags && taxFlags.count > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                ) : isComplete ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                )}
              </div>
              <div>
                <p className="font-semibold text-slate-800">Tax Flags</p>
                <p className="text-slate-400 text-sm">
                  {taxFlags && taxFlags.count > 0
                    ? `${taxFlags.count} issue${taxFlags.count > 1 ? 's' : ''} found`
                    : isComplete
                      ? 'No issues detected'
                      : 'No issues detected yet'}
                </p>
              </div>
            </div>
            {(taxFlags?.issues?.length || isComplete) && (
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedPanel === 'flags' ? 'rotate-180' : ''}`} />
            )}
          </div>

          {/* Expanded Details */}
          {expandedPanel === 'flags' && (
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
              {taxFlags?.issues?.length ? (
                taxFlags.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{issue}</span>
                  </div>
                ))
              ) : isComplete ? (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>All transactions passed validation checks</span>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Issues will appear here after analysis</p>
              )}
            </div>
          )}
        </button>

        {/* AI Summary Panel - Shows when insights are available */}
        {isComplete && (aiInsights?.ai_insights || insightsLoading) && (
          <button
            onClick={() => setExpandedPanel(expandedPanel === 'ai' ? null : 'ai')}
            className={`w-full rounded-xl p-4 shadow-lg transition-all text-left hover:shadow-xl bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-400/30 ${
              expandedPanel === 'ai' ? 'ring-2 ring-indigo-400/50' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  {insightsLoading ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 flex items-center gap-2">
                    AI Analysis
                    {aiInsights?.tier && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        aiInsights.tier === 'premium' ? 'bg-purple-100 text-purple-600' :
                        aiInsights.tier === 'pro' ? 'bg-indigo-100 text-indigo-600' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {aiInsights.tier.charAt(0).toUpperCase() + aiInsights.tier.slice(1)}
                      </span>
                    )}
                  </p>
                  <p className="text-slate-400 text-sm">
                    {insightsLoading ? 'Generating insights...' :
                     aiInsights?.ai_insights?.summary ? 'AI-powered analysis ready' :
                     'Basic stats available'}
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedPanel === 'ai' ? 'rotate-180' : ''}`} />
            </div>

            {/* Expanded AI Details */}
            {expandedPanel === 'ai' && aiInsights?.ai_insights && (
              <div className="mt-4 pt-4 border-t border-indigo-200 space-y-4">
                {/* Summary */}
                {aiInsights.ai_insights.summary && (
                  <div className="bg-white/70 rounded-lg p-3">
                    <p className="text-sm text-slate-700 leading-relaxed">{aiInsights.ai_insights.summary}</p>
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {aiInsights.ai_insights.total_transactions && (
                    <div className="bg-white/70 rounded-lg p-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-indigo-500" />
                      <div>
                        <p className="text-lg font-bold text-slate-800">{aiInsights.ai_insights.total_transactions}</p>
                        <p className="text-xs text-slate-500">Transactions</p>
                      </div>
                    </div>
                  )}
                  {aiInsights.ai_insights.estimated_events && (
                    <div className="bg-white/70 rounded-lg p-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-500" />
                      <div>
                        <p className="text-lg font-bold text-slate-800">{aiInsights.ai_insights.estimated_events}</p>
                        <p className="text-xs text-slate-500">Taxable Events</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Top Assets */}
                {aiInsights.ai_insights.top_assets && aiInsights.ai_insights.top_assets.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Coins className="w-3 h-3" /> Top Assets
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {aiInsights.ai_insights.top_assets.slice(0, 5).map((asset, i) => (
                        <span key={i} className="px-2 py-1 bg-white/70 rounded text-sm text-slate-700">
                          {asset.asset} <span className="text-slate-400">({asset.count})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tax Tips */}
                {aiInsights.ai_insights.tax_tips && aiInsights.ai_insights.tax_tips.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" /> Tax Tips
                    </p>
                    <div className="space-y-2">
                      {aiInsights.ai_insights.tax_tips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm bg-white/70 rounded-lg p-2">
                          <span className="text-amber-500 font-bold">{i + 1}.</span>
                          <span className="text-slate-700">{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Model Info */}
                {aiInsights.model && (
                  <div className="text-xs text-slate-400 pt-2 border-t border-indigo-100">
                    Powered by {aiInsights.provider === 'anthropic' ? 'Claude' : 'Gemini'} ({aiInsights.model})
                  </div>
                )}
              </div>
            )}

            {/* AI Error State */}
            {expandedPanel === 'ai' && aiInsights?.ai_error && (
              <div className="mt-4 pt-4 border-t border-indigo-200">
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>AI analysis unavailable: {aiInsights.ai_error}</span>
                </div>
              </div>
            )}
          </button>
        )}

        {/* Error State */}
        {hasError && error && (
          <div className="bg-red-50 rounded-xl p-4 flex items-center gap-3 shadow-lg border-2 border-red-400/50">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Processing Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Insights Loading Error */}
        {insightsError && (
          <div className="bg-amber-50 rounded-xl p-4 flex items-center gap-3 shadow-lg border border-amber-400/50">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <p className="text-amber-700 text-sm">{insightsError}</p>
          </div>
        )}
      </div>

      {/* Bottom info */}
      <div className="mt-5 pt-4 border-t border-white/10 relative">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className={`w-2 h-2 rounded-full ${
            isProcessing ? 'bg-blue-400 animate-pulse' : isComplete ? 'bg-emerald-400' : 'bg-slate-500'
          }`} />
          <span>
            {isProcessing
              ? 'Processing your file...'
              : isComplete
                ? `Analysis complete${aiInsights?.tier ? ` (${aiInsights.tier} tier)` : ''}`
                : 'Panels update in real-time during processing'}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: InsightStatus | 'complete' }) {
  const styles = {
    idle: 'bg-slate-100 text-slate-400',
    detecting: 'bg-blue-100 text-blue-600',
    analyzing: 'bg-amber-100 text-amber-600',
    complete: 'bg-emerald-100 text-emerald-600',
    error: 'bg-red-100 text-red-600',
  };

  const labels = {
    idle: 'Idle',
    detecting: 'Detecting...',
    analyzing: 'Analyzing...',
    complete: 'Complete',
    error: 'Error',
  };

  return (
    <span className={`px-3 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
