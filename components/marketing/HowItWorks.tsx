'use client';

import React, { useState } from 'react';
import { Container } from '../layout/Container';
import { Upload, FileCheck, Download, Check, AlertCircle } from 'lucide-react';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';

// Sample CSV data for demo
const SAMPLE_CSV_BEFORE = `Date,Amount,Type,Exchange
2025-01-15,0.5,BTC,Coinbase
,1.2,ETH,Binance
2025-01-14,1.2,ETH,
2025-01-13,0.5,BTC,Coinbase
2025-01-12,1.2,ETH,Binance
2025-01-13,0.5,BTC,Coinbase`;

const SAMPLE_CSV_AFTER = `Date,Amount,Currency,Type,Exchange
2025-01-15,0.5,BTC,Trade,Coinbase
2025-01-15,1.2,ETH,Trade,Binance
2025-01-14,1.2,ETH,Trade,Binance
2025-01-13,0.5,BTC,Trade,Coinbase
2025-01-12,1.2,ETH,Trade,Binance
2025-01-13,0.5,BTC,Trade,Coinbase`;

const PLATFORMS = [
  { name: 'Koinly', id: 'koinly', color: '#FF6B9D' },
  { name: 'TurboTax', id: 'turbotax', color: '#FF9F43' },
  { name: 'CoinLedger', id: 'coinledger', color: '#00B894' },
  { name: 'ZenLedger', id: 'zenledger', color: '#0984E3' },
];

