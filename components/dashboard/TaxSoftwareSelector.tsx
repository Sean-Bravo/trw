'use client';

import { useState } from 'react';
import { ChevronDown, Download, FileText, Check } from 'lucide-react';

// Supported tax software options
const TAX_SOFTWARE_OPTIONS = [
  {
    value: 'turbotax',
    label: 'TurboTax',
    description: 'Most popular tax software in the US',
  },
  {
    value: 'koinly',
    label: 'Koinly',
    description: 'Specialized crypto tax platform',
  },
  {
    value: 'coinledger',
    label: 'CoinLedger',
    description: 'Crypto-focused tax reporting',
  },
  {
    value: 'zenledger',
    label: 'ZenLedger',
    description: 'Comprehensive crypto tax platform',
  },
];

interface TaxSoftwareSelectorProps {
  onDownload: (format: string) => void;
  isDownloading: boolean;
  className?: string;
}

export function TaxSoftwareSelector({
  onDownload,
  isDownloading,
  className = '',
}: TaxSoftwareSelectorProps) {
  const [selectedFormat, setSelectedFormat] = useState<string>('turbotax');
  const [isOpen, setIsOpen] = useState(false);

  const handleDownload = () => {
    if (selectedFormat && !isDownloading) {
      onDownload(selectedFormat);
    }
  };

  const selectedOption = TAX_SOFTWARE_OPTIONS.find((opt) => opt.value === selectedFormat);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-start gap-2">
        <FileText className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-slate-800">
            Choose your tax software
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Select the format that matches your tax software for easy import.
          </p>
        </div>
      </div>

      {/* Tax Software Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isDownloading}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-lg text-left hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <span className="text-slate-800 font-medium">
            {selectedOption?.label}
          </span>
          <ChevronDown
            className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
            {TAX_SOFTWARE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSelectedFormat(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors ${
                  selectedFormat === option.value
                    ? 'bg-emerald-50'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-sm font-medium ${
                      selectedFormat === option.value
                        ? 'text-emerald-700'
                        : 'text-slate-700'
                    }`}>
                      {option.label}
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {option.description}
                    </p>
                  </div>
                  {selectedFormat === option.value && (
                    <Check className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Download Button */}
      <button
        type="button"
        onClick={handleDownload}
        disabled={!selectedFormat || isDownloading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium rounded-lg hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20"
      >
        {isDownloading ? (
          <>
            <Download className="w-4 h-4 animate-bounce" />
            Preparing download...
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Download for {selectedOption?.label}
          </>
        )}
      </button>

      {/* Format Info */}
      <div className="bg-slate-50 rounded-lg p-3">
        <p className="text-xs text-slate-500">
          {selectedFormat === 'koinly' && (
            <>Your file will be formatted for direct import into Koinly. Includes all transaction types, fees, and labels.</>
          )}
          {selectedFormat === 'turbotax' && (
            <>Formatted for TurboTax import. Includes Date Sold, Date Acquired, Proceeds, and Cost Basis columns.</>
          )}
          {selectedFormat === 'coinledger' && (
            <>Optimized for CoinLedger import. Includes transaction types (BUY, SELL, TRADE, etc.) and proper formatting.</>
          )}
          {selectedFormat === 'zenledger' && (
            <>ZenLedger-compatible format with Timestamp, Type, In/Out currencies and amounts.</>
          )}
        </p>
      </div>
    </div>
  );
}
