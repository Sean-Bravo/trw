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
    <div>
      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
      <div className="mt-8 sm:mt-12 p-4 sm:p-6 bg-[var(--color-primary-500)]/5 border border-[var(--color-primary-500)]/20 rounded-xl">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Can't find what you're looking for?</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Use the sidebar navigation to browse all documentation topics, or check out our FAQ section for common questions.
        </p>
      </div>
    </div>
  )
}
