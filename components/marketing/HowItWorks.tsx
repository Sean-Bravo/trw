'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Container } from '../layout/Container';
import { Upload, FileText, CheckCircle2, Download, Terminal, RefreshCw, ChevronRight, Cpu } from 'lucide-react';

const LOG_SEQUENCE = [
  { type: 'info', text: 'Initializing CSV parser engine...', delay: 400 },
  { type: 'info', text: 'Detecting headers: [Date, Type, Sent, Received, Fee]', delay: 800 },
  { type: 'warn', text: 'Row 42: Timestamp format mismatch (ISO-8601 vs Unix)', delay: 1400 },
  { type: 'success', text: '>> FIXED: Normalized to UTC standard', delay: 1800 },
  { type: 'warn', text: 'Row 105: Missing "Fee Currency" value', delay: 2400 },
  { type: 'success', text: '>> FIXED: Inferred "USD" from context', delay: 2800 },
  { type: 'warn', text: 'Row 312: Duplicate Transaction ID detected', delay: 3400 },
  { type: 'success', text: '>> FIXED: Deduped record', delay: 3800 },
  { type: 'info', text: 'Validating against Koinly schema...', delay: 4500 },
  { type: 'done', text: 'Processing Complete. File ready.', delay: 5000 },
];

type SimulationState = 'idle' | 'uploading' | 'processing' | 'complete';

