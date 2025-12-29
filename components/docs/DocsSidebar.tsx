'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { DocSection } from '@/types/docs'
import { cn } from '@/lib/utils'

interface DocsSidebarProps {
  sections: DocSection[]
}

/**
 * Sidebar navigation component for documentation pages
 * Shows all doc sections and pages with active state highlighting
 */
export function DocsSidebar({ sections }: DocsSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="lg:col-span-1 h-fit sticky top-20" aria-label="Documentation navigation">
      <nav aria-label="Docs sidebar" className="space-y-8">
        {sections.map((section) => (
          <div key={section.slug}>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide mb-3">
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
                      className={cn(
                        'text-sm transition-colors',
                        isActive
                          ? 'text-blue-600 dark:text-blue-400 font-semibold'
                          : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'
                      )}
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
  )
}
