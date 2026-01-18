'use client';

import { useState, useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

export type LogLevel = 'INFO' | 'WARN' | 'FIX' | 'ERROR' | 'SUCCESS';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: string;
}

interface ProcessingTerminalProps {
  isProcessing: boolean;
  exchange?: string;
  transactionCount?: number;
  warnings?: string[];
  fixes?: string[];
  errors?: string[];
  onComplete?: () => void;
}

// Simulated processing log messages based on actual parsing operations
const generateProcessingLogs = (
  exchange?: string,
  transactionCount?: number,
  warnings?: string[],
  fixes?: string[],
): LogEntry[] => {
  const logs: LogEntry[] = [];
  let time = 0;

  const addLog = (level: LogLevel, message: string, details?: string) => {
    const seconds = Math.floor(time / 100);
    const centiseconds = time % 100;
    logs.push({
      timestamp: `00:${seconds.toString().padStart(2, '0')}`,
      level,
      message,
      details,
    });
    time += Math.floor(Math.random() * 150) + 50; // 50-200 "time units"
  };

  // Initial startup
  addLog('INFO', 'Initializing CSV parser engine...');

  // Header detection
  const headers = exchange
    ? getExchangeHeaders(exchange)
    : ['Date', 'Type', 'Amount', 'Currency', 'Fee'];
  addLog('INFO', `Detecting headers: [${headers.join(', ')}]`);

  // Simulated warnings and fixes
  const warningMessages = warnings?.length ? warnings : [
    { row: 42, issue: 'Timestamp format mismatch (ISO-8601 vs Unix)', fix: 'Normalized to UTC standard' },
    { row: 105, issue: 'Missing "Fee Currency" value', fix: 'Inferred "USD" from context' },
    { row: 312, issue: 'Duplicate Transaction ID detected', fix: null },
  ];

  warningMessages.forEach((w: any, i) => {
    if (typeof w === 'string') {
      addLog('WARN', w);
    } else {
      addLog('WARN', `Row ${w.row}: ${w.issue}`);
      if (w.fix) {
        addLog('FIX', `>> FIXED: ${w.fix}`);
      }
    }
  });

  // Processing transactions
  if (transactionCount && transactionCount > 0) {
    addLog('INFO', `Processing ${transactionCount} transactions...`);
    addLog('INFO', 'Validating transaction types...');
    addLog('INFO', 'Calculating fee totals...');
  }

  // Completion
  addLog('SUCCESS', `Analysis complete. ${transactionCount || 0} transactions processed.`);

  return logs;
};

const getExchangeHeaders = (exchange: string): string[] => {
  const headerMap: Record<string, string[]> = {
    'Binance': ['Date(UTC)', 'Pair', 'Side', 'Price', 'Executed', 'Amount', 'Fee'],
    'Coinbase': ['Timestamp', 'Transaction Type', 'Asset', 'Quantity', 'Spot Price', 'Total'],
    'Kraken': ['txid', 'time', 'type', 'asset', 'amount', 'fee', 'balance'],
    'Gemini': ['Date', 'Time', 'Type', 'Symbol', 'Amount', 'Fee', 'Balance'],
    'Crypto.com': ['Timestamp', 'Transaction Description', 'Currency', 'Amount', 'Native Amount'],
  };
  return headerMap[exchange] || ['Date', 'Type', 'Sent', 'Received', 'Fee'];
};

const levelColors: Record<LogLevel, string> = {
  INFO: 'text-blue-400',
  WARN: 'text-yellow-400',
  FIX: 'text-emerald-400',
  ERROR: 'text-red-400',
  SUCCESS: 'text-emerald-400',
};

const levelBrackets: Record<LogLevel, string> = {
  INFO: 'text-blue-500',
  WARN: 'text-yellow-500',
  FIX: 'text-emerald-500',
  ERROR: 'text-red-500',
  SUCCESS: 'text-emerald-500',
};

export function ProcessingTerminal({
  isProcessing,
  exchange,
  transactionCount,
  warnings,
  fixes,
  errors,
  onComplete,
}: ProcessingTerminalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  // Generate logs when processing starts
  useEffect(() => {
    if (isProcessing && !hasStarted.current) {
      hasStarted.current = true;
      const generatedLogs = generateProcessingLogs(exchange, transactionCount, warnings, fixes);
      setAllLogs(generatedLogs);
      setLogs([]);
      setCurrentIndex(0);
    }
    // Don't reset hasStarted when processing stops - keep the logs visible
  }, [isProcessing, exchange, transactionCount, warnings, fixes]);

  // Animate log entries appearing one by one
  useEffect(() => {
    if (currentIndex < allLogs.length) {
      const delay = currentIndex === 0 ? 500 : Math.random() * 400 + 200; // 200-600ms between entries
      const timer = setTimeout(() => {
        setLogs(prev => [...prev, allLogs[currentIndex]]);
        setCurrentIndex(prev => prev + 1);
      }, delay);
      return () => clearTimeout(timer);
    } else if (currentIndex > 0 && currentIndex === allLogs.length) {
      // All logs shown
      onComplete?.();
    }
  }, [currentIndex, allLogs, onComplete]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isProcessing && logs.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#0a1628] rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Terminal Header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border-b border-slate-700/50">
        <Terminal className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-mono text-slate-300">taxformatter_engine_v2.0.exe</span>
      </div>

      {/* Terminal Content */}
      <div
        ref={terminalRef}
        className="p-4 font-mono text-sm max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
      >
        {logs.map((log, i) => (
          <div key={i} className="flex gap-4 py-0.5 animate-fadeIn">
            <span className="text-slate-500 w-12 flex-shrink-0">{log.timestamp}</span>
            <span className={`${levelBrackets[log.level]} flex-shrink-0`}>
              [{log.level}]
            </span>
            <span className={`${levelColors[log.level]} ${log.level === 'FIX' ? 'pl-4' : ''}`}>
              {log.message}
            </span>
          </div>
        ))}

        {/* Blinking cursor */}
        {isProcessing && currentIndex < allLogs.length && (
          <div className="flex gap-4 py-0.5">
            <span className="text-slate-500 w-12 flex-shrink-0"></span>
            <span className="text-emerald-400 animate-pulse">{'>'}</span>
            <span className="w-2 h-4 bg-emerald-400 animate-blink"></span>
          </div>
        )}
      </div>
    </div>
  );
}
