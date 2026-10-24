'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

// Supported tax software options
const TAX_SOFTWARE_OPTIONS = [
  { value: 'turbotax', label: 'TurboTax' },
  { value: 'koinly', label: 'Koinly' },
  { value: 'coinledger', label: 'CoinLedger' },
  { value: 'zenledger', label: 'ZenLedger' },
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
  const selectedLabel = TAX_SOFTWARE_OPTIONS.find((o) => o.value === selectedFormat)?.label ?? '';

  const handleDownload = () => {
    if (selectedFormat && !isDownloading) {
      onDownload(selectedFormat);
    }
  };

  return (
    <div className={`flex flex-wrap items-end gap-3 ${className}`}>
      <div className="flex flex-col gap-1.5 flex-[1_1_200px]">
        <label htmlFor="export-format" className="text-sm font-medium text-app-text">
          Export for
        </label>
        <select
          id="export-format"
          value={selectedFormat}
          onChange={(e) => setSelectedFormat(e.target.value)}
          disabled={isDownloading}
          className="min-h-11 rounded-lg border border-app-border-strong bg-app-card px-3 text-app-text focus:outline-none focus:ring-2 focus:ring-primary-400"
        >
          {TAX_SOFTWARE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        aria-label={isDownloading ? 'Preparing download' : `Download CSV for ${selectedLabel}`}
        className="inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-lg bg-primary-500 text-white font-semibold hover:bg-primary-600 disabled:opacity-60 disabled:cursor-wait transition-colors"
      >
        {isDownloading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            Preparing download…
          </>
        ) : (
          <>
            <Download className="w-4 h-4" aria-hidden="true" />
            Download CSV
          </>
        )}
      </button>
    </div>
  );
}
