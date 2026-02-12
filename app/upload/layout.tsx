import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fix Your Broken Crypto CSV | TaxFormatter',
  description:
    'Upload your broken exchange CSV. Get a clean, tax-software-ready file in seconds. Free during beta.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
