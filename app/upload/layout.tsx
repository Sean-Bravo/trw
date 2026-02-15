import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Convert Bank Statement to CSV | TaxFormatter',
  description:
    'Upload your bank statement PDF. Get a clean CSV, Excel, or QuickBooks file in seconds. Free during beta.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
