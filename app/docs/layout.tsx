'use client'

import React from 'react'
import { Container } from '@/components/layout/Container'
import Link from 'next/link'
import { Home } from 'lucide-react'

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const sections = [
    {
      title: 'Getting Started',
      slug: 'getting-started',
      pages: [
        { title: 'Upload Your First CSV', slug: 'upload-your-first-csv' },
        { title: 'Supported Exchanges', slug: 'supported-exchanges' },
        { title: 'File Format Requirements', slug: 'file-format-requirements' },
        { title: 'Troubleshooting Upload Errors', slug: 'troubleshooting-upload-errors' },
      ],
    },
    {
      title: 'Understanding Results',
      slug: 'understanding-your-results',
      pages: [
        { title: 'What the Insight Panels Mean', slug: 'what-the-insight-panels-mean' },
        { title: 'Reading Your Formatted CSV', slug: 'reading-your-formatted-csv' },
        { title: 'Free vs Pro Differences', slug: 'free-vs-pro-differences' },
      ],
    },
    {
      title: 'Tax Issues & Flags',
      slug: 'tax-issues-flags',
      pages: [
        { title: 'Wash Sales', slug: 'wash-sales' },
        { title: 'Staking Income', slug: 'staking-income' },
        { title: 'Airdrop Handling', slug: 'airdrop-handling' },
        { title: 'DeFi Classification', slug: 'defi-token-classification' },
        { title: 'Timestamp Issues', slug: 'timestamp-mismatches' },
      ],
    },
    {
      title: 'Exporting Your Data',
      slug: 'exporting-your-data',
      pages: [
        { title: 'Free Tier Export Format', slug: 'free-tier-export-format' },
        { title: 'Pro Tier Flagged CSV', slug: 'pro-tier-flagged-csv' },
        { title: 'TurboTax Integration', slug: 'turbotax-integration' },
        { title: 'Koinly Integration', slug: 'koinly-integration' },
        { title: 'CoinLedger Integration', slug: 'coinledger-integration' },
        { title: 'ZenLedger Integration', slug: 'zenledger-integration' },
      ],
    },
    {
      title: 'FAQ',
      slug: 'faq',
      pages: [
        { title: 'FAQ', slug: 'faq' },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
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
          <aside className="lg:col-span-1 h-fit sticky top-20">
            <nav className="space-y-8">
              {sections.map((section) => (
                <div key={section.slug}>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
                    {section.title}
                  </h3>
                  <ul className="space-y-2">
                    {section.pages.map((page) => (
                      <li key={page.slug}>
                        <Link
                          href={`/docs/${section.slug}/${page.slug}`}
                          className="text-sm text-gray-600 hover:text-blue-600 hover:underline transition-colors"
                        >
                          {page.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            <article className="prose prose-sm max-w-none">
              {children}
            </article>
          </main>
        </div>
      </Container>
    </div>
  )
}