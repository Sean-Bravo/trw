'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { DocSection } from '@/types/docs'
import { cn } from '@/lib/utils'
import { FileText, Book, Settings, HelpCircle } from 'lucide-react'

interface DocsSidebarProps {
  sections: DocSection[]
}

const sectionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'getting-started': Book,
  'guides': FileText,
  'api': Settings,
  'faq': HelpCircle,
}

/**
 * Sidebar navigation component for documentation pages
 * Shows all doc sections and pages with active state highlighting
 */
export function DocsSidebar({ sections }: DocsSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="lg:col-span-1 h-fit sticky top-36" aria-label="Documentation navigation">
      <nav aria-label="Docs sidebar" className="space-y-6">
        {sections.map((section) => {
          const Icon = sectionIcons[section.slug] || FileText

          return (
            <div key={section.slug} className="group">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-[var(--color-primary-500)]/10 flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5 text-[var(--color-primary-500)]" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                  {section.title}
                </h3>
              </div>
              <ul className="space-y-1 ml-8 border-l border-slate-200 dark:border-slate-700 pl-4">
                {section.pages.map((page) => {
                  const href = `/docs/${section.slug}/${page.slug}`
                  const isActive = pathname === href

                  return (
                    <li key={page.slug}>
                      <Link
                        href={href}
                        className={cn(
                          'block text-sm py-1.5 transition-all duration-200 relative',
                          isActive
                            ? 'text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)] font-semibold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-[var(--color-primary-500)]'
                        )}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {/* Active indicator */}
                        {isActive && (
                          <span className="absolute -left-4 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gradient-to-b from-[var(--color-primary-500)] to-[var(--color-accent-500)] rounded-full" />
                        )}
                        {page.title}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
