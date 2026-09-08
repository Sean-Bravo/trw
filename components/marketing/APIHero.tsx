'use client';

import React, { useState, useEffect } from 'react';
import { Container } from '../layout/Container';
import { Button } from '../ui/Button';
import { trackSignUp } from '@/lib/analytics';
import { Terminal, Zap, Bot, ArrowRight } from 'lucide-react';

const codeLines = [
  { text: 'curl -X POST https://api.taxformatter.com/v1/parse \\', color: 'text-slate-300' },
  { text: '  -H "X-API-Key: tf_live_sk8f2m..." \\', color: 'text-amber-400/90' },
  { text: '  -H "Content-Type: application/json" \\', color: 'text-slate-400' },
  { text: '  -d \'{', color: 'text-slate-300' },
  { text: '    "file_content": "<base64>",', color: 'text-emerald-400/90' },
  { text: '    "filename": "coinbase_2024.csv",', color: 'text-emerald-400/90' },
  { text: '    "output_format": "koinly"', color: 'text-emerald-400/90' },
  { text: '  }\'', color: 'text-slate-300' },
];

const responseLines = [
  { text: '{', color: 'text-slate-400' },
  { text: '  "status": "success",', color: 'text-emerald-400' },
  { text: '  "summary": "Parsed 147 Coinbase transactions",', color: 'text-sky-400' },
  { text: '  "detected_source": "coinbase",', color: 'text-sky-400' },
  { text: '  "transactions": [ ... ],', color: 'text-amber-400/80' },
  { text: '  "metadata": { "processing_time_ms": 842 }', color: 'text-slate-400' },
  { text: '}', color: 'text-slate-400' },
];

export function APIHero() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [showResponse, setShowResponse] = useState(false);
  const [responseVisible, setResponseVisible] = useState(0);

  useEffect(() => {
    if (visibleLines < codeLines.length) {
      const timer = setTimeout(() => setVisibleLines(v => v + 1), 120);
      return () => clearTimeout(timer);
    } else if (!showResponse) {
      const timer = setTimeout(() => setShowResponse(true), 600);
      return () => clearTimeout(timer);
    }
  }, [visibleLines, showResponse]);

  useEffect(() => {
    if (showResponse && responseVisible < responseLines.length) {
      const timer = setTimeout(() => setResponseVisible(v => v + 1), 80);
      return () => clearTimeout(timer);
    }
  }, [showResponse, responseVisible]);

  return (
    <section className="relative min-h-[95vh] flex items-center overflow-hidden bg-surface-base pt-16 pb-20">
      {/* Background effects */}
      <div className="absolute inset-0">
        {/* Gradient orbs */}
        <div
          className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-15 blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(99,91,255,0.6) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full opacity-12 blur-[100px]"
          style={{ background: 'radial-gradient(circle, rgba(0,212,170,0.5) 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-[30%] left-[50%] w-[30%] h-[30%] rounded-full opacity-8 blur-[80px]"
          style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.4) 0%, transparent 70%)' }}
        />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(rgba(148,163,184,0.8) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      <Container>
        <div className="relative z-10 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div className="max-w-xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 mb-8 rounded-full bg-white/4 border border-white/8 backdrop-blur-sm animate-fade-in-up">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span className="text-[13px] font-medium text-slate-400 tracking-wide">
                Developer API &middot; Now Live
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-poppins text-[2.75rem] sm:text-5xl lg:text-[3.5rem] font-bold text-white leading-[1.08] tracking-[-0.02em] text-balance mb-6 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
              Parse any crypto CSV or bank PDF.
              <span className="block mt-3 bg-gradient-to-r from-[#635bff] via-[#818cf8] to-[#00d4aa] bg-clip-text text-transparent">
                One API call.
              </span>
            </h1>

            {/* Sub */}
            <p className="text-lg text-slate-400 leading-relaxed mb-10 max-w-md animate-fade-in-up" style={{ animationDelay: '160ms' }}>
              14 crypto exchanges. 7+ bank formats. Auto-detection, structured JSON output, and tax-ready formatting — built for developers and AI agents.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 mb-12 animate-fade-in-up" style={{ animationDelay: '240ms' }}>
              <Button
                variant="primary"
                href="/signup"
                showArrow
                onClick={() => trackSignUp()}
                className="text-[15px] px-7 py-3 h-12"
              >
                Get API Key
              </Button>
              <Button
                variant="secondary"
                href="/docs/api"
                className="text-[15px] px-7 py-3 h-12 !border-white/10 !text-slate-300 hover:!text-white hover:!border-white/20 !bg-white/3"
              >
                Read the Docs
              </Button>
            </div>

            {/* Stats bar */}
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-white/3 border border-white/6 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '320ms' }}>
              {[
                '14 exchanges',
                '7+ banks',
                '4 output formats',
                '<2s response',
              ].map((stat, i) => (
                <React.Fragment key={stat}>
                  {i > 0 && <span className="text-slate-700">·</span>}
                  <span className="text-[13px] text-slate-400 font-medium">{stat}</span>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Right: Code Terminal */}
          <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="relative">
              {/* Glow behind */}
              <div className="absolute -inset-3 bg-gradient-to-br from-[#635bff]/15 via-transparent to-[#00d4aa]/10 rounded-2xl blur-xl" />

              <div className="relative bg-surface-card rounded-xl border border-white/6 overflow-hidden shadow-2xl">
                {/* Terminal chrome */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/4 bg-white/2">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f57]/80" />
                    <div className="w-3 h-3 rounded-full bg-[#febc2e]/80" />
                    <div className="w-3 h-3 rounded-full bg-[#28c840]/80" />
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">api.taxformatter.com</span>
                  <div className="w-16" />
                </div>

                {/* Request */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">POST</span>
                    <span className="text-[11px] font-mono text-slate-400">/v1/parse</span>
                  </div>
                  <div className="font-mono text-[13px] leading-[1.7] space-y-0">
                    {codeLines.map((line, i) => (
                      <div
                        key={i}
                        className={`transition-all duration-300 ${i < visibleLines ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
                        style={{ transitionDelay: `${i * 30}ms` }}
                      >
                        <span className={line.color}>{line.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Response */}
                {showResponse && (
                  <div className="border-t border-white/4 p-5 bg-white/1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">200</span>
                      <span className="text-[11px] font-mono text-slate-400">842ms</span>
                    </div>
                    <div className="font-mono text-[13px] leading-[1.7]">
                      {responseLines.map((line, i) => (
                        <div
                          key={i}
                          className={`transition-all duration-200 ${i < responseVisible ? 'opacity-100' : 'opacity-0'}`}
                        >
                          <span className={line.color}>{line.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
