'use client';

import { useState } from 'react';
import { Header } from '@/components/marketing/Header';
import { Footer } from '@/components/marketing/Footer';
import { Container } from '@/components/layout/Container';
import { Download, FileText, ArrowRight, CheckCircle2, AlertTriangle, Sparkles, Building2, Table } from 'lucide-react';
import Link from 'next/link';

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

const cryptoSamples = [
  {
    id: 'before',
    title: 'Before: Raw Coinbase Export',
    description: 'A typical messy CSV with inconsistent dates, missing values, and formatting issues.',
    filename: 'sample-before-coinbase.csv',
    icon: AlertTriangle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    issues: [
      'Inconsistent date formats (ISO vs MM/DD/YYYY)',
      'Missing timestamps on some rows',
      'Empty transaction types',
      'N/A values instead of proper dates',
    ],
  },
  {
    id: 'turbotax',
    title: 'After: TurboTax Ready',
    description: 'Clean CSV formatted for direct TurboTax import with calculated gains/losses.',
    filename: 'sample-after-turbotax.csv',
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    features: [
      'Properly formatted dates',
      'Calculated cost basis',
      'Short/Long term classification',
      'Ready for Schedule D',
    ],
  },
  {
    id: 'koinly',
    title: 'After: Koinly Format',
    description: 'Universal format compatible with Koinly and most crypto tax platforms.',
    filename: 'sample-after-koinly.csv',
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    features: [
      'Standard column structure',
      'Proper transaction labels',
      'Fee tracking included',
      'Staking rewards categorized',
    ],
  },
  {
    id: 'form8949',
    title: 'After: IRS Form 8949',
    description: 'Official IRS format for reporting cryptocurrency disposals.',
    filename: 'sample-after-form8949.csv',
    icon: FileText,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    features: [
      'IRS-compliant columns (a) through (h)',
      'Proper gain/loss calculations',
      'Adjustment codes ready',
      'Import to any tax software',
    ],
  },
];


export default function SamplesPage() {
  const [selectedBankIndex, setSelectedBankIndex] = useState(0);
  const selectedBank = SAMPLE_BANKS[selectedBankIndex]!;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        <Container>
          {/* Hero */}
          <div className="py-16 sm:py-24 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-[var(--color-primary-500)]/10 border border-[var(--color-primary-500)]/20">
              <Sparkles className="w-4 h-4 text-[var(--color-primary-500)]" />
              <span className="text-sm font-semibold text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]">
                See Before You Buy
              </span>
            </div>
            <h1 className="font-poppins text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              Sample Output Downloads
            </h1>
            <p className="text-lg text-slate-400 dark:text-slate-300 max-w-2xl mx-auto mb-4">
              Don't take our word for it. Download real sample outputs and see exactly what TaxFormatter produces.
              Test them in your software before you commit.
            </p>
          </div>

          {/* Crypto Section */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <FileText className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Crypto Tax Samples
              </h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {cryptoSamples.map((sample) => (
                <SampleCard key={sample.id} sample={sample} />
              ))}
            </div>
          </div>

          {/* Bank Section - Interactive */}
          <div id="bank-samples" className="mb-20 scroll-mt-24">
            <div className="flex items-center gap-3 mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Building2 className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Bank Reconciliation Samples
              </h2>
            </div>

            {/* Bank Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {SAMPLE_BANKS.map((bank, i) => (
                <button
                  key={bank.name}
                  onClick={() => setSelectedBankIndex(i)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedBankIndex === i
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  {bank.name}
                </button>
              ))}
            </div>

            {/* Before/After Tables */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Before: PDF Extract */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-xs font-bold uppercase">
                    Before
                  </div>
                  <span className="text-sm text-slate-500">Raw PDF Data</span>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-500" />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {selectedBank.name} - {selectedBank.type}.pdf
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
                        {selectedBank.before.map((row, i) => (
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
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                    <Table className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      {selectedBank.name.toLowerCase().replace(/ /g, '-')}-qbo.xlsx
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
                        {selectedBank.after.map((row, i) => (
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

            {/* Pro/Premium CTA */}
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-900/20 dark:to-emerald-900/20 rounded-xl border border-blue-200 dark:border-blue-800 text-center">
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                Bank Statement Formatter is available for <span className="font-semibold text-blue-600 dark:text-blue-400">Pro</span> and <span className="font-semibold text-emerald-600 dark:text-emerald-400">Premium</span> users
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center h-10 px-6 rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Upgrade to Access
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center pb-24">
            <h2 className="font-poppins text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Ready to Fix Your Files?
            </h2>
            <p className="text-slate-400 dark:text-slate-300 mb-6">
              Upload your messy bank or crypto exports and get clean files in seconds.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-600)] text-white font-semibold rounded-lg transition-colors"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}

// Extracted Card Component for cleaner code
function SampleCard({ sample }: { sample: any }) {
  const Icon = sample.icon;
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-2xl border ${sample.borderColor} p-6 shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-12 h-12 rounded-xl ${sample.bgColor} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-6 h-6 ${sample.color}`} />
        </div>
        <div>
          <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
            {sample.title}
          </h3>
          <p className="text-sm text-slate-400 dark:text-slate-300 mt-1">
            {sample.description}
          </p>
        </div>
      </div>

      <div className="mb-5">
        <ul className="space-y-2">
          {(sample.issues || sample.features).map((item: string, idx: number) => (
            <li key={idx} className="flex items-start gap-2 text-sm">
              {sample.issues ? (
                <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              )}
              <span className="text-slate-400 dark:text-slate-300">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <a
        href={`/samples/${sample.filename}`}
        download
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${sample.bgColor} ${sample.color} font-medium text-sm hover:opacity-80 transition-opacity w-full justify-center`}
      >
        <Download className="w-4 h-4" />
        Download {sample.filename.split('.').pop()?.toUpperCase()}
      </a>
    </div>
  );
}