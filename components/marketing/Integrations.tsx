'use client';

import React from 'react';
import { Container } from '../layout/Container';
import { Database, FileCheck, ArrowRight, Zap, Activity } from 'lucide-react';

const exchanges = [
  'Coinbase_raw.csv', 'Binance_export.xlsx', 'Kraken_2025.csv', 
  'KuCoin_trade_history.csv', 'Crypto.com_fiat.csv', 'Gemini_active.csv',
  'Bitstamp_ledger.csv', 'Robinhood_1099.pdf', 'eToro_statement.xls', 
  'OKX_spot.csv', 'Bybit_derivatives.csv', 'Gate.io_margin.csv'
];

const platforms = [
  'TurboTax_Ready.csv', 'Koinly_Universal.csv', 'CoinLedger_Import.csv', 
  'H&R_Block_Format.csv', 'TaxAct_Standard.csv', 'ZenLedger_Compatible.csv', 
  'TokenTax_Direct.csv'
];

export function Integrations() {
  return (
    <section className="py-32 bg-slate-950 relative overflow-hidden">
      
      {/* Background: Cyberpunk Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-transparent to-slate-950"></div>

      <Container>
        <div className="relative z-10 grid lg:grid-cols-3 gap-8 items-center max-w-6xl mx-auto">

          {/* COLUMN 1: THE CHAOS (Input) */}
          <div className="relative h-[500px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm group">
            {/* Header */}
            <div className="absolute top-0 inset-x-0 p-4 bg-slate-900/90 border-b border-slate-800 z-10 flex justify-between items-center">
              <div className="flex items-center gap-2 text-slate-400">
                <Database className="w-4 h-4" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">Raw Ingest</span>
              </div>
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500/50 animate-pulse"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50"></span>
              </div>
            </div>

            {/* Scrolling Stream */}
            <div className="absolute inset-x-0 top-16 bottom-0 overflow-hidden mask-linear-fade">
               <div className="flex flex-col gap-3 p-4 animate-marquee-vertical">
                  {[...exchanges, ...exchanges].map((ex, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-500 font-mono text-xs">
                      <span className="truncate max-w-[180px]">{ex}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] uppercase text-slate-600">Raw</span>
                    </div>
                  ))}
               </div>
            </div>
            
            {/* Overlay Gradient for Depth */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/20 via-transparent to-slate-900/80 pointer-events-none"></div>
          </div>


          {/* COLUMN 2: THE REACTOR (Processing) */}
          <div className="relative flex flex-col items-center justify-center text-center z-20 py-12 lg:py-0">
            
            {/* The Glowing Orb */}
            <div className="relative w-32 h-32 mb-8">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="relative w-full h-full bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center shadow-2xl shadow-blue-900/50 ring-1 ring-blue-500/30">
                <Zap className="w-12 h-12 text-blue-400 fill-blue-500/10" />
              </div>
              
              {/* Orbiting Particles (CSS only) */}
              <div className="absolute inset-0 rounded-full border border-blue-500/20 border-t-blue-400 animate-spin duration-[3s]"></div>
              <div className="absolute -inset-4 rounded-full border border-dashed border-slate-700 animate-[spin_10s_linear_infinite_reverse]"></div>
            </div>

            <h2 className="font-poppins text-3xl font-bold text-white mb-4">
              The Universal <br/> Adapter
            </h2>
            <p className="text-slate-400 mb-8 max-w-xs mx-auto text-sm leading-relaxed">
              Our engine normalizes chaotic exchange data into strict tax schemas in milliseconds.
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono">
              <Activity className="w-3 h-3" />
              <span>PROCESSING_ACTIVE</span>
            </div>
          </div>


          {/* COLUMN 3: THE ORDER (Output) */}
          <div className="relative h-[500px] overflow-hidden rounded-2xl border border-blue-900/30 bg-blue-950/10 backdrop-blur-sm group">
            {/* Header */}
            <div className="absolute top-0 inset-x-0 p-4 bg-slate-900/90 border-b border-blue-900/30 z-10 flex justify-between items-center">
              <div className="flex items-center gap-2 text-blue-400">
                <FileCheck className="w-4 h-4" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">Verified Output</span>
              </div>
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
            </div>

            {/* Scrolling Stream (Reverse Direction) */}
            <div className="absolute inset-x-0 top-16 bottom-0 overflow-hidden mask-linear-fade">
               <div className="flex flex-col gap-3 p-4 animate-marquee-vertical-reverse">
                  {[...platforms, ...platforms, ...platforms].map((pl, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-blue-500/20 bg-blue-900/20 text-blue-100 font-mono text-xs shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                      <span className="truncate max-w-[180px] font-semibold">{pl}</span>
                      <div className="h-4 w-4 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50">
                        <svg className="w-2.5 h-2.5 text-emerald-400" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L4.5 8.5L2 6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
            
             {/* Overlay Gradient */}
             <div className="absolute inset-0 bg-gradient-to-b from-slate-900/20 via-transparent to-slate-900/80 pointer-events-none"></div>
          </div>

        </div>
      </Container>
    </section>
  );
}