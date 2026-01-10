import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sample Outputs | TaxFormatter',
  description: 'Download sample CSVs for TurboTax, Koinly, QuickBooks Online, and Xero. See exactly what TaxFormatter produces.',
};

export default function SamplesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
