import { Metadata } from 'next';
import { Header } from '@/components/marketing/Header';
import { Footer } from '@/components/marketing/Footer';
import { Container } from '@/components/layout/Container';
import { Download, FileText, ArrowRight, CheckCircle2, AlertTriangle, Sparkles, Building2, Table } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sample Outputs | TaxFormatter',
  description: 'Download sample CSVs for TurboTax, Koinly, QuickBooks Online, and Xero. See exactly what TaxFormatter produces.',
};

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

const bankSamples = [
  {
    id: 'bank_raw',
    title: 'Before: Raw Bank Export',
    description: 'A messy Excel (.xls) file typical of regional banks, containing merged cells and page headers.',
    filename: 'sample-bank-statement.xlsx',
    icon: AlertTriangle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    issues: [
      'Merged cells spanning multiple rows',
      'Page headers mixed with transaction data',
      'Running balance mixed with amounts',
      'Non-standard date formats',
    ],
  },
  {
    id: 'qbo',
    title: 'After: QuickBooks Online',
    description: 'Formatted specifically for the QBO "Web Connect" 3-column upload.',
    filename: 'sample-qbo-import.csv',
    icon: Table,
    color: 'text-[#2CA01C]', // QuickBooks Green
    bgColor: 'bg-[#2CA01C]/10',
    borderColor: 'border-[#2CA01C]/20',
    features: [
      'Date, Description, Amount columns only',
      'Reverse sign logic applied (Expenses negative)',
      'Description cleaned of bank codes',
      'Ready for "Banking" tab upload',
    ],
  },
  {
    id: 'xero',
    title: 'After: Xero Format',
    description: 'The strict CSV schema required by Xero for manual bank statement imports.',
    filename: 'sample-xero-import.csv',
    icon: Table,
    color: 'text-[#0ea5e9]', // Xero Blue
    bgColor: 'bg-[#0ea5e9]/10',
    borderColor: 'border-[#0ea5e9]/20',
    features: [
      'Required *Date and *Amount headers',
      'Payee extracted to separate column',
      'Reference field populated',
      'Check numbers preserved',
    ],
  },
];

export default function SamplesPage() {
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

          {/* Bank Section */}
          <div className="mb-20">
            <div className="flex items-center gap-3 mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Building2 className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Bank Reconciliation Samples
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bankSamples.map((sample) => (
                <SampleCard key={sample.id} sample={sample} />
              ))}
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