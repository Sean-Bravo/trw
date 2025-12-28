'use client';

import React, { useState, useEffect } from 'react';
import { Container } from '../layout/Container';
import { Button } from '../ui/Button';
import { 
  Users, 
  UploadCloud, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  BrainCircuit,
  ArrowRight
} from 'lucide-react';

export function Hero() {
  // State to simulate the app flow: 'idle' | 'analyzing' | 'complete'
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);

  // Simulation Logic
  const handleUpload = () => {
    if (status !== 'idle') return;
    setStatus('analyzing');
    setProgress(0);
    
    // Simulate progress bar (2.5 seconds)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setStatus('complete');
          return 100;
        }
        return prev + 2;
      });
    }, 50);
  };

  const reset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStatus('idle');
    setProgress(0);
  };

  return (
    <section className="bg-gradient-to-b from-white to-[#f9fafb] py-24 sm:py-32 relative overflow-hidden">
      {/* --- BACKGROUND DECORATION --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-20 right-0 w-96 h-96 bg-[#3b82f6] rounded-full opacity-8 blur-3xl animate-float"></div>
        <div className="absolute bottom-20 left-0 w-96 h-96 bg-[#1a365d] rounded-full opacity-8 blur-3xl animate-float animation-delay-300"></div>
        <div className="absolute top-40 left-1/4 w-72 h-72 bg-[#059669] rounded-full opacity-5 blur-3xl animate-float animation-delay-500"></div>
        <div className="absolute bottom-40 right-1/4 w-80 h-80 bg-[#3b82f6] rounded-full opacity-6 blur-2xl animate-float animation-delay-200"></div>
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(59,130,246,0.03)" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(%23grid)" /></svg>')` }}></div>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#3b82f6] to-transparent opacity-20"></div>
      </div>

      <Container>
        <div className="max-w-7xl mx-auto">
          
          {/* --- HEADER SECTION --- */}
          <div className="text-center mb-16">
            <div className="mb-6 flex justify-center">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-[#3b82f6]/10 to-[#1a365d]/10 backdrop-blur-sm border border-[#3b82f6]/20 text-[#1a365d] rounded-full text-xs font-semibold uppercase tracking-wider hover:border-[#3b82f6]/40 hover:shadow-[0_4px_12px_rgba(59,130,246,0.15)] transition-all duration-300 animate-slide-up">
                
                {/* REPLACED SVG WITH GLOWING GREEN DOT */}
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                
                AI-Powered CSV Repair
              </div>
            </div>

            <h1 className="font-poppins text-5xl sm:text-6xl md:text-7xl font-bold text-[#1a365d] leading-tight tracking-tight mb-6 animate-slide-up animation-delay-100">
              Fix Your Crypto Taxes
              <br />
              <span className="bg-gradient-to-r from-[#3b82f6] via-[#2563eb] to-[#1a365d] bg-clip-text text-transparent animate-pulse-subtle">
                in 30 Seconds
              </span>
            </h1>

            <p className="text-xl text-[#4b5563] max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up animation-delay-200">
              Broken CSV from your exchange? We clean it, format it, and make it ready for any tax platform. No manual editing required.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 animate-slide-up animation-delay-300">
              <Button variant="primary" href="#start" showArrow className="text-base px-8 py-4 h-14 hover:shadow-[0_12px_32px_rgba(59,130,246,0.3)] hover:-translate-y-0.5 transition-all duration-300">
                Start Free Audit
              </Button>
              <Button variant="secondary" href="#pricing" className="text-base px-8 py-4 h-14 hover:shadow-[0_12px_32px_rgba(26,54,93,0.2)] hover:-translate-y-0.5 transition-all duration-300">
                View Pricing
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-[#6b7280] mb-4 animate-slide-up animation-delay-500">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3b82f6]/5 border border-[#3b82f6]/10 hover:border-[#3b82f6]/30 hover:bg-[#3b82f6]/10 transition-all duration-300">
                <Users className="h-5 w-5 text-[#3b82f6]" />
                <span className="font-semibold text-[#1a365d]">10,000+ users</span>
              </div>
            </div>
          </div>

          {/* --- HERO INTERACTIVE SECTION (Command Center) --- */}
          <div className="mt-16 grid lg:grid-cols-12 gap-8 items-stretch max-w-6xl mx-auto">
            
            {/* LEFT COLUMN: Input Reactor (Drag & Drop) */}
            <div className="lg:col-span-7 flex flex-col h-full min-h-[400px]">
              <div 
                onClick={handleUpload}
                className={`
                  relative flex-1 rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden flex flex-col items-center justify-center p-8 sm:p-12
                  ${status === 'idle' 
                    ? 'border-slate-300 bg-white hover:border-blue-500 hover:bg-blue-50/30 hover:shadow-xl shadow-sm' 
                    : 'border-blue-500/30 bg-blue-50/20'
                  }
                `}
              >
                {/* IDLE STATE */}
                {status === 'idle' && (
                  <div className="text-center space-y-6 animate-in fade-in zoom-in duration-300">
                    <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 shadow-inner">
                      <UploadCloud className="w-10 h-10" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-800 font-poppins mb-2">Drop your CSV file here</h3>
                      <p className="text-slate-500 text-lg">or click to browse</p>
                    </div>
                    <div className="flex gap-2 justify-center pt-4 opacity-60">
                      {['Coinbase', 'Binance', 'Kraken', 'KuCoin'].map(ex => (
                        <span key={ex} className="px-3 py-1 bg-slate-100 rounded-md text-xs font-medium text-slate-500 border border-slate-200">
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* PROCESSING STATE (Replaces the drag drop UI) */}
                {(status === 'analyzing' || status === 'complete') && (
                  <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-xl border border-blue-100 animate-in slide-in-from-bottom-4 duration-500 relative overflow-hidden">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-green-100 text-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FileText className="w-7 h-7" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 truncate">binance_trade_history.csv</p>
                        <p className="text-sm text-slate-500 flex items-center gap-2">
                          {status === 'analyzing' ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                              Processing...
                            </>
                          ) : (
                            <span className="text-green-600 font-medium">Ready for export</span>
                          )}
                        </p>
                      </div>
                      {status === 'complete' && (
                         <button onClick={reset} className="text-sm text-blue-600 font-medium hover:underline">
                           Reset
                         </button>
                      )}
                    </div>
                    
                    {/* Fake Progress Bar inside the card */}
                    {status === 'analyzing' && (
                       <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-blue-500 transition-all duration-300 ease-out"
                           style={{ width: `${progress}%` }}
                         />
                       </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Nano Banana AI Panel (Dark Mode) */}
            <div className="lg:col-span-5 h-full min-h-[400px]">
              <div className="bg-[#1a365d] p-6 rounded-[2rem] shadow-2xl relative overflow-hidden font-poppins h-full flex flex-col">
                
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

                {/* Header */}
                <div className="flex items-center justify-between mb-8 relative z-10">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <h2 className="text-white text-lg font-bold tracking-wide">AI Insights</h2>
                  </div>
                  <div className={`
                    bg-blue-800/50 text-blue-200 text-xs font-medium px-3 py-1 rounded-full border border-blue-700/50 transition-opacity duration-300
                    ${status === 'analyzing' ? 'opacity-100 animate-pulse' : 'opacity-0'}
                  `}>
                    Live Analysis...
                  </div>
                </div>

                {/* Cards Container */}
                <div className="flex-1 space-y-4 relative z-10 flex flex-col justify-center">

                  {/* 1. SUCCESS CARD (Binance) */}
                  <div className={`
                    bg-white rounded-2xl p-4 shadow-lg transition-all duration-500 transform
                    ${status !== 'idle' 
                      ? 'translate-y-0 opacity-100' 
                      : 'translate-y-0 opacity-40 blur-[1px]'
                    } 
                  `}>
                    <div className="flex items-start gap-4">
                      <div className="bg-green-100 p-2.5 rounded-xl flex-shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-bold text-slate-800 text-sm">Exchange Detected</h3>
                          <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">CONFIRMED</span>
                        </div>
                        <p className="text-xl font-extrabold text-slate-900">Binance</p>
                      </div>
                    </div>
                  </div>

                  {/* 2. ACTIVE CARD (Analyzing) */}
                  <div className={`
                    bg-white rounded-2xl p-5 shadow-[0_0_30px_rgba(250,204,21,0.2)] transition-all duration-500 delay-100 transform border-2
                    ${status === 'analyzing' ? 'border-yellow-400 scale-105 z-20 opacity-100' : 'border-transparent scale-100'}
                    ${status === 'idle' ? 'opacity-40 blur-[1px]' : ''} 
                    ${status === 'complete' ? 'opacity-100' : ''}
                  `}>
                    <div className="flex items-start gap-4 mb-3">
                      <div className={`p-2.5 rounded-xl flex-shrink-0 ${status === 'analyzing' ? 'bg-yellow-100' : 'bg-slate-100'}`}>
                        <BrainCircuit className={`w-6 h-6 ${status === 'analyzing' ? 'text-yellow-600 animate-pulse' : 'text-slate-400'}`} />
                      </div>
                      <div className="w-full">
                        <h3 className="font-bold text-slate-800 text-sm mb-1">Analyzing Transactions...</h3>
                        <p className="text-2xl font-extrabold text-slate-900">
                          {status === 'idle' ? '0' : Math.floor(progress * 8.47)} 
                          <span className="text-sm font-semibold text-slate-400 ml-1">found</span>
                        </p>
                      </div>
                    </div>
                    {/* Chunky Gradient Bar */}
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden relative">
                      <div 
                        className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-blue-500 transition-all duration-100"
                        style={{ width: `${status === 'idle' ? 0 : progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* 3. ALERT CARD (Wash Sales) */}
                  <div className={`
                    bg-[#ffedd5] rounded-2xl p-4 shadow-lg transition-all duration-500 delay-200 transform border border-orange-200
                    ${status === 'complete' 
                      ? 'translate-y-0 opacity-100' 
                      : 'translate-y-0 opacity-40 blur-[1px]'
                    } 
                  `}>
                    <div className="flex items-center gap-4">
                      <div className="bg-orange-100 p-2.5 rounded-xl flex-shrink-0">
                        <AlertTriangle className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-orange-900 text-sm">Tax Flag</h3>
                        <p className="text-lg font-extrabold text-orange-950">Wash Sales Detected</p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Footer text */}
                <div className="mt-8 text-center">
                  <p className="text-blue-200/60 text-xs font-mono">AI ENGINE V2.4 ONLINE</p>
                </div>
                
              </div>
            </div>

          </div>
        </div>
      </Container>
    </section>
  );
}