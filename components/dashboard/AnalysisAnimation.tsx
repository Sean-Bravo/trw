'use client';

import { Cpu, CheckCircle2 } from 'lucide-react';

interface AnalysisAnimationProps {
  status: 'idle' | 'processing' | 'complete';
  statusText?: string;
  subtitle?: string;
}

export function AnalysisAnimation({
  status,
  statusText = 'AI Analysis Running...',
  subtitle = 'Detecting patterns & anomalies'
}: AnalysisAnimationProps) {
  if (status === 'idle') {
    return null;
  }

  const isComplete = status === 'complete';

  return (
    <div className="flex flex-col items-center justify-center py-12">
      {/* Circular progress with chip icon */}
      <div className="relative w-32 h-32 mb-6">
        {/* Outer rotating ring */}
        <svg
          className={`absolute inset-0 w-full h-full ${status === 'processing' ? 'animate-spin-slow' : ''}`}
          viewBox="0 0 128 128"
        >
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isComplete ? "#10b981" : "#06b6d4"} stopOpacity="0.8" />
              <stop offset="50%" stopColor={isComplete ? "#34d399" : "#22d3d1"} stopOpacity="0.4" />
              <stop offset="100%" stopColor={isComplete ? "#10b981" : "#06b6d4"} stopOpacity="0" />
            </linearGradient>
          </defs>
          <circle
            cx="64"
            cy="64"
            r="58"
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={status === 'processing' ? '120 250' : '365 0'}
            className="transition-all duration-500"
          />
        </svg>

        {/* Static outer circle */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 128 128">
          <circle
            cx="64"
            cy="64"
            r="58"
            fill="none"
            stroke={isComplete ? "rgba(16, 185, 129, 0.15)" : "rgba(6, 182, 212, 0.15)"}
            strokeWidth="2"
          />
        </svg>

        {/* Inner circle background */}
        <div className={`absolute inset-4 rounded-full bg-[#0d2847]/80 border flex items-center justify-center transition-colors duration-300 ${
          isComplete ? 'border-emerald-500/30' : 'border-cyan-500/20'
        }`}>
          {/* Icon - Chip when processing, Check when complete */}
          <div className={`relative ${status === 'processing' ? 'animate-pulse' : ''}`}>
            {isComplete ? (
              <>
                <CheckCircle2 className="w-12 h-12 text-emerald-400" strokeWidth={1.5} />
                <div className="absolute inset-0 w-12 h-12 bg-emerald-400/20 blur-lg rounded-full" />
              </>
            ) : (
              <>
                <Cpu className="w-12 h-12 text-cyan-400" strokeWidth={1.5} />
                <div className="absolute inset-0 w-12 h-12 bg-cyan-400/20 blur-lg rounded-full" />
              </>
            )}
          </div>
        </div>

        {/* Rotating dots */}
        {status === 'processing' && (
          <div className="absolute inset-0 animate-spin-reverse">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50" />
          </div>
        )}
      </div>

      {/* Status text */}
      <h3 className={`text-xl font-semibold mb-2 ${isComplete ? 'text-emerald-400' : 'text-white'}`}>
        {isComplete ? 'Analysis Complete' : statusText}
      </h3>
      <p className="text-slate-400 text-sm">
        {isComplete ? 'Ready for download' : subtitle}
      </p>
    </div>
  );
}
