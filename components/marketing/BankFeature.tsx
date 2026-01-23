import { Container } from '../layout/Container';
import {
  FileText,
  CheckCircle2,
  ScanLine,
  Table
} from 'lucide-react';

export function BankFeature() {
  return (
    <section className="py-24 relative overflow-hidden bg-slate-50 dark:bg-slate-900/50">

      {/* Subtle Background Elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />
      <div className="absolute -left-40 top-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen" />

      <Container>
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left Column: The Copy */}
          <div className="space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-medium uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              Free During Launch
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white leading-tight">
              Bonus: <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">
                Bank Statement Converter
              </span>
            </h2>

            <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              Need to send statements to your accountant? Turn any <strong>PDF bank statement</strong> into clean CSV files for QuickBooks Online & Xero.
            </p>

            <ul className="space-y-4">
              {[
                'Extract transactions from digital PDF statements',
                'Auto-detect bank format (Chase, BofA, Wells Fargo, Citi)',
                'Export to QuickBooks Online or Xero CSV format',
                'Duplicate detection removes overlapping transactions'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">{item}</span>
                </li>
              ))}
            </ul>

            <div className="pt-4">
              <a
                href="/signup"
                className="inline-flex items-center justify-center h-10 px-6 rounded-full text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 font-semibold text-sm transition-all hover:-translate-y-0.5"
              >
                Try Bank Statement Converter
              </a>
            </div>
          </div>

          {/* Right Column: The Visual Visualization */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-emerald-500/10 rounded-3xl blur-xl transform group-hover:scale-105 transition-transform duration-500" />

            <div className="relative bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-2 shadow-2xl">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 sm:p-8 overflow-hidden relative">

                {/* Visual Logic: Input -> Process -> Output */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">

                  {/* Input: PDF */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm flex flex-col items-center justify-center relative group-hover:-translate-y-2 transition-transform duration-300">
                      <FileText className="w-8 h-8 text-slate-400" />
                      <div className="absolute bottom-2 w-8 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">PDF</div>
                    </div>
                    <span className="text-sm font-medium text-slate-500">Bank Stmt</span>
                  </div>

                  {/* Process: Arrow + Extract Animation */}
                  <div className="flex-1 flex flex-col items-center gap-2">
                    <div className="relative w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-blue-500 to-emerald-500 animate-slide-right" />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-600 dark:text-emerald-400">
                      <ScanLine className="w-3 h-3" />
                      <span>PDF_EXTRACT</span>
                    </div>
                  </div>

                  {/* Output: QBO/Xero */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#2CA01C] to-[#0ea5e9] rounded-xl shadow-lg flex items-center justify-center text-white relative group-hover:-translate-y-2 transition-transform duration-300 delay-75">
                      <Table className="w-10 h-10" />
                      <div className="absolute -bottom-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                        .CSV
                      </div>
                    </div>
                    <span className="text-sm font-medium text-slate-500">QBO Ready</span>
                  </div>
                </div>

                {/* Code Snippet Decoration */}
                <div className="mt-8 p-4 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs overflow-hidden opacity-90">
                  <div className="flex gap-1.5 mb-3 border-b border-slate-800 pb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                    <span className="ml-auto text-slate-500">preview.csv</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex text-slate-500">
                      <span className="w-6 shrink-0 select-none">1</span>
                      <span>Date,Description,Amount</span>
                    </div>
                    <div className="flex text-emerald-400">
                      <span className="w-6 shrink-0 select-none text-slate-600">2</span>
                      <span>01/15/2024,"CHASE CHECKING",-1250.00</span>
                    </div>
                    <div className="flex text-emerald-400">
                      <span className="w-6 shrink-0 select-none text-slate-600">3</span>
                      <span>01/16/2024,"STRIPE TRANSFER",+4500.00</span>
                    </div>
                    <div className="flex text-slate-500 animate-pulse">
                      <span className="w-6 shrink-0 select-none">4</span>
                      <span>|</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </Container>
    </section>
  );
}
