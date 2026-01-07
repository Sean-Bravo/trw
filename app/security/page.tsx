import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Lock, 
  Trash2, 
  EyeOff, 
  Server, 
  FileX, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  Fingerprint, 
  FileJson 
} from 'lucide-react';

import { Header } from '@/components/marketing/Header';
import { Footer } from '@/components/marketing/Footer';
import { Container } from '@/components/layout/Container';

export const metadata: Metadata = {
  title: 'Security Center | TaxFormatter',
  description: 'Zero-Knowledge architecture. No private keys, automatic 24-hour deletion, and SOC2 compliant infrastructure.',
};

export default function SecurityPage() {
  return (
    <>
      <Header />
      {/* Force dark theme logic for the Security Center feel, or adapt to system preference */}
      <main className="min-h-screen bg-slate-950 text-slate-200 selection:bg-emerald-500/30">
        
        {/* --- HERO SECTION --- */}
        <section className="relative pt-32 pb-20 overflow-hidden border-b border-slate-800">
          {/* Background FX */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.1] pointer-events-none"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_10%,#020617_100%)] pointer-events-none"></div>

          <Container className="relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-emerald-500/5 border border-emerald-500/20 shadow-[0_0_15px_-3px_rgba(16,185,129,0.1)] backdrop-blur-sm animate-fade-in-up">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-mono font-medium text-emerald-400 tracking-wide">
                  SYSTEM STATUS: SECURE
                </span>
              </div>
              
              {/* Headline */}
              <h1 className="font-poppins text-5xl md:text-6xl font-bold text-white mb-8 tracking-tight leading-tight">
                We Don't Want Your <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-red-400 decoration-red-500/30 underline decoration-wavy underline-offset-8">
                  Private Keys.
                </span>
              </h1>
              
              <p className="text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto mb-10">
                TaxFormatter is built on a <span className="text-white font-medium">Zero-Knowledge</span> philosophy. 
                We process your CSVs in a volatile memory sandbox, format them, and then 
                <span className="text-red-400/80"> crypto-shred</span> them from existence.
              </p>

              {/* Stats/Trust Signals */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-800 pt-8">
                {[
                    { label: "Data Retention", value: "0 Days" },
                    { label: "Encryption", value: "AES-256" },
                    { label: "Wallet Access", value: "None" },
                    { label: "Infrastructure", value: "AWS" },
                ].map((stat, i) => (
                    <div key={i} className="text-center">
                        <div className="text-2xl font-bold text-white font-mono">{stat.value}</div>
                        <div className="text-xs text-slate-400 uppercase tracking-widest mt-1">{stat.label}</div>
                    </div>
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* --- THE 3 PILLARS --- */}
        <section className="py-24 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-slate-800 to-transparent"></div>
          <Container>
            <div className="grid md:grid-cols-3 gap-8">
              
              {/* Feature 1: The Kill Switch */}
              <div className="group bg-slate-900/40 p-8 rounded-2xl border border-slate-800 hover:border-red-500/40 transition-all duration-300 hover:shadow-[0_0_30px_-10px_rgba(239,68,68,0.1)] backdrop-blur-sm">
                <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-red-500/20">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-red-300 transition-colors">
                  The 24-Hour Kill Switch
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  We treat your data like toxic waste. Files are processed and automatically 
                  <strong className="text-slate-200"> permanently deleted</strong> from our servers after 24 hours. 
                  Users can also trigger an instant "Hard Delete" manually.
                </p>
              </div>

              {/* Feature 2: Encryption */}
              <div className="group bg-slate-900/40 p-8 rounded-2xl border border-slate-800 hover:border-purple-500/40 transition-all duration-300 hover:shadow-[0_0_30px_-10px_rgba(168,85,247,0.1)] backdrop-blur-sm">
                <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-purple-500/20">
                  <Lock className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors">
                  Bank-Grade Encryption
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Your files are encrypted using <strong className="text-slate-200">AES-256</strong> while in our temporary storage. 
                  TLS 1.3 is enforced for all transmission. Even if our DB was stolen, your data would be unreadable static.
                </p>
              </div>

              {/* Feature 3: Business Model */}
              <div className="group bg-slate-900/40 p-8 rounded-2xl border border-slate-800 hover:border-blue-500/40 transition-all duration-300 hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.1)] backdrop-blur-sm">
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-blue-500/20">
                  <EyeOff className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-300 transition-colors">
                  We Don't Sell Data
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Our business model is boring: <span className="text-slate-200">you pay us to format text files.</span> 
                  We do not sell order flow, holding info, or personal data to hedge funds or advertisers.
                </p>
              </div>
            </div>
          </Container>
        </section>

        {/* --- DEEP DIVE: LIFECYCLE & SPECS --- */}
        <section className="py-24 bg-slate-950 border-y border-slate-800 relative">
            {/* Subtle light leak */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>

          <Container>
            <div className="flex flex-col lg:flex-row gap-16 items-start">
              
              {/* Left Column: The Narrative */}
              <div className="lg:w-5/12 pt-4">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                  The Lifecycle of Your File
                </h2>
                <p className="text-slate-400 mb-10 leading-relaxed">
                  Most tax software holds your data forever to "track your portfolio." 
                  We are a formatting utility. We touch it, fix it, and forget it.
                </p>
                
                <div className="space-y-8 relative">
                  {/* Timeline Line */}
                  <div className="absolute top-4 left-4 bottom-4 w-px bg-slate-800"></div>

                  {/* Step 1 */}
                  <div className="relative pl-12">
                    <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-slate-900 border border-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs z-10">1</div>
                    <h4 className="font-semibold text-white flex items-center gap-2">
                        <FileJson className="w-4 h-4 text-emerald-400" />
                        Upload & Encrypt
                    </h4>
                    <p className="text-sm text-slate-400 mt-2">
                      CSV travels via TLS 1.3 and is immediately encrypted with a unique key upon hitting our bucket.
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="relative pl-12">
                    <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-slate-900 border border-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs z-10">2</div>
                    <h4 className="font-semibold text-white flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-yellow-400" />
                        In-Memory Processing
                    </h4>
                    <p className="text-sm text-slate-400 mt-2">
                      Our engine spins up an isolated container. Processing happens in RAM (volatile memory), limiting disk exposure.
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="relative pl-12">
                    <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-red-900/20 border border-red-500/50 text-red-500 flex items-center justify-center font-bold text-xs z-10 animate-pulse">3</div>
                    <h4 className="font-semibold text-white flex items-center gap-2">
                        <Trash2 className="w-4 h-4 text-red-400" />
                        The Purge
                    </h4>
                    <p className="text-sm text-slate-400 mt-2">
                      Once you download your output, the original file, the output file, and the encryption keys are hard-deleted.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: The Visual Terminal */}
              <div className="lg:w-7/12 w-full">
                <div className="bg-[#0f172a] rounded-xl border border-slate-800 overflow-hidden shadow-2xl relative">
                  {/* Terminal Header */}
                  <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                      <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                        <Server className="w-3 h-3" />
                        <span>security_manifest.json</span>
                    </div>
                  </div>

                  {/* Terminal Body */}
                  <div className="p-6 font-mono text-sm relative">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDIiLz4KPC9zdmc+')] opacity-20 pointer-events-none"></div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        {[
                            "AWS WAF Firewall",
                            "DDoS Shield Advanced",
                            "SQL Injection Block",
                            "XSS Mitigation",
                            "TLS 1.3 Transport",
                            "AES-256 Storage",
                            "In-Memory Processing",
                            "Metadata Minimization",
                            "IAM Least-Privilege",
                            "Audit Logging",
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between group">
                                <span className="text-slate-400 group-hover:text-slate-200 transition-colors text-xs">{item}</span>
                                <span className="text-emerald-500 text-[10px] flex items-center gap-1 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                                    <CheckCircle2 className="w-3 h-3" /> ACTIVE
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-800/50">
                      <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/10 p-4 rounded text-xs text-amber-500/80">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 animate-pulse" />
                        <p>
                          <strong className="text-amber-400">WARNING: NON-CUSTODIAL SERVICE.</strong><br/>
                          We cannot recover your files once they are deleted. Please save your outputs immediately.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* --- FAQ SECTION --- */}
        <section className="py-24 relative overflow-hidden">
             {/* Background decorative elements */}
             <div className="absolute -left-20 top-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>

          <Container>
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white mb-4">Security FAQ</h2>
              <p className="text-slate-400">Common questions about our paranoia.</p>
            </div>
            
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
              {[
                {
                  q: "Do you store my API keys?",
                  a: "No. TaxFormatter works exclusively with CSV file uploads. We never ask for, store, or use exchange API keys or Secret keys."
                },
                {
                  q: "Can your employees see my crypto balances?",
                  a: "Our system is automated. While engineers have access to system logs for debugging, we do not inspect individual user files unless explicitly requested via a support ticket."
                },
                {
                  q: "What if the government asks for my data?",
                  a: "Because we enforce a strict retention policy (deleting data after 24 hours), we generally have no transactional data to provide. We only retain basic account metadata."
                },
                {
                  q: "Is the code open source?",
                  a: "The core parsing logic is proprietary, but we are happy to provide architectural documentation to enterprise clients performing due diligence."
                }
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                  <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-slate-400" />
                    {item.q}
                  </h4>
                  <p className="text-slate-400 text-sm leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* --- CTA SECTION --- */}
        <section className="py-24 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900 pointer-events-none"></div>
          <Container>
            <div className="max-w-3xl mx-auto text-center p-12 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 shadow-2xl relative overflow-hidden">
              {/* Shine effect */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-[60px]"></div>
              
              <h2 className="text-3xl font-bold text-white mb-6 relative z-10">
                Ready to file without the stress?
              </h2>
              <p className="text-slate-400 mb-8 text-lg relative z-10">
                Join thousands of traders who fixed their CSVs securely.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
                <Link
                  href="/signup"
                  className="px-8 py-4 bg-emerald-500 text-slate-950 font-bold rounded-lg hover:bg-emerald-400 transition-colors shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)]"
                >
                  Start Secure Upload
                </Link>
                <Link
                  href="/samples"
                  className="px-8 py-4 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors border border-slate-700"
                >
                  View Sample Outputs
                </Link>
              </div>
            </div>
          </Container>
        </section>

      </main>
      <Footer />
    </>
  );
}