const ISSUES_FOUND = [
  { type: 'missing_date', label: 'Missing dates', count: 1, color: '#EF4444' },
  { type: 'missing_exchange', label: 'Missing exchange', count: 2, color: '#F59E0B' },
  { type: 'duplicates', label: 'Duplicates found', count: 1, color: '#8B5CF6' },
];

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedPlatform, setSelectedPlatform] = useState('koinly');
  const [showIssues, setShowIssues] = useState(false);

  return (
    <section id="features" className="bg-gradient-to-b from-white via-[#f8f9ff] to-white py-24 sm:py-32 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-[#3b82f6]/8 rounded-full blur-3xl animate-float animation-delay-500"></div>
        <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-[#059669]/5 rounded-full blur-3xl animate-float animation-delay-300"></div>
      </div>

      <Container>
        <div className="text-center mb-16 relative z-10">
          <h2 className="font-poppins text-4xl sm:text-5xl font-bold text-[#1a365d] mb-4 leading-tight">
            Watch Your Data Transform
          </h2>
          <p className="text-xl text-[#4b5563] max-w-2xl mx-auto">
            See exactly what happens at each step—from broken CSV to tax-ready data
          </p>
        </div>

        {/* Main Demo Area */}
        <div className="max-w-6xl mx-auto relative z-10">
          {/* Step Tabs */}
          <div className="flex gap-3 mb-12 justify-center flex-wrap">
            {[
              { label: 'Upload', icon: Upload, step: 0 },
              { label: 'Parsing', icon: FileCheck, step: 1 },
              { label: 'Export', icon: Download, step: 2 },
            ].map((tab, idx) => {
              const Icon = tab.icon;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                    activeStep === idx
                      ? 'bg-[#3b82f6] text-white shadow-lg'
                      : 'bg-white border-2 border-[#e5e7eb] text-[#1a365d] hover:border-[#3b82f6]/50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Demo Content - Step 1: Upload */}
          {activeStep === 0 && (
            <DemoStep1_Upload />
          )}

          {/* Demo Content - Step 2: Parsing */}
          {activeStep === 1 && (
            <DemoStep2_Parsing 
              showIssues={showIssues}
              onToggle={() => setShowIssues(!showIssues)}
            />
          )}

          {/* Demo Content - Step 3: Export */}
          {activeStep === 2 && (
            <DemoStep3_Export 
              selectedPlatform={selectedPlatform}
              onSelectPlatform={setSelectedPlatform}
            />
          )}
        </div>
      </Container>
    </section>
  );
}

// STEP 1: Upload Demo
function DemoStep1_Upload() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left: Description */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center text-white font-bold text-lg">
              1
            </div>
          </div>
          <h3 className="font-poppins text-3xl font-bold text-[#1a365d]">
            Drag Your Broken CSV
          </h3>
          <p className="text-lg text-[#4b5563] leading-relaxed">
            Upload your CSV from any exchange—Coinbase, Binance, Kraken, and 15+ more. Our system instantly detects the format and begins analysis.
          </p>
          <div className="flex items-center gap-3 text-sm text-[#059669] font-semibold bg-[#059669]/10 px-4 py-3 rounded-lg border border-[#059669]/20 w-fit">
            <Check className="h-5 w-5" />
            Supports 18+ exchanges
          </div>
        </div>

        {/* Right: Interactive Upload Demo */}
        <div className="relative group">
          <div className="bg-gradient-to-br from-[#3b82f6]/10 to-[#2563eb]/5 rounded-2xl p-8 border-2 border-dashed border-[#3b82f6]/30 hover:border-[#3b82f6]/80 hover:bg-gradient-to-br hover:from-[#3b82f6]/15 hover:to-[#2563eb]/10 transition-all duration-300 group-hover:shadow-xl group-hover:scale-105 cursor-pointer">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#3b82f6] to-[#2563eb] rounded-xl flex items-center justify-center shadow-lg group-hover:scale-125 group-hover:rotate-6 transition-all duration-300">
                <Upload className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="font-semibold text-[#1a365d]">Drag CSV here</p>
                <p className="text-sm text-[#6b7280]">or click to browse</p>
              </div>
              <div className="text-xs text-[#9ca3af] space-y-1">
                <p>📁 Supports CSV, XLS, XLSX</p>
                <p>📊 Up to 50MB files</p>
              </div>
            </div>
          </div>

          {/* File preview */}
          <div className="mt-6 bg-white rounded-lg border border-[#e5e7eb] p-4 shadow-sm hover:shadow-md hover:border-[#3b82f6]/30 transition-all duration-300">
            <p className="text-xs font-semibold text-[#6b7280] mb-3 uppercase tracking-wider">Sample file detected</p>
            <div className="bg-[#f9fafb] rounded p-3 font-mono text-xs text-[#4b5563] overflow-x-auto max-h-32 overflow-y-auto border border-[#e5e7eb]">
              <pre>{SAMPLE_CSV_BEFORE}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// STEP 2: Parsing Demo
function DemoStep2_Parsing({ showIssues, onToggle }: any) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left: Description */}
        <div className="space-y-6 lg:order-2">
          <div className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center text-white font-bold text-lg">
              2
            </div>
          </div>
          <h3 className="font-poppins text-3xl font-bold text-[#1a365d]">
            We Find & Fix Issues
          </h3>
          <p className="text-lg text-[#4b5563] leading-relaxed">
            Our AI-powered engine automatically detects and repairs missing dates, incorrect formats, duplicates, and inconsistent data.
          </p>
          
          {/* Issues Found */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider">Issues detected & fixed</p>
            {ISSUES_FOUND.map((issue, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-[#f9fafb] to-white border border-[#e5e7eb] hover:border-[#dbeafe] hover:shadow-md hover:bg-gradient-to-r hover:from-[#f0f9ff] hover:to-white transition-all duration-300 group cursor-default">
                <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: `${issue.color}20` }}>
                  <AlertCircle className="h-4 w-4" style={{ color: issue.color }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#1a365d]">{issue.label}</p>
                </div>
                <div className="flex items-center gap-2 font-bold px-2.5 py-1 rounded-full bg-white group-hover:scale-110 transition-transform duration-300" style={{ color: issue.color, borderBottom: `2px solid ${issue.color}` }}>
                  {issue.count} <Check className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Before/After Demo */}
        <div className="space-y-4 lg:order-1">
          <div className="relative group">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Before */}
              <div className="bg-gradient-to-br from-[#FEE2E2] to-[#FECACA]/50 rounded-xl p-4 border-2 border-[#FECACA] hover:shadow-lg hover:scale-105 transition-all duration-300 group-hover:from-[#FEE2E2] group-hover:to-[#FED7D7] cursor-default">
                <p className="text-xs font-bold text-[#991B1B] mb-3 uppercase tracking-wider flex items-center gap-2">
                  <span className="text-lg">❌</span>
                  Before
                </p>
                <div className="bg-white rounded p-3 font-mono text-xs text-[#4b5563] max-h-48 overflow-y-auto border border-[#FECACA]">
                  <pre className="whitespace-pre-wrap break-words">{SAMPLE_CSV_BEFORE}</pre>
                </div>
              </div>

              {/* After */}
              <div className="bg-gradient-to-br from-[#D1FAE5] to-[#A7F3D0]/50 rounded-xl p-4 border-2 border-[#A7F3D0] hover:shadow-lg hover:scale-105 transition-all duration-300 group-hover:from-[#D1FAE5] group-hover:to-[#86EFAC] cursor-default">
                <p className="text-xs font-bold text-[#065F46] mb-3 uppercase tracking-wider flex items-center gap-2">
                  <span className="text-lg">✅</span>
                  After
                </p>
                <div className="bg-white rounded p-3 font-mono text-xs text-[#4b5563] max-h-48 overflow-y-auto border border-[#A7F3D0]">
                  <pre className="whitespace-pre-wrap break-words">{SAMPLE_CSV_AFTER}</pre>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-[#D1FAE5] to-[#ECFDF5] rounded-lg p-4 border border-[#A7F3D0] text-center hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-default">
              <p className="text-3xl font-bold text-[#059669]">4</p>
              <p className="text-xs text-[#065F46] font-semibold mt-1">Issues Fixed</p>
            </div>
            <div className="bg-gradient-to-br from-[#DBEAFE] to-[#F0F9FF] rounded-lg p-4 border border-[#93C5FD] text-center hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-default">
              <p className="text-3xl font-bold text-[#3b82f6]">6</p>
              <p className="text-xs text-[#1e40af] font-semibold mt-1">Rows Cleaned</p>
            </div>
            <div className="bg-gradient-to-br from-[#EDE9FE] to-[#F5F3FF] rounded-lg p-4 border border-[#DDD6FE] text-center hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-default">
              <p className="text-3xl font-bold text-[#7C3AED]">0.2s</p>
              <p className="text-xs text-[#5B21B6] font-semibold mt-1">Time Taken</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// STEP 3: Export Demo
function DemoStep3_Export({ selectedPlatform, onSelectPlatform }: any) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left: Description */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center text-white font-bold text-lg">
              3
            </div>
          </div>
          <h3 className="font-poppins text-3xl font-bold text-[#1a365d]">
            Download Tax-Ready Format
          </h3>
          <p className="text-lg text-[#4b5563] leading-relaxed">
            Export your cleaned CSV in the exact format your tax software needs. Works with Koinly, TurboTax, CoinLedger, ZenLedger, and more.
          </p>
          
          {/* Platform selector */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider">Choose your platform</p>
            <div className="grid grid-cols-2 gap-3">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => onSelectPlatform(platform.id)}
                  className={`px-4 py-3 rounded-lg font-semibold transition-all duration-300 ${
                    selectedPlatform === platform.id
                      ? 'bg-[#3b82f6] text-white shadow-lg scale-105'
                      : 'bg-white border-2 border-[#e5e7eb] text-[#1a365d] hover:border-[#3b82f6]/50'
                  }`}
                >
                  {platform.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Export Preview */}
        <div className="space-y-4">
          {/* Download preview */}
          <div className="bg-gradient-to-br from-white to-[#f8f9ff] rounded-2xl p-8 border-2 border-[#e5e7eb] hover:border-[#059669]/30 shadow-lg hover:shadow-2xl transition-all duration-300 text-center space-y-6 group">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#059669] to-[#047857] rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
              <Download className="h-10 w-10 text-white" />
            </div>
            
            <div>
              <p className="font-poppins font-semibold text-[#1a365d] mb-2">
                taxformatter_export.csv
              </p>
              <p className="text-sm text-[#6b7280]">
                Formatted for <span className="font-semibold text-[#1a365d]">{PLATFORMS.find(p => p.id === selectedPlatform)?.name}</span>
              </p>
            </div>

            <button className="w-full bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white font-semibold py-3 rounded-lg hover:shadow-lg hover:-translate-y-0.5 hover:from-[#2563eb] hover:to-[#1d4ed8] transition-all duration-300 flex items-center justify-center gap-2 group/btn">
              <Download className="h-5 w-5 group-hover/btn:scale-110 transition-transform duration-300" />
              Download CSV
            </button>

            <div className="pt-4 border-t border-[#e5e7eb]">
              <p className="text-xs text-[#6b7280] font-medium">
                ✓ Encrypted  •  ✓ Deleted after 24h  •  ✓ Ready to import
              </p>
            </div>
          </div>

          {/* Format info */}
          <div className="bg-[#f8f9ff] rounded-lg p-4 border border-[#dbeafe]">
            <p className="text-xs font-semibold text-[#1e40af] mb-2 uppercase">Export format</p>
            <div className="bg-white rounded p-3 font-mono text-xs text-[#4b5563] overflow-x-auto">
              <pre>Date | Amount | Currency | Type | Exchange</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
