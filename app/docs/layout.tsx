import type { Metadata } from 'next';
import { DocsShell } from '@/components/docs/DocsShell';

export const metadata: Metadata = {
  alternates: { canonical: '/docs' },
  title: 'Documentation',
  description:
    'TaxFormatter documentation: REST API reference, MCP server setup, supported exchanges and bank formats, and output schemas.',
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <DocsShell>{children}</DocsShell>;
}
