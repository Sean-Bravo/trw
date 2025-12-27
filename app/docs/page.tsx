'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function DocsHome() {
  const sections = [
    {
      title: 'Getting Started',
      description: 'Learn how to upload your CSV and get started with TaxFormatter',
      link: '/docs/getting-started/upload-your-first-csv',
      icon: '🚀',
    },
    {
      title: 'Understanding Results',
      description: 'Understand what the AI insights mean and how to read your formatted data',
      link: '/docs/understanding-your-results',
      icon: '📊',
    },
    {
      title: 'Tax Issues & Flags',
      description: 'Deep dive into wash sales, staking income, airdrops, and other tax issues',
      link: '/docs/tax-issues-flags/wash-sales',
      icon: '⚠️',
    },
    {
      title: 'Exporting Your Data',
      description: 'Export your formatted CSV and integrate with TurboTax, Koinly, and more',
      link: '/docs/exporting-your-data',
      icon: '📤',
    },
    {
      title: 'FAQ',
      description: 'Common questions and answers about TaxFormatter',
      link: '/docs/faq',
      icon: '❓',
    },
    {
      title: 'Support',
      description: 'Get help or contact us with questions',
      link: '/docs/support/contact',
      icon: '💬',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Documentation</h1>
          <p className="text-xl text-gray-600 max-w-2xl">
            Everything you need to know about TaxFormatter. From uploading your first CSV to exporting tax-ready data.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((section) => (
            <Link
              key={section.title}
              href={section.link}
              className="group block p-6 border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg hover:bg-blue-50/30 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <span className="text-4xl">{section.icon}</span>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {section.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-2">{section.description}</p>
                  <div className="flex items-center gap-2 mt-4 text-blue-600 font-semibold text-sm group-hover:gap-3 transition-all">
                    Read more
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Search Suggestion */}
        <div className="mt-16 p-8 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Can't find what you're looking for?</h3>
          <p className="text-gray-600 mb-4">
            Use the sidebar navigation or search above to find the answer. Still stuck?
          </p>
          <a href="/docs/support/contact" className="text-blue-600 hover:underline font-semibold">
            Contact us →
          </a>
        </div>
      </div>
    </div>
  )
}