'use client'

import { Container } from '@/components/layout/Container'
import Link from 'next/link'
import { Home } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { DOCS_SECTIONS } from '@/lib/docs-config'
import { SkipLink } from '@/components/docs/SkipLink'

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-50">
      <SkipLink />
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-40">
        <Container>
          <div className="py-4">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold text-gray-900 hover:text-blue-600">
              <Home className="w-5 h-5" />
              Back to Home
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">Documentation</h1>
            <p className="text-gray-600 mt-1">Learn how to use TaxFormatter</p>
          </div>
        </Container>
      </div>

      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 py-12">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1 h-fit sticky top-20" aria-label="Documentation navigation">
            <nav aria-label="Docs sidebar" className="space-y-8">
              {DOCS_SECTIONS.map((section) => (
                <div key={section.slug}>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
                    {section.title}
                  </h3>
                  <ul className="space-y-2">
                    {section.pages.map((page) => {
                      const href = `/docs/${section.slug}/${page.slug}`
                      const isActive = pathname === href

                      return (
                        <li key={page.slug}>
                          <Link
                            href={href}
                            className={`text-sm transition-colors ${
                              isActive
                                ? 'text-blue-600 font-semibold'
                                : 'text-gray-600 hover:text-blue-600 hover:underline'
                            }`}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            {page.title}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main id="main-content" className="lg:col-span-3">
            {children}
          </main>
        </div>
      </Container>
    </div>
  )
}