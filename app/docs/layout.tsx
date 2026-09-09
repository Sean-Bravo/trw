import type { Metadata } from 'next';
import { DocsShell } from '@/components/docs/DocsShell';

export const metadata: Metadata = {
  alternates: { canonical: '/docs' },
  // Re-declare the template: a nested layout that sets a plain string title
  // stops passing the root template down to its child segments.
  title: { default: 'Documentation', template: '%s | TaxFormatter' },
  description:
    'TaxFormatter documentation: REST API reference, MCP server setup, supported exchanges and bank formats, and output schemas.',
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <DocsShell>{children}</DocsShell>;
}
