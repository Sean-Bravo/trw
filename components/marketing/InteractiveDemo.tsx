'use client';

import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

type DemoState = 'idle' | 'scanning' | 'fixing' | 'complete';

export function InteractiveDemo() {
  const [state, setState] = useState<DemoState>('idle');
  const [progress, setProgress] = useState(0);
  const [issuesFound, setIssuesFound] = useState<string[]>([]);
  const [email, setEmail] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const startDemo = () => {
    setState('scanning');
    setProgress(0);
    setIssuesFound([]);

    // Simulate scanning progress
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 2;
      setProgress(currentProgress);

      // Simulate finding errors at specific percentages
      if (currentProgress === 20) setIssuesFound(prev => [...prev, 'Missing timestamps detected (Row 42)']);
      if (currentProgress === 45) setIssuesFound(prev => [...prev, 'Invalid pair format: BTC-USD (Row 108)']);
      if (currentProgress === 70) setIssuesFound(prev => [...prev, 'Duplicate transaction ID found']);

      if (currentProgress >= 100) {
        clearInterval(interval);
        setState('fixing');
        
        // Short delay before "Fixing" completes
        setTimeout(() => {
          setState('complete');
        }, 1500);
      }
    }, 50);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    startDemo();
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = () => {
    startDemo();
  };

  const resetDemo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setState('idle');
    setIssuesFound([]);
    setEmail('');
  };

  return (
    <div className="w-full h-full min-h-[320px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col relative">
      
      {/* Header - Always Visible */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
          </div>
          <div className="ml-3 text-xs text-gray-500 font-mono bg-gray-200 px-2 py-0.5 rounded">
            csv_repair_engine_v2.exe
          </div>
        </div>
        {state !== 'idle' && (
          <button onClick={resetDemo} className="text-gray-400 hover:text-gray-600 transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center relative">
        
        {/* STATE: IDLE */}
        {state === 'idle' && (
          <div 
            className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-brand-blue hover:bg-blue-50/50 transition-all group"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={handleClick}
          >
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
            />
            <div className="w-16 h-16 bg-blue-100 text-brand-blue rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Upload className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Drop your CSV here</h3>
            <p className="text-sm text-gray-500 mt-2">or click to upload (Simulated)</p>
            <div className="mt-4 flex gap-2">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Coinbase</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Binance</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Kraken</span>
            </div>
          </div>
        )}

        {/* STATE: SCANNING */}
        {state === 'scanning' && (
          <div className="w-full max-w-sm">
            <div className="mb-6 text-center">
              <Loader2 className="h-10 w-10 text-brand-blue animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900">Scanning File...</h3>
              <p className="text-sm text-gray-500 font-mono mt-1">coinbase_2024_export.csv</p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2 overflow-hidden">
              <div 
                className="bg-brand-blue h-2 rounded-full transition-all duration-75"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mb-6">
              <span>Analysis</span>
              <span>{progress}%</span>
            </div>

            {/* Live Log */}
            <div className="space-y-2">
              {issuesFound.map((issue, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded animate-in slide-in-from-bottom-2 fade-in">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  {issue}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STATE: FIXING */}
        {state === 'fixing' && (
          <div className="text-center">
             <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 mx-auto animate-bounce">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">3 Errors Fixed!</h3>
            <p className="text-gray-500 mt-2">Reformatting dates...</p>
            <p className="text-gray-500">Standardizing asset tickers...</p>
          </div>
        )}

        {/* STATE: COMPLETE */}
        {state === 'complete' && (
          <div className="w-full max-w-xs text-center animate-in zoom-in-95 duration-300">
            <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mb-4 mx-auto shadow-lg">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">File Ready for Download</h3>
            <p className="text-sm text-gray-600 mb-6">
              Your file has been cleaned and formatted for <strong>TurboTax</strong>.
            </p>

            <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
              <input 
                type="email" 
                placeholder="Enter email to receive file" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button className="w-full bg-brand-blue hover:bg-blue-700 text-white" showArrow>
                Download Repaired CSV
              </Button>
            </form>
            <p className="text-[10px] text-gray-400 mt-4">
              Secure 256-bit encrypted transfer.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}