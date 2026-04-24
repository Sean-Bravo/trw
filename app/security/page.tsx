import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  Trash2,
  EyeOff,
  Server,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Fingerprint,
  FileJson,
  KeyRound,
  Code2
} from 'lucide-react';

import { HeaderWithSession } from '@/components/marketing/HeaderWithSession';
import { Footer } from '@/components/marketing/Footer';
import { Container } from '@/components/layout/Container';

export const metadata: Metadata = {
  title: 'Security Center | TaxFormatter',
  description: 'Stateless processing, SHA-256 hashed API keys, zero payload logging, and user-controlled retention — across our dashboard, REST API, and MCP server.',
};

export default function SecurityPage() {
  return (
    <>
      <HeaderWithSession />
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
                  STATUS: USER-CONTROLLED RETENTION
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
                TaxFormatter is built on a <span className="text-white font-medium">Zero-Knowledge</span> philosophy —
                across our dashboard, REST API, and MCP server. Files are processed in a volatile memory sandbox,
                never cached, and we give you <span className="text-emerald-400/80">full control</span> over retention.
              </p>

              {/* Stats/Trust Signals */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-800 pt-8">
                {[
                    { label: "API Processing", value: "Stateless" },
                    { label: "Payload Logging", value: "Zero" },
                    { label: "API Keys", value: "SHA-256" },
                    { label: "Transport", value: "TLS 1.3" },
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
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">

              {/* Feature 1: User-Controlled Retention */}
              <div className="group bg-slate-900/40 p-8 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-[0_0_30px_-10px_rgba(16,185,129,0.1)] backdrop-blur-sm">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-emerald-500/20">
                  <Trash2 className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-300 transition-colors">
                  Your Data, Your Rules
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Dashboard uploads are retained for <strong className="text-slate-200">1 year by default</strong> so you can
                  re-download outputs. Toggle &quot;Delete after download&quot; and we&apos;ll purge the file the moment your
                  export completes. API calls go further — they&apos;re fully stateless.
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
                  Files are encrypted with <strong className="text-slate-200">AES-256</strong> at rest and
                  <strong className="text-slate-200"> TLS 1.3</strong> in transit. Even if a bucket was exfiltrated,
                  the bytes would be unreadable static.
                </p>
              </div>

              {/* Feature 3: API & MCP Surface */}
              <div className="group bg-slate-900/40 p-8 rounded-2xl border border-slate-800 hover:border-amber-500/40 transition-all duration-300 hover:shadow-[0_0_30px_-10px_rgba(245,158,11,0.1)] backdrop-blur-sm">
                <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-amber-500/20">
                  <KeyRound className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-amber-300 transition-colors">
                  API &amp; MCP Hardened
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Developer keys are <strong className="text-slate-200">SHA-256 hashed</strong> at rest.
                  Payloads are <strong className="text-slate-200">never logged</strong> — only metadata (key hash, status, byte count, timing).
                  MCP server traffic inherits the same guarantees.
                </p>
              </div>

              {/* Feature 4: Business Model */}
              <div className="group bg-slate-900/40 p-8 rounded-2xl border border-slate-800 hover:border-blue-500/40 transition-all duration-300 hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.1)] backdrop-blur-sm">
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-blue-500/20">
                  <EyeOff className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-300 transition-colors">
                  We Don&apos;t Sell Data
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Our business model is boring: <span className="text-slate-200">you pay us to format files.</span>
                  We don&apos;t sell order flow, holdings info, or personal data to hedge funds or advertisers.
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
                  Most tax software holds your data forever to &quot;track your portfolio.&quot;
                  We&apos;re a formatting utility — dashboard, API, or MCP, you control how long we keep your files.
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
                    <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-slate-900 border border-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs z-10">3</div>
                    <h4 className="font-semibold text-white flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-sky-400" />
                        API &amp; MCP Path
                    </h4>
                    <p className="text-sm text-slate-400 mt-2">
                      REST and MCP calls are <span className="text-white font-medium">fully stateless</span>: your payload never hits disk.
                      We log metadata only (key hash, status, bytes, timing) — never file contents.
                    </p>
                  </div>

                  {/* Step 4 */}
                  <div className="relative pl-12">
                    <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-emerald-900/20 border border-emerald-500/50 text-emerald-500 flex items-center justify-center font-bold text-xs z-10">4</div>
                    <h4 className="font-semibold text-white flex items-center gap-2">
                        <Trash2 className="w-4 h-4 text-emerald-400" />
                        You Decide
                    </h4>
                    <p className="text-sm text-slate-400 mt-2">
                      Dashboard files are kept for 1 year by default, or purged instantly if you toggle &quot;Delete after download.&quot;
                      Anonymized metadata is retained to improve our service.
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
                            "DDoS Shield",
                            "SQL Injection Block",
                            "XSS Mitigation",
                            "TLS 1.3 Transport",
                            "AES-256 at Rest",
                            "Stateless API Lambda",
                            "Zero Payload Logging",
                            "SHA-256 API Keys",
                            "Per-Key Rate Limits",
                            "MCP Server Isolation",
                            "IAM Least-Privilege",
                            "CloudWatch Audit Logs",
                            "Sentry Error Tracking",
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
                  q: "Do you store my exchange API keys?",
                  a: "No. TaxFormatter works exclusively with file uploads (CSV, XLSX, PDF). We never ask for, store, or use exchange API keys, secret keys, or wallet credentials."
                },
                {
                  q: "How are my developer API keys protected?",
                  a: "Your tf_live_ keys are SHA-256 hashed at rest — we can never recover the plaintext. Keys are transmitted only over TLS 1.3. Rate limits and monthly quotas are enforced per key, and you can rotate or revoke any key instantly from the developer dashboard."
                },
                {
                  q: "What does the API actually log?",
                  a: "Metadata only: a hash of your API key, request status, byte size, processing time, and timestamp. We never log file contents, parsed transactions, or request/response bodies. The API Lambda processes your payload in RAM and discards it when the request ends."
                },
                {
                  q: "Is the MCP server safe to run locally?",
                  a: "Yes. @taxformatter/mcp-server is an open-source npm package — the source is public and auditable. It makes outbound HTTPS calls to api.taxformatter.com using your API key and has no disk, network, or system access beyond that."
                },
                {
                  q: "Can your employees see my files?",
                  a: "Our processing is automated. Engineers have access to system logs (metadata only — never payloads) for debugging and incident response. We do not inspect individual user files unless you explicitly request it via a support ticket."
                },
                {
                  q: "What if the government requests my data?",
                  a: "Dashboard files are retained for up to 1 year (or less if you opt in to immediate deletion). API payloads are never stored. If served with a valid legal request, we can only provide what exists — which for API traffic is only anonymized metadata."
                },
                {
                  q: "Is the code open source?",
                  a: "Our SDKs (@taxformatter/sdk, taxformatter for Python) and the MCP server are open source. The core parsing engine is proprietary, but we're happy to share architectural documentation with enterprise clients performing due diligence."
                },
                {
                  q: "Do you support SOC 2 or enterprise due diligence?",
                  a: "We run on AWS with WAF, IAM least-privilege, encrypted storage, and CloudWatch audit logs. Reach out to support@taxformatter.com for our security questionnaire and architecture deep dive."
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