'use client';

import { useState, useMemo, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Loader2, Sparkles, ChevronDown, TrendingUp, Calendar, Coins, Lightbulb, Shield, Search, FileCheck, Zap, Download } from 'lucide-react';
import { useJobContext } from '@/contexts/JobContext';
import { JobStatus } from '@/hooks/useJobPolling';
import { getJobInsights, AIInsights, retryJobWithExchange, getDownloadUrl, TaxSoftwareFormat } from '@/lib/upload-client';
import { ExchangeSelector } from './ExchangeSelector';
import { TaxSoftwareSelector } from './TaxSoftwareSelector';

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

// Processing steps for visual display
const PROCESSING_STEPS = [
  { id: 'upload', label: 'Upload', icon: FileCheck },
  { id: 'scan', label: 'Virus Scan', icon: Shield },
  { id: 'detect', label: 'Detect Format', icon: Search },
  { id: 'analyze', label: 'Analyze', icon: Zap },
];

export function AIInsightsPanel() {
  const { activeJob, isPolling, setActiveJob } = useJobContext();
  const [expandedPanel, setExpandedPanel] = useState<'exchange' | 'transactions' | 'flags' | 'ai' | null>(null);
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

  const detectedColumns = errorDetails.columns;

  // Handle retry with manual exchange selection
  const handleRetryWithExchange = async (exchangeName: string) => {
    if (!activeJob?.jobId) return;

    setIsRetrying(true);
    setRetryError(null);

    try {
      const result = await retryJobWithExchange(activeJob.jobId, exchangeName);
      // Re-trigger polling by setting the same job ID
      // This will cause the useJobPolling hook to start polling again
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
      // Create a temporary link and click it to trigger download
      // This is more reliable than window.open which can be blocked
      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.download = `${activeJob.jobId}_${format}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      const error = err as { message?: string };
      setDownloadError(error.message || 'Failed to get download URL');
    } finally {
      setIsDownloading(false);
    }
  };

  // Determine current step for progress indicator
  const getCurrentStep = () => {
    if (status === 'idle') return -1;
    if (status === 'detecting') return 1; // Virus scan / detect
    if (status === 'analyzing') return 3; // Analyze
    if (status === 'complete') return 4;
    if (status === 'error') return -1;
    return 0;
  };
  const currentStep = getCurrentStep();

  return (
    <div className="bg-[#0d2847]/80 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden">
      {/* Subtle glow effects */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-[60px]" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-[50px]" />

      <div className="flex items-center gap-2 mb-5 relative">
        <Sparkles className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-semibold text-white">AI Insights Panel</h2>
      </div>

      {/* Processing Steps Indicator */}
      {(isProcessing || isComplete) && (
        <div className="mb-5 relative">
          <div className="flex items-center justify-between">
            {PROCESSING_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isStepComplete = currentStep > index || isComplete;
              const isStepActive = currentStep === index && !isComplete;

              return (
                <div key={step.id} className="flex flex-col items-center flex-1">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                    ${isStepComplete ? 'bg-emerald-500 text-white' :
                      isStepActive ? 'bg-blue-500 text-white animate-pulse' :
                      'bg-slate-700 text-slate-400'}
                  `}>
                    {isStepComplete ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isStepActive ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={`text-xs mt-1 ${
                    isStepComplete ? 'text-emerald-400' :
                    isStepActive ? 'text-blue-400' :
                    'text-slate-500'
                  }`}>
                    {step.label}
                  </span>
                  {/* Connector line */}
                  {index < PROCESSING_STEPS.length - 1 && (
                    <div className="absolute top-5 h-0.5 bg-slate-700" style={{
                      left: `${(index + 1) * 25 - 10}%`,
                      width: '20%',
                    }}>
                      <div
                        className={`h-full transition-all duration-500 ${
                          isStepComplete || currentStep > index ? 'bg-emerald-500' : 'bg-transparent'
                        }`}
                        style={{ width: isStepComplete || currentStep > index ? '100%' : '0%' }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                exchange ? 'bg-emerald-100' : status === 'detecting' ? 'bg-blue-100' : 'bg-slate-100'
              }`}>
                {status === 'detecting' ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : exchange ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Search className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div>
                <p className="font-semibold text-slate-800">Exchange Detected</p>
                <p className={`text-sm ${exchange ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
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
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-slate-500 mb-1">Format</p>
                        <p className="text-sm font-semibold text-slate-800">{details.format}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-slate-500 mb-1">Date Format</p>
                        <p className="text-xs font-mono text-slate-800">{details.dateFormat}</p>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-slate-500 mb-1">Confidence</p>
                        <p className="text-sm font-bold text-emerald-600">{details.confidence}%</p>
                      </div>
                    </div>
                    {details.columns.length > 0 && (
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
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </button>

        {/* Transaction Analysis */}
        <button
          onClick={() => setExpandedPanel(expandedPanel === 'transactions' ? null : 'transactions')}
          className={`w-full bg-white rounded-xl p-4 shadow-lg transition-all text-left hover:shadow-xl ${
            status === 'analyzing' ? 'border-2 border-amber-400/50' : isComplete ? 'border-2 border-emerald-400/50' : ''
          } ${expandedPanel === 'transactions' ? 'ring-2 ring-blue-400/50' : ''}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isComplete ? 'bg-emerald-100' : status === 'analyzing' ? 'bg-amber-100' : 'bg-slate-100'
              }`}>
                {status === 'analyzing' ? (
                  <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                ) : isComplete ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <TrendingUp className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div>
                <p className="font-semibold text-slate-800">Transaction Analysis</p>
                <p className="text-sm text-slate-400">
                  {status === 'analyzing' ? 'Processing transactions...' :
                   isComplete ? `${transactionsAnalyzed} transactions processed` :
                   transactionsFound > 0 ? `${transactionsFound} found` : 'Waiting...'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isComplete && transactionsAnalyzed > 0 && (
                <span className="text-2xl font-bold text-emerald-600">{transactionsAnalyzed}</span>
              )}
              {(isComplete || transactionsFound > 0) && (
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedPanel === 'transactions' ? 'rotate-180' : ''}`} />
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isComplete ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' :
                status === 'analyzing' ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                'bg-gradient-to-r from-blue-400 to-blue-600'
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
                    <div className="grid grid-cols-4 gap-2">
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
                      <div className="flex items-center justify-between text-sm bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-500">Date Range</span>
                        </div>
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
                ? 'bg-emerald-50 border-2 border-emerald-400/50'
                : 'bg-white'
          } ${expandedPanel === 'flags' ? 'ring-2 ring-blue-400/50' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                taxFlags && taxFlags.count > 0
                  ? 'bg-orange-100'
                  : isComplete
                    ? 'bg-emerald-100'
                    : 'bg-slate-100'
              }`}>
                {taxFlags && taxFlags.count > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                ) : isComplete ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Shield className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div>
                <p className="font-semibold text-slate-800">Tax Flags</p>
                <p className={`text-sm ${
                  taxFlags && taxFlags.count > 0 ? 'text-orange-600' :
                  isComplete ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  {taxFlags && taxFlags.count > 0
                    ? `${taxFlags.count} issue${taxFlags.count > 1 ? 's' : ''} need attention`
                    : isComplete
                      ? 'No issues detected'
                      : 'Checking for issues...'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {taxFlags && taxFlags.count > 0 && (
                <span className="w-8 h-8 rounded-full bg-orange-500 text-white text-sm font-bold flex items-center justify-center">
                  {taxFlags.count}
                </span>
              )}
              {(taxFlags?.issues?.length || isComplete) && (
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedPanel === 'flags' ? 'rotate-180' : ''}`} />
              )}
            </div>
          </div>

          {/* Expanded Details */}
          {expandedPanel === 'flags' && (
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
              {taxFlags?.issues?.length ? (
                taxFlags.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm bg-white rounded-lg p-3">
                    <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{issue}</span>
                  </div>
                ))
              ) : isComplete ? (
                <div className="flex items-center gap-2 text-sm text-emerald-600 bg-white rounded-lg p-3">
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
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
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
                  <div className="bg-white/70 rounded-lg p-4">
                    <p className="text-sm text-slate-700 leading-relaxed">{aiInsights.ai_insights.summary}</p>
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {aiInsights.ai_insights.total_transactions && (
                    <div className="bg-white/70 rounded-lg p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-800">{aiInsights.ai_insights.total_transactions}</p>
                        <p className="text-xs text-slate-500">Total Transactions</p>
                      </div>
                    </div>
                  )}
                  {(aiInsights.ai_insights.estimated_taxable_events || aiInsights.ai_insights.estimated_events) && (
                    <div className="bg-white/70 rounded-lg p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-800">~{aiInsights.ai_insights.estimated_taxable_events || aiInsights.ai_insights.estimated_events}</p>
                        <p className="text-xs text-slate-500">Est. Taxable Events</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Top Assets */}
                {aiInsights.ai_insights.top_assets && aiInsights.ai_insights.top_assets.length > 0 && (
                  <div className="bg-white/70 rounded-lg p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1">
                      <Coins className="w-3 h-3" /> Top Assets
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {aiInsights.ai_insights.top_assets.slice(0, 5).map((asset, i) => (
                        <span key={i} className="px-3 py-1.5 bg-slate-100 rounded-full text-sm text-slate-700 font-medium">
                          {asset.asset} <span className="text-slate-400">({asset.count})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* What To Do Next */}
                {aiInsights.ai_insights.what_to_do_next && aiInsights.ai_insights.what_to_do_next.length > 0 && (
                  <div className="bg-white/70 rounded-lg p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" /> Next Steps
                    </p>
                    <div className="space-y-2">
                      {aiInsights.ai_insights.what_to_do_next.map((step: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-slate-700">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Data Notes */}
                {aiInsights.ai_insights.data_notes && aiInsights.ai_insights.data_notes.length > 0 && (
                  <div className="bg-white/70 rounded-lg p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Data Notes
                    </p>
                    <div className="space-y-2">
                      {aiInsights.ai_insights.data_notes.map((note: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                          <span className="text-slate-600">{note}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Legacy: Tax Tips (backwards compatibility) */}
                {!aiInsights.ai_insights.what_to_do_next && aiInsights.ai_insights.tax_tips && aiInsights.ai_insights.tax_tips.length > 0 && (
                  <div className="bg-white/70 rounded-lg p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" /> Tips
                    </p>
                    <div className="space-y-2">
                      {aiInsights.ai_insights.tax_tips.map((tip: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-slate-700">{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Model Info */}
                {aiInsights.model && (
                  <div className="text-xs text-slate-400 pt-2 border-t border-indigo-100 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Powered by {aiInsights.provider === 'anthropic' ? 'Claude' : 'Gemini'} ({aiInsights.model})
                  </div>
                )}
              </div>
            )}

            {/* AI Error State */}
            {expandedPanel === 'ai' && aiInsights?.ai_error && (
              <div className="mt-4 pt-4 border-t border-indigo-200">
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4" />
                  <span>AI analysis unavailable: {aiInsights.ai_error}</span>
                </div>
              </div>
            )}
          </button>
        )}

        {/* Download Section - Shows when job is complete */}
        {isComplete && (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 shadow-lg border-2 border-emerald-400/30">
            <TaxSoftwareSelector
              onDownload={handleDownload}
              isDownloading={isDownloading}
            />
            {downloadError && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{downloadError}</p>
              </div>
            )}
          </div>
        )}

        {/* Error State - Detection Failure with Exchange Selector */}
        {isDetectionFailure && (
          <div className="bg-amber-50 rounded-xl p-4 shadow-lg border-2 border-amber-400/50">
            <ExchangeSelector
              onRetry={handleRetryWithExchange}
              isRetrying={isRetrying}
              detectedColumns={detectedColumns}
              suggestion={errorDetails.suggestion}
              analysis={errorDetails.analysis}
            />
            {retryError && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{retryError}</p>
              </div>
            )}
          </div>
        )}

        {/* Error State - Other Errors */}
        {hasError && error && !isDetectionFailure && (
          <div className="bg-red-50 rounded-xl p-4 shadow-lg border-2 border-red-400/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Processing Error</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
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

      {/* Bottom info - Real-time status updates */}
      <div className="mt-5 pt-4 border-t border-white/10 relative">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className={`w-2 h-2 rounded-full ${
            hasError ? 'bg-red-400' : isProcessing ? 'bg-blue-400 animate-pulse' : isComplete ? 'bg-emerald-400' : 'bg-slate-500'
          }`} />
          <span>
            {hasError
              ? `Processing failed: ${error || 'Unknown error'}`
              : status === 'detecting'
                ? 'Virus scan active • Validating file format...'
                : status === 'analyzing'
                  ? `Analyzing transactions${transactionsFound > 0 ? ` (${transactionsFound} found)` : ''}...`
                  : isComplete
                    ? `Analysis complete${transactionsAnalyzed > 0 ? ` - ${transactionsAnalyzed} transactions processed` : ''}${aiInsights?.tier ? ` (${aiInsights.tier} tier)` : ''}`
                    : 'Upload a file to begin processing'}
          </span>
        </div>
        {isProcessing && (
          <div className="mt-2 text-xs text-slate-500">
            Live updates every 2.5 seconds
          </div>
        )}
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
