import type { Metadata } from 'next';

// The bank funnel's own destination (bank-statement ads and search land here,
// never on the developer/API pages). Indexable, with its own canonical —
// App Router inherits metadata per field, so without it the root's
// canonical "/" would apply (ARCHITECTURE.md gotcha 12).
export const metadata: Metadata = {
  title: 'Convert a Bank Statement PDF to CSV, Excel, QuickBooks or Xero',
  description:
    'Upload the PDF statement your bank gave you and get back a clean spreadsheet with every transaction on its own row. No signup, files deleted within 30 days.',
  alternates: { canonical: '/bank-statement-to-csv' },
  openGraph: {
    title: 'Convert a Bank Statement PDF to a Spreadsheet | TaxFormatter',
    description:
      'Upload your bank statement PDF. Get a clean CSV, Excel, QuickBooks or Xero file back in about a minute.',
  },
};

export default function BankStatementLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
