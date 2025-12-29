'use client'

import { Container } from '@/components/layout/Container'
import Link from 'next/link'
import { Home } from 'lucide-react'
import { DOCS_SECTIONS } from '@/lib/docs-config'
import { SkipLink } from '@/components/docs/SkipLink'
import { DocsSidebar } from '@/components/docs/DocsSidebar'
import { ThemeToggle } from '@/components/docs/ThemeToggle'

/**
 * Layout component for documentation pages
 * Includes header, sidebar navigation, and main content area
 */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SkipLink />
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 sticky top-0 z-40">
        <Container>
          <div className="py-4 flex items-center justify-between">
            <div>
              <Link href="/" className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100 hover:text-blue-600">
                <Home className="w-5 h-5" />
                Back to Home
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">Documentation</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Learn how to use TaxFormatter</p>
            </div>
            <ThemeToggle />
          </div>
        </Container>
      </div>

      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 py-12">
          <DocsSidebar sections={DOCS_SECTIONS} />

          {/* Main Content */}
          <main id="main-content" className="lg:col-span-3">
            {children}
          </main>
        </div>
      </Container>
    </div>
  )
}