export function HowItWorks() {
  const [state, setState] = useState<SimulationState>('idle');
  const [logs, setLogs] = useState<typeof LOG_SEQUENCE>([]);
  const [progress, setProgress] = useState(0);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs ONLY when logs are added (prevents jump on reset)
  useEffect(() => {
    if (logs.length > 0 && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [logs]);

  const startSimulation = () => {
    setState('uploading');
    setProgress(0);
    setLogs([]);

    // 1. Simulate Upload (1.5s)
    let uploadInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(uploadInterval);
          startProcessing();
          return 100;
        }
        return prev + 5;
      });
    }, 50);
  };

  const startProcessing = () => {
    setState('processing');
    
    // 2. Run the Log Sequence
    LOG_SEQUENCE.forEach((log) => {
      setTimeout(() => {
        setLogs((prev) => [...prev, log]);
        if (log.type === 'done') {
          setState('complete');
        }
      }, log.delay);
    });
  };

  const reset = () => {
    setState('idle');
    setLogs([]);
    setProgress(0);
  };

  return (
    <section id="how-it-works" className="py-24 bg-slate-50 dark:bg-slate-950 border-y border-slate-200 dark:border-slate-900 overflow-hidden">
      <Container>
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl">
            <h2 className="font-poppins text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-6">
              See the engine in action.
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              We don't just "format" your file. We parse, validate, and repair every single row. Watch how TaxFormatter cleans a messy Coinbase export in real-time.
            </p>
          </div>
          
          {/* Controls */}
          <div>
            {state === 'idle' ? (
              <button
                onClick={startSimulation}
                className="group flex items-center gap-3 px-6 py-3 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white rounded-full font-semibold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                <Upload className="w-5 h-5" />
                Run Simulation
              </button>
            ) : (
              <button
                onClick={reset}
                disabled={state !== 'complete'}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${
                  state === 'complete' 
                    ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm cursor-pointer' 
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${state !== 'complete' ? 'animate-spin' : ''}`} />
                {state === 'complete' ? 'Reset Demo' : 'Running...'}
              </button>
            )}
          </div>
        </div>

        {/* The "Machine" Window */}
        <div className="relative mx-auto max-w-5xl bg-slate-900 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-slate-800">
          
          {/* Window Title Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
              <Terminal className="w-3 h-3" />
              taxformatter_engine_v2.0.exe
            </div>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>

          <div className="grid md:grid-cols-2 min-h-[420px]">
            
            {/* Left Panel: The "Visual" State */}
            <div className="p-8 md:p-12 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-700 bg-slate-900/50 relative">
              
              {/* Background Grid */}
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

              {state === 'idle' && (
                <div 
                  onClick={startSimulation}
                  className="relative z-10 w-full max-w-sm py-12 border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center gap-4 hover:border-[var(--color-primary-500)] hover:bg-slate-800/50 transition-all cursor-pointer group animate-fade-in"
                >
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-[var(--color-primary-400)]" />
                  </div>
                  <div className="text-center">
                    <p className="text-slate-300 font-medium">Click to upload CSV</p>
                    <p className="text-sm text-slate-500">Simulate file processing</p>
                  </div>
                </div>
              )}

              {state === 'uploading' && (
                <div className="relative z-10 w-full max-w-sm text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-800 flex items-center justify-center shadow-xl border border-slate-700">
                    <FileText className="w-10 h-10 text-[var(--color-primary-400)] animate-pulse" />
                  </div>
                  <h3 className="text-white text-lg font-medium mb-2">Uploading coinbase_export.csv</h3>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--color-primary-500)] transition-all duration-100 ease-out" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-slate-400 text-sm mt-2">{progress}% Complete</p>
                </div>
              )}

              {state === 'processing' && (
                <div className="relative z-10 w-full max-w-sm text-center">
                  <div className="relative w-24 h-24 mx-auto mb-6">
                    <div className="absolute inset-0 border-4 border-[var(--color-accent-500)]/30 rounded-full animate-ping" />
                    <div className="absolute inset-0 border-4 border-t-[var(--color-accent-500)] border-r-[var(--color-accent-500)] border-b-transparent border-l-transparent rounded-full animate-spin" />
                    <div className="absolute inset-2 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 shadow-inner">
                      <Cpu className="w-10 h-10 text-[var(--color-accent-400)]" />
                    </div>
                  </div>
                  <h3 className="text-white text-lg font-medium mb-1">AI Analysis Running...</h3>
                  <p className="text-slate-400 text-sm">Detecting patterns & anomalies</p>
                </div>
              )}

              {state === 'complete' && (
                <div className="relative z-10 w-full max-w-sm text-center animate-fade-in-up">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h3 className="text-white text-2xl font-bold mb-2">File Ready!</h3>
                  <p className="text-slate-400 mb-6">3 issues fixed. 100% compliant.</p>
                  
                  <button className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-emerald-900/20">
                    <Download className="w-4 h-4" />
                    Download Formatted CSV
                  </button>
                </div>
              )}
            </div>

            {/* Right Panel: The "Brain" (Logs) */}
            <div className="bg-black/40 p-6 font-mono text-sm overflow-y-auto max-h-[420px] flex flex-col relative">
              
              {/* Scan Line Effect */}
              {state === 'processing' && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 shadow-[0_0_20px_rgba(255,255,255,0.1)] z-10 animate-scan" />
              )}

              {state === 'idle' ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                  <Terminal className="w-12 h-12 mb-4 opacity-20" />
                  <p>System Idle.</p>
                  <p className="text-xs">Waiting for input stream...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log, idx) => (
                    <div key={idx} className="animate-fade-in-left flex items-start gap-3">
                      <span className="text-slate-600 text-xs mt-0.5">
                        {`00:${String(idx * 2).padStart(2, '0')}`}
                      </span>
                      <div>
                        {log.type === 'info' && (
                          <span className="text-blue-400">[INFO]</span>
                        )}
                        {log.type === 'warn' && (
                          <span className="text-amber-400">[WARN]</span>
                        )}
                        {log.type === 'success' && (
                          <span className="text-emerald-400">[FIX]</span>
                        )}
                        {log.type === 'done' && (
                          <span className="text-[var(--color-accent-400)] font-bold">[DONE]</span>
                        )}
                        <span className={`ml-2 ${
                          log.type === 'warn' ? 'text-amber-100' :
                          log.type === 'success' ? 'text-emerald-100 font-medium' :
                          'text-slate-300'
                        }`}>
                          {log.text}
                        </span>
                      </div>
                    </div>
                  ))}
                  {state === 'processing' && (
                    <div className="flex items-center gap-2 text-slate-500 animate-pulse mt-4">
                      <ChevronRight className="w-3 h-3" />
                      <span className="w-2 h-4 bg-slate-500 block" />
                    </div>
                  )}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>

          </div>
        </div>
      </Container>
    </section>
  );
}