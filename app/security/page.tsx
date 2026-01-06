import { Metadata } from 'next';
import { Header } from '@/components/marketing/Header';
import { Footer } from '@/components/marketing/Footer';
import { Container } from '@/components/layout/Container';
import { ShieldCheck, Lock, Trash2, EyeOff, Server, FileX, CheckCircle2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Security & Privacy | TaxFormatter',
  description: 'How we protect your financial data. No private keys, 24-hour auto-deletion, and bank-grade encryption.',
};

export default function SecurityPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
        
        {/* Hero Section */}
        <section className="pt-24 pb-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <Container>
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  Bank-Grade Security Standards
                </span>
              </div>
              <h1 className="font-poppins text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-6">
                We Don't Want Your <br className="hidden sm:block" />
                <span className="text-[var(--color-primary-500)]">Private Keys.</span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                TaxFormatter is built on a "Zero-Knowledge" philosophy. We process your CSVs 
                to format them, then we delete them. We never ask for wallet access, 
                API keys with withdrawal permissions, or your seed phrase.
              </p>
            </div>
          </Container>
        </section>

        {/* The 3 Pillars */}
        <section className="py-20">
          <Container>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6">
                  <FileX className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                  The 24-Hour Kill Switch
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  We don't keep your data. Files uploaded to TaxFormatter are processed and 
                  automatically <strong>permanently deleted</strong> from our servers after 24 hours (or instantly upon your request).
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-6">
                  <Lock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                  Encryption at Rest & Transit
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Your files are encrypted using <strong>AES-256</strong> (the banking standard) while they sit in our temporary storage. 
                  All data transmission is secured via TLS 1.3.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mb-6">
                  <EyeOff className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                  We Don't Sell Data
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Our business model is simple: you pay us to format files. We do not sell user data, 
                  order flow, or holding information to hedge funds or advertisers.
                </p>
              </div>
            </div>
          </Container>
        </section>

        {/* Deep Dive: Data Lifecycle */}
        <section className="py-20 bg-slate-100 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800">
          <Container>
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">
                  The Lifecycle of Your File
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8">
                  Most tax software holds your data forever to "track your portfolio." 
                  We are different. We are a formatting utility, not a portfolio tracker. 
                  Here is exactly what happens when you use TaxFormatter:
                </p>
                
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center font-bold text-sm">1</div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">Upload & Encrypt</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        You upload your CSV. It travels via TLS 1.3 and is immediately encrypted with a unique key.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center font-bold text-sm">2</div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">In-Memory Processing</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Our engine spins up an isolated container to process your data in RAM (volatile memory), limiting disk exposure.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-sm">3</div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">The Purge</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Once you download your output (or after 24 hours), the original file, the output file, and the encryption keys are hard-deleted.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Card */}
              <div className="flex-1 w-full">
                <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-20">
                    <Server className="w-32 h-32 text-slate-500" />
                  </div>
                  <h3 className="text-white font-bold text-xl mb-6">Infrastructure Specs</h3>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-slate-300 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span>AWS WAF Application Firewall</span>
                    </li>
                    <li className="flex items-center gap-3 text-slate-300 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span>DDoS Protection via AWS Shield</span>
                    </li>
                    <li className="flex items-center gap-3 text-slate-300 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span>SQL Injection & XSS Protection</span>
                    </li>
                    <li className="flex items-center gap-3 text-slate-300 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span>Rate Limiting on Sensitive Endpoints</span>
                    </li>
                    <li className="flex items-center gap-3 text-slate-300 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span>Automated Abuse & Bot Mitigation</span>
                    </li>
                    <li className="flex items-center gap-3 text-slate-300 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span>Encryption In Transit (TLS 1.2+)</span>
                    </li>
                    <li className="flex items-center gap-3 text-slate-300 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span>Encryption At Rest (AES-256)</span>
                    </li>
                    <li className="flex items-center gap-3 text-slate-300 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span>In-Memory File Processing</span>
                    </li>
                    <li className="flex items-center gap-3 text-slate-300 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span>Minimal Metadata Retention</span>
                    </li>
                    <li className="flex items-center gap-3 text-slate-300 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span>Least-Privilege Access Controls (IAM)</span>
                    </li>
                    <li className="flex items-center gap-3 text-slate-300 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span>Continuous Monitoring & Security Logging</span>
                    </li>
                  </ul>
                  
                  <div className="mt-8 pt-6 border-t border-slate-800">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                      <p className="text-xs text-slate-400">
                        <strong>Note:</strong> We are a non-custodial service. We cannot recover your files once they are deleted. Please save your outputs immediately.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* FAQ */}
        <section className="py-20">
          <Container>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white text-center mb-12">
              Security FAQ
            </h2>
            <div className="max-w-3xl mx-auto space-y-6">
              {[
                {
                  q: "Do you store my API keys?",
                  a: "No. TaxFormatter works exclusively with CSV file uploads. We never ask for, store, or use exchange API keys or Secret keys."
                },
                {
                  q: "Can your employees see my crypto balances?",
                  a: "Our system is automated. While engineers have access to system logs for debugging, we do not inspect individual user files unless explicitly requested via a support ticket for a specific error."
                },
                {
                  q: "What if the government asks for my data?",
                  a: "Because we enforce a strict retention policy (deleting data after 24 hours), we generally have no data to provide regarding past transactions. We only retain account metadata (email, subscription status) as required by law."
                }
              ].map((item, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2">{item.q}</h4>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">{item.a}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* CTA */}
        <section className="py-24 bg-slate-900 text-center">
          <Container>
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-6">
                Ready to file without the stress?
              </h2>
              <p className="text-slate-400 mb-8 text-lg">
                Join thousands of traders who fixed their CSVs securely.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/signup"
                  className="px-8 py-4 bg-[var(--color-primary-500)] text-white font-bold rounded-lg hover:bg-[var(--color-primary-600)] transition-colors"
                >
                  Start Secure Upload
                </Link>
                <Link
                  href="/samples"
                  className="px-8 py-4 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors"
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