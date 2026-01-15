'use client';

import { useState } from 'react';
import { ChevronDown, RefreshCw, HelpCircle } from 'lucide-react';

// Supported exchanges organized by tier
const EXCHANGE_OPTIONS = [
  {
    tier: 'Tier 1 - Major Exchanges',
    exchanges: [
      { value: 'binance', label: 'Binance' },
      { value: 'coinbase', label: 'Coinbase' },
      { value: 'kraken', label: 'Kraken' },
      { value: 'kucoin', label: 'KuCoin' },
      { value: 'bybit', label: 'Bybit' },
    ],
  },
  {
    tier: 'Tier 2 - Beginner Friendly',
    exchanges: [
      { value: 'cashapp', label: 'Cash App' },
      { value: 'robinhood', label: 'Robinhood' },
      { value: 'paypal', label: 'PayPal' },
      { value: 'venmo', label: 'Venmo' },
    ],
  },
  {
    tier: 'Tier 3 - Power Users',
    exchanges: [
      { value: 'crypto.com', label: 'Crypto.com' },
      { value: 'gemini', label: 'Gemini' },
    ],
  },
  {
    tier: 'Tier 4 - Advanced',
    exchanges: [
      { value: 'ftx', label: 'FTX' },
      { value: 'bitfinex', label: 'Bitfinex' },
      { value: 'okx', label: 'OKX' },
    ],
  },
  {
    tier: 'Other',
    exchanges: [
      { value: 'generic', label: 'Generic CSV (Best Effort)' },
    ],
  },
];

interface ExchangeSelectorProps {
  onRetry: (exchangeName: string) => void;
  isRetrying: boolean;
  detectedColumns?: string[];
  suggestion?: string;
  analysis?: {
    has_date_column: boolean;
    has_amount_column: boolean;
    has_type_column: boolean;
  } | null;
  className?: string;
}

export function ExchangeSelector({
  onRetry,
  isRetrying,
  detectedColumns = [],
  suggestion = '',
  analysis = null,
  className = '',
}: ExchangeSelectorProps) {
  const [selectedExchange, setSelectedExchange] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

  const handleRetry = () => {
    if (selectedExchange && !isRetrying) {
      onRetry(selectedExchange);
    }
  };

  const selectedLabel = EXCHANGE_OPTIONS
    .flatMap((tier) => tier.exchanges)
    .find((e) => e.value === selectedExchange)?.label || 'Select exchange...';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-start gap-2">
        <HelpCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-slate-800">
            Auto-detection failed
          </p>
          <p className="text-xs text-slate-500 mt-1">
            We couldn&apos;t identify your CSV format automatically. Select your exchange below to retry processing.
          </p>
        </div>
      </div>

      {/* Column Analysis */}
      {analysis && (
        <div className="bg-slate-50 rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium text-slate-500">Column analysis:</p>
          <div className="flex flex-wrap gap-2">
            <span className={`px-2 py-1 text-xs rounded-full ${
              analysis.has_date_column
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {analysis.has_date_column ? '✓' : '✗'} Date column
            </span>
            <span className={`px-2 py-1 text-xs rounded-full ${
              analysis.has_amount_column
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {analysis.has_amount_column ? '✓' : '✗'} Amount column
            </span>
            <span className={`px-2 py-1 text-xs rounded-full ${
              analysis.has_type_column
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {analysis.has_type_column ? '✓' : '?'} Type column
            </span>
          </div>
          {suggestion && (
            <p className="text-xs text-slate-500 mt-2">{suggestion}</p>
          )}
        </div>
      )}

      {/* Detected columns hint */}
      {detectedColumns.length > 0 && (
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs font-medium text-slate-500 mb-2">Columns found in your file:</p>
          <div className="flex flex-wrap gap-1">
            {detectedColumns.slice(0, 10).map((col, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 text-xs rounded"
              >
                {col}
              </span>
            ))}
            {detectedColumns.length > 10 && (
              <span className="px-2 py-0.5 text-slate-400 text-xs">
                +{detectedColumns.length - 10} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Exchange Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isRetrying}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-lg text-left hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <span className={selectedExchange ? 'text-slate-800' : 'text-slate-400'}>
            {selectedLabel}
          </span>
          <ChevronDown
            className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {EXCHANGE_OPTIONS.map((tier) => (
              <div key={tier.tier}>
                <div className="px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide sticky top-0">
                  {tier.tier}
                </div>
                {tier.exchanges.map((exchange) => (
                  <button
                    key={exchange.value}
                    type="button"
                    onClick={() => {
                      setSelectedExchange(exchange.value);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-blue-50 transition-colors ${
                      selectedExchange === exchange.value
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-slate-700'
                    }`}
                  >
                    {exchange.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Retry Button */}
      <button
        type="button"
        onClick={handleRetry}
        disabled={!selectedExchange || isRetrying}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium rounded-lg hover:from-blue-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
      >
        {isRetrying ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            Retrying...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Retry with {selectedLabel !== 'Select exchange...' ? selectedLabel : 'Selected Exchange'}
          </>
        )}
      </button>

      {/* Help text */}
      <p className="text-xs text-slate-400 text-center">
        Not sure which exchange? Check where you downloaded the CSV file from.
      </p>
    </div>
  );
}
