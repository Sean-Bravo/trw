'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Loader2, Sparkles } from 'lucide-react';

export type InsightStatus = 'idle' | 'detecting' | 'analyzing' | 'complete' | 'error';

export interface AIInsightsState {
  status: InsightStatus;
  exchange?: string;
  transactionsFound?: number;
  transactionsAnalyzed?: number;
  progress?: number;
  taxFlags?: {
    count: number;
    issues: string[];
  };
  error?: string;
}

interface AIInsightsPanelProps {
  state?: AIInsightsState;
}

const defaultState: AIInsightsState = {
  status: 'idle',
  transactionsFound: 0,
  transactionsAnalyzed: 0,
  progress: 0,
};

export function AIInsightsPanel({ state = defaultState }: AIInsightsPanelProps) {
  const { status, exchange, transactionsFound = 0, transactionsAnalyzed = 0, progress = 0, taxFlags, error } = state;

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
        <div className={`bg-white rounded-xl p-4 flex items-center justify-between shadow-lg transition-all ${
          isComplete && exchange ? 'border-2 border-emerald-400/50' : ''
        }`}>
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
              <p className="text-slate-600 text-sm">
                {status === 'detecting' ? 'Scanning file...' : exchange || 'Waiting for upload...'}
              </p>
            </div>
          </div>
          <StatusBadge status={exchange ? 'complete' : status} />
        </div>

        {/* Analyzing Transactions */}
        <div className={`bg-white rounded-xl p-4 shadow-lg transition-all ${
          status === 'analyzing' ? 'border-2 border-amber-400/50' : isComplete ? 'border-2 border-emerald-400/50' : ''
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {status === 'analyzing' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
              <p className="font-semibold text-slate-800">
                {status === 'analyzing' ? 'Analyzing Transactions...' : 'Transaction Analysis'}
              </p>
            </div>
            <span className="text-slate-500 text-sm">
              {isComplete ? `${transactionsAnalyzed} analyzed` : `${transactionsFound} found`}
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isComplete ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-blue-400 to-blue-600'
              }`}
              style={{ width: `${isComplete ? 100 : progress}%` }}
            />
          </div>
        </div>

        {/* Tax Flags */}
        <div className={`rounded-xl p-4 flex items-center gap-3 shadow-lg transition-all ${
          taxFlags && taxFlags.count > 0
            ? 'bg-orange-50 border-2 border-orange-400/50'
            : isComplete
              ? 'bg-emerald-50'
              : 'bg-orange-50'
        }`}>
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
            <p className="text-slate-500 text-sm">
              {taxFlags && taxFlags.count > 0
                ? `${taxFlags.count} issue${taxFlags.count > 1 ? 's' : ''} found`
                : isComplete
                  ? 'No issues detected'
                  : 'No issues detected yet'}
            </p>
          </div>
        </div>

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
                ? 'Analysis complete'
                : 'Panels update in real-time during processing'}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: InsightStatus | 'complete' }) {
  const styles = {
    idle: 'bg-slate-100 text-slate-500',
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
