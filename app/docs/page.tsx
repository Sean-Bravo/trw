'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { DOCS_SECTIONS } from '@/lib/docs-config'

// Extract to constant outside component to prevent recreation on every render
const HOME_SECTIONS = DOCS_SECTIONS.map(section => ({
  title: section.title,
  description: section.description,
  link: `/docs/${section.slug}`,
  icon: section.icon,
}))

export default function DocsHome() {

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
          {HOME_SECTIONS.map((section) => {
            const Icon = section.icon
            return (
              <Link
                key={section.title}
                href={section.link}
                className="group block p-6 border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg hover:bg-blue-50/30 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <Icon className="w-10 h-10 text-gray-900" />
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
            )
          })}
        </div>

        {/* Help Section */}
        <div className="mt-16 p-8 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Can't find what you're looking for?</h3>
          <p className="text-gray-600">
            Use the sidebar navigation to browse all documentation topics, or check out our FAQ section for common questions.
          </p>
        </div>
      </div>
    </div>
  )
}