import React from 'react';
import Link from 'next/link';
import { Shield, Lock, EyeOff, FileDiff, Ban, Check, Server, Database, Key, Globe, Cpu, ArrowRight } from 'lucide-react';

const TrustEngine = () => {
  return (
    <section className="bg-[#020617] py-24 overflow-hidden relative">
      {/* REFINEMENT 1: Deeper Background Atmosphere */}
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.07] pointer-events-none"></div>
      {/* Vignette for focus and depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#020617_80%)] pointer-events-none"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-24">
          <div className="inline-flex items-center justify-center p-3 mb-6 bg-emerald-500/10 rounded-2xl ring-1 ring-emerald-500/20 animate-[pulse_3s_ease-in-out_infinite]">
            <Shield className="w-10 h-10 text-emerald-400" strokeWidth={1.5} />
            <Lock className="w-5 h-5 text-emerald-300 absolute" strokeWidth={2} />
          </div>
          {/* REFINEMENT 3: More Aggressive Typography Gradient */}
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            ENGINEERED FOR <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-yellow-300 to-orange-400 font-extrabold">PARANOIA</span>
          </h2>
          <p className="text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto">
            We assume your data is toxic. Our system is designed to touch it, fix it, and <span className="text-slate-200 font-medium relative inline-block">forget it completely<span className="absolute bottom-0 left-0 w-full h-px bg-slate-400/50"></span></span>.
          </p>
        </div>

        {/* Main Visual: The Security Stack */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
          {/* REFINEMENT 2: Active Scanning Connector Line */}
          {/* An animated "scanner" beam moving across the cards on desktop */}
          <div className="hidden lg:block absolute top-[140px] left-0 w-full h-px bg-slate-800/50 z-0 overflow-hidden">
             <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent animate-[shimmer_3s_linear_infinite] -translate-x-full"></div>
          </div>

          {/* CARD 1: PRIVACY (Yellow theme) */}
          {/* REFINEMENT 4: Added hover:-translate-y-1 for tactile feel */}
          <div className="group relative bg-slate-900/40 border border-slate-800/80 hover:border-yellow-400/50 rounded-2xl p-8 transition-all duration-300 hover:shadow-[0_0_30px_-10px_rgba(250,204,21,0.2)] hover:-translate-y-1 z-10 overflow-hidden backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            {/* Visual: Ephemeral Processing Animation */}
            <div className="h-36 mb-8 relative flex items-center justify-between rounded-xl bg-slate-950/50 border border-slate-800/80 px-6 overflow-hidden">
              {/* Input Data */}
              <div className="flex flex-col items-center gap-2 z-10">
                <FileDiff className="w-8 h-8 text-slate-400 group-hover:text-yellow-200 transition-colors" />
                <span className="text-[10px] font-mono text-slate-400 uppercase">Raw Data</span>
              </div>

              {/* The "Shredder" Process */}
              <div className="flex-1 mx-4 relative h-12 flex items-center justify-center">
                 {/* Abstract shredding lines */}
                 <div className="absolute inset-0 flex justify-between opacity-20">
                    {[...Array(7)].map((_, i) => (
                        <div key={i} className="w-px h-full bg-yellow-400/30 animate-pulse" style={{animationDelay: `${i * 0.1}s`}}></div>
                    ))}
                 </div>
                 <Cpu className="w-8 h-8 text-yellow-400/40 animate-[spin_10s_linear_infinite] relative z-10" />
              </div>

              {/* Output: Nothingness */}
              <div className="flex flex-col items-center gap-2 z-10">
                <EyeOff className="w-8 h-8 text-slate-400 group-hover:text-red-400/80 transition-colors animate-[pulse_2s_ease-in-out_infinite_reverse]" />
                 <span className="text-[10px] font-mono text-slate-400 uppercase group-hover:text-red-400/60 transition-colors">Void</span>
              </div>
              
              {/* Digital Noise Overlay */}
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20 mix-blend-overlay pointer-events-none"></div>
            </div>

            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-yellow-300 transition-colors">Ephemeral Processing</h3>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              Your financial data is a liability. Files are <span className="text-slate-200">cryptographically wiped</span> from hot storage instantly after processing. We don't hold what we don't need.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-mono font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
              </span>
              STATUS: AUTO-WIPE ENGAGED
            </div>
          </div>

          {/* CARD 2: INTEGRITY (Emerald theme) */}
          <div className="group relative bg-slate-900/40 border border-slate-800/80 hover:border-emerald-400/50 rounded-2xl p-8 transition-all duration-300 hover:shadow-[0_0_30px_-10px_rgba(52,211,153,0.2)] hover:-translate-y-1 z-10 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            {/* Visual: The Diff Table */}
            <div className="h-36 mb-8 relative rounded-xl bg-slate-950/50 border border-slate-800/80 p-4 font-mono text-xs overflow-hidden flex flex-col justify-center">
              <div className="grid grid-cols-3 gap-2 mb-2 text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-800/50 text-[10px]">
                <div>Date</div>
                <div>Type</div>
                <div>Amount</div>
              </div>
              {/* Bad Data Row */}
              <div className="grid grid-cols-3 gap-2 py-1.5 relative group/row">
                <div className="absolute inset-y-0 -left-4 w-[calc(100%+2rem)] bg-red-400/5 skew-x-12 opacity-0 group-hover/row:opacity-100 transition-opacity"></div>
                <div className="line-through decoration-2 text-red-400/50 decoration-red-400/40 relative">23/30/01</div>
                <div className="line-through decoration-2 text-red-400/50 decoration-red-400/40 relative">STAKE_R</div>
                <div className="text-slate-400 relative">0.005 ETH</div>
              </div>
              {/* Good Data Row */}
              <div className="grid grid-cols-3 gap-2 py-1.5 relative mt-1">
                <div className="absolute inset-y-0 -left-2 w-1 bg-emerald-400/50 rounded-r animate-pulse"></div>
                <div className="text-emerald-300 font-medium">2023-01-30</div>
                <div className="text-emerald-300 font-medium">INCOME</div>
                <div className="text-slate-300">0.005 ETH</div>
              </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-300 transition-colors">The Diff Guarantee</h3>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              Don't trust "magic." Our engine fixes formats, not financials. We provide a <span className="text-slate-200">cell-level audit trail</span> for every modification. Verify every single decimal point.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-xs font-mono font-medium">
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
              STATUS: AUDIT TRAIL ACTIVE
            </div>
          </div>

          {/* CARD 3: SECURITY (Blue theme) */}
          <div className="group relative bg-slate-900/40 border border-slate-800/80 hover:border-blue-400/50 rounded-2xl p-8 transition-all duration-300 hover:shadow-[0_0_30px_-10px_rgba(96,165,250,0.2)] hover:-translate-y-1 z-10 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            {/* Visual: Read-Only API Permissions */}
            <div className="h-36 mb-8 relative rounded-xl bg-slate-950/50 border border-slate-800/80 p-5 flex flex-col justify-center">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/50">
                <div className="flex items-center space-x-2">
                  <Key className="w-4 h-4 text-blue-400" />
                  <span className="text-slate-200 font-medium text-sm">API Scope Check</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">ReadOnly Mode</div>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pl-2 border-l-2 border-emerald-500/30 bg-emerald-500/5 py-0.5 rounded-r">
                  <span className="text-slate-300 text-xs font-mono">read:data</span>
                  <Check className="w-4 h-4 text-emerald-400 mr-2" />
                </div>
                <div className="flex items-center justify-between pl-2 border-l-2 border-red-500/30 bg-red-500/5 py-0.5 rounded-r opacity-70">
                  <span className="text-slate-400 text-xs font-mono line-through decoration-slate-600">write:trade</span>
                  <Ban className="w-4 h-4 text-red-400 mr-2" />
                </div>
                <div className="flex items-center justify-between pl-2 border-l-2 border-red-900/50 bg-red-950/30 py-0.5 rounded-r">
                  <span className="text-red-300 text-xs font-mono font-bold">withdraw:funds</span>
                  <Ban className="w-4 h-4 text-red-500 mr-2 animate-pulse" strokeWidth={2.5} />
                </div>
              </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-300 transition-colors">Zero-Access Policy</h3>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              We never ask for private keys or withdrawal rights. Our parsers are <span className="text-slate-200">strictly read-only</span> and will instantly reject any key with elevated permissions.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-400/10 border border-blue-400/20 text-blue-400 text-xs font-mono font-medium">
              <Shield className="w-3.5 h-3.5" />
              STATUS: PERMISSIONS LOCKED
            </div>
          </div>
        </div>

        {/* Bottom Bar: The Compliance Strip */}
        <div className="mt-24 pt-8 border-t border-slate-800/50 relative">
          {/* Subtle glow effect on the border */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent"></div>
          
          <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 text-sm text-slate-400 font-medium">
            <div className="flex items-center space-x-2 group hover:text-slate-300 transition-colors cursor-help">
              <Server className="w-4 h-4 text-slate-400 group-hover:text-slate-300 transition-colors" />
              <span>AWS Secure Enclaves</span>
            </div>
            <div className="hidden md:block w-1.5 h-1.5 bg-slate-800 rounded-full"></div>
            <div className="flex items-center space-x-2 group hover:text-slate-300 transition-colors cursor-help">
              <Database className="w-4 h-4 text-slate-400 group-hover:text-slate-300 transition-colors" />
              <span>AES-256 Encryption at Rest</span>
            </div>
            <div className="hidden md:block w-1.5 h-1.5 bg-slate-800 rounded-full"></div>
            <div className="flex items-center space-x-2 group hover:text-slate-300 transition-colors cursor-help">
              <Shield className="w-4 h-4 text-slate-400 group-hover:text-slate-300 transition-colors" />
              <span>SOC2 Compliant Infrastructure</span>
            </div>
            <div className="hidden md:block w-1.5 h-1.5 bg-slate-800 rounded-full"></div>
            <div className="flex items-center space-x-2 group hover:text-slate-300 transition-colors cursor-help">
              <Globe className="w-4 h-4 text-slate-400 group-hover:text-slate-300 transition-colors" />
              <span>Stripe Secure Payments</span>
            </div>
          </div>

          {/* Link to full security page */}
          <div className="mt-8 text-center">
            <Link
              href="/security"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition-colors group"
            >
              <span>View our full security practices</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustEngine;