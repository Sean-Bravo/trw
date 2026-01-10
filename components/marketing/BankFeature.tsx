'use client';

import React, { useState } from 'react';
import { Container } from '../layout/Container';
import {
  FileText,
  CheckCircle2,
  ScanLine,
  Table,
  X,
  ArrowRight,
  Building2
} from 'lucide-react';

const SAMPLE_BANKS = [
  {
    name: 'Chase Business',
    type: 'Checking',
    before: [
      { date: 'Jan 15', desc: 'CHASE CREDIT CRD AUTOPAY', debit: '1,250.00', credit: '', balance: '12,450.00' },
      { date: '', desc: '000000001234567', debit: '', credit: '', balance: '' },
      { date: 'Jan 16', desc: 'STRIPE TRANSFER', debit: '', credit: '4,500.00', balance: '16,950.00' },
      { date: 'Jan 17', desc: 'GUSTO 000-PAYROLL', debit: '8,200.00', credit: '', balance: '8,750.00' },
    ],
    after: [
      { date: '01/15/2024', desc: 'CHASE CREDIT CRD AUTOPAY 000000001234567', amount: '-1250.00' },
      { date: '01/16/2024', desc: 'STRIPE TRANSFER', amount: '4500.00' },
      { date: '01/17/2024', desc: 'GUSTO 000-PAYROLL', amount: '-8200.00' },
    ]
  },
  {
    name: 'Bank of America',
    type: 'Business Checking',
    before: [
      { date: '01/18/24', desc: 'AMAZON WEB SERVICES', debit: '847.23', credit: '', balance: '45,102.77' },
      { date: '01/19/24', desc: 'ACH DEPOSIT - CLIENT ABC', debit: '', credit: '15,000.00', balance: '60,102.77' },
      { date: '01/20/24', desc: 'QUICKBOOKS PAYROLL', debit: '12,500.00', credit: '', balance: '47,602.77' },
    ],
    after: [
      { date: '01/18/2024', desc: 'AMAZON WEB SERVICES', amount: '-847.23' },
      { date: '01/19/2024', desc: 'ACH DEPOSIT - CLIENT ABC', amount: '15000.00' },
      { date: '01/20/2024', desc: 'QUICKBOOKS PAYROLL', amount: '-12500.00' },
    ]
  },
  {
    name: 'Wells Fargo',
    type: 'Platinum Business',
    before: [
      { date: 'January 21, 2024', desc: 'BILL PAY - COMCAST', debit: '289.99', credit: '', balance: '23,456.01' },
      { date: 'January 22, 2024', desc: 'MOBILE DEPOSIT', debit: '', credit: '2,500.00', balance: '25,956.01' },
      { date: 'January 23, 2024', desc: 'WIRE TRANSFER OUT', debit: '5,000.00', credit: '', balance: '20,956.01' },
    ],
    after: [
      { date: '01/21/2024', desc: 'BILL PAY - COMCAST', amount: '-289.99' },
      { date: '01/22/2024', desc: 'MOBILE DEPOSIT', amount: '2500.00' },
      { date: '01/23/2024', desc: 'WIRE TRANSFER OUT', amount: '-5000.00' },
    ]
  }
];

