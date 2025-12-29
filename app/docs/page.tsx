'use client'

import { DOCS_SECTIONS } from '@/lib/docs-config'
import { DocCard } from '@/components/docs/DocCard'

// Extract to constant outside component to prevent recreation on every render
const HOME_SECTIONS = DOCS_SECTIONS.map(section => ({
  title: section.title,
  description: section.description,
  link: `/docs/${section.slug}`,
  icon: section.icon,
}))

/**
 * Documentation home page showing all available doc sections
 * Displays cards linking to major documentation categories
 */
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
          {HOME_SECTIONS.map((section) => (
            <DocCard
              key={section.title}
              title={section.title}
              description={section.description}
              link={section.link}
              icon={section.icon}
            />
          ))}
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
