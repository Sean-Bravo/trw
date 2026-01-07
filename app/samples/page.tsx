import { Metadata } from 'next';
import { Header } from '@/components/marketing/Header';
import { Footer } from '@/components/marketing/Footer';
import { Container } from '@/components/layout/Container';
import { Download, FileText, ArrowRight, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sample Outputs | TaxFormatter',
  description: 'See exactly what TaxFormatter produces. Download sample CSV exports for TurboTax, Koinly, and IRS Form 8949.',
};

const samples = [
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
              Test them in your tax software before you commit.
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-400 max-w-xl mx-auto">
              These samples show a typical Coinbase export with 20 transactions, including buys, sells,
              conversions, staking rewards, and transfers.
            </p>
          </div>

          {/* Sample Cards */}
          <div className="grid md:grid-cols-2 gap-6 pb-16">
            {samples.map((sample) => {
              const Icon = sample.icon;
              return (
                <div
                  key={sample.id}
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

                  {/* Issues or Features list */}
                  <div className="mb-5">
                    {sample.issues && (
                      <ul className="space-y-2">
                        {sample.issues.map((issue, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            <span className="text-slate-400 dark:text-slate-300">{issue}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {sample.features && (
                      <ul className="space-y-2">
                        {sample.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                            <span className="text-slate-400 dark:text-slate-300">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Download Button */}
                  <a
                    href={`/samples/${sample.filename}`}
                    download
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${sample.bgColor} ${sample.color} font-medium text-sm hover:opacity-80 transition-opacity`}
                  >
                    <Download className="w-4 h-4" />
                    Download {sample.filename}
                  </a>
                </div>
              );
            })}
          </div>

          {/* How to Use */}
          <div className="bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-8 mb-16">
            <h2 className="font-poppins text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">
              How to Verify Our Output
            </h2>
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-[var(--color-primary-500)] text-white font-bold flex items-center justify-center mx-auto mb-3">
                  1
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Download a Sample</h3>
                <p className="text-sm text-slate-400 dark:text-slate-300">
                  Grab the TurboTax or Koinly format above
                </p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-[var(--color-primary-500)] text-white font-bold flex items-center justify-center mx-auto mb-3">
                  2
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Import to Your Software</h3>
                <p className="text-sm text-slate-400 dark:text-slate-300">
                  Try importing it into TurboTax, Koinly, or your preferred platform
                </p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-[var(--color-primary-500)] text-white font-bold flex items-center justify-center mx-auto mb-3">
                  3
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Verify It Works</h3>
                <p className="text-sm text-slate-400 dark:text-slate-300">
                  See zero errors on import. We guarantee the format so you don't have to map columns manually.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center pb-24">
            <h2 className="font-poppins text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Ready to Fix Your Own CSVs?
            </h2>
            <p className="text-slate-400 dark:text-slate-300 mb-6">
              Upload your messy exchange exports and get clean, tax-ready files in seconds.
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