export function BankFeature() {
  const [showSamples, setShowSamples] = useState(false);
  const [selectedBank, setSelectedBank] = useState(0);

  return (
    <>
    <section className="py-24 relative overflow-hidden bg-slate-50 dark:bg-slate-900/50">

      {/* Subtle Background Elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />
      <div className="absolute -left-40 top-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen" />

      <Container>
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left Column: The Copy */}
          <div className="space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-medium uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Now Beta Testing
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white leading-tight">
              We conquered Crypto. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">
                Now we're fixing your Books.
              </span>
            </h2>

            <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              Same pain, different format. You used us to clean up messy crypto CSVs for tax season. Now, use us to turn <strong>locked PDF bank statements</strong> into clean, importable Excel (XLS) files for QuickBooks & Xero.
            </p>

            <ul className="space-y-4">
              {[
                'Extract data from non-selectable PDF scans',
                'Auto-detect credits, debits, and balances',
                'Formatted specifically for Xero & QBO import',
                'Support for Chase, Wells Fargo, Amex, and 50+ others'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">{item}</span>
                </li>
              ))}
            </ul>

            <div className="pt-4">
               <button
                 onClick={() => setShowSamples(true)}
                 className="inline-flex items-center justify-center h-10 px-6 rounded-full text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)] border-2 border-[var(--color-primary-500)]/30 bg-white dark:bg-slate-900 hover:bg-[var(--color-primary-50)] dark:hover:bg-[var(--color-primary-500)]/10 hover:border-[var(--color-primary-500)]/50 hover:-translate-y-0.5 transition-all duration-300 font-semibold text-sm"
               >
                 See a Bank PDF Demo
                 <ArrowRight className="ml-2 h-4 w-4" />
               </button>
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

                  {/* Process: Arrow + OCR Animation */}
                  <div className="flex-1 flex flex-col items-center gap-2">
                    <div className="relative w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-blue-500 to-emerald-500 animate-slide-right" />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-600 dark:text-emerald-400">
                      <ScanLine className="w-3 h-3" />
                      <span>OCR_EXTRACT</span>
                    </div>
                  </div>

                  {/* Output: QBO/Xero */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#2CA01C] to-[#0ea5e9] rounded-xl shadow-lg flex items-center justify-center text-white relative group-hover:-translate-y-2 transition-transform duration-300 delay-75">
                      <Table className="w-10 h-10" />
                      <div className="absolute -bottom-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                        .XLS
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

    {/* Samples Modal */}
    {showSamples && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
          onClick={() => setShowSamples(false)}
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-800">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Bank Reconciliation Samples</h3>
              <p className="text-sm text-slate-500">See how we transform messy PDF data into clean Excel files</p>
            </div>
            <button
              onClick={() => setShowSamples(false)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Bank Tabs */}
          <div className="flex gap-2 px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            {SAMPLE_BANKS.map((bank, i) => (
              <button
                key={bank.name}
                onClick={() => setSelectedBank(i)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedBank === i
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Building2 className="w-4 h-4" />
                {bank.name}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Before: PDF Extract */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-xs font-bold uppercase">
                    Before
                  </div>
                  <span className="text-sm text-slate-500">Raw PDF Data</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-500" />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {SAMPLE_BANKS[selectedBank].name} - {SAMPLE_BANKS[selectedBank].type}.pdf
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="px-3 py-2 text-left font-medium text-slate-500">Date</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-500">Description</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-500">Debit</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-500">Credit</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-500">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {SAMPLE_BANKS[selectedBank].before.map((row, i) => (
                          <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">{row.date}</td>
                            <td className="px-3 py-2 text-slate-900 dark:text-white font-mono">{row.desc}</td>
                            <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">{row.debit}</td>
                            <td className="px-3 py-2 text-right text-emerald-600 dark:text-emerald-400">{row.credit}</td>
                            <td className="px-3 py-2 text-right text-slate-500">{row.balance}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Issues: Inconsistent dates, multi-line descriptions, separate debit/credit columns
                    </p>
                  </div>
                </div>
              </div>

              {/* After: Excel Output */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded text-xs font-bold uppercase">
                    After
                  </div>
                  <span className="text-sm text-slate-500">QBO-Ready Excel</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                    <Table className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      {SAMPLE_BANKS[selectedBank].name.toLowerCase().replace(/ /g, '-')}-qbo.xlsx
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="px-3 py-2 text-left font-medium text-slate-500">Date</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-500">Description</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-500">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {SAMPLE_BANKS[selectedBank].after.map((row, i) => (
                          <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono">{row.date}</td>
                            <td className="px-3 py-2 text-slate-900 dark:text-white">{row.desc}</td>
                            <td className={`px-3 py-2 text-right font-mono ${
                              row.amount.startsWith('-')
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {row.amount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border-t border-emerald-200 dark:border-emerald-800">
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      Ready for QBO import: MM/DD/YYYY dates, merged descriptions, single amount column
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-900/20 dark:to-emerald-900/20 rounded-xl border border-blue-200 dark:border-blue-800 text-center">
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                Available for <span className="font-semibold text-blue-600 dark:text-blue-400">Pro</span> and <span className="font-semibold text-emerald-600 dark:text-emerald-400">Premium</span> users
              </p>
              <a
                href="/pricing"
                className="inline-flex items-center justify-center h-10 px-6 rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Upgrade to Access
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
