import type { LucideIcon } from 'lucide-react'

/**
 * Individual documentation page within a section
 */
export interface DocPage {
  title: string
  slug: string
  /**
   * Optional explicit href. Overrides the default `/docs/<section>/<slug>`
   * computed by the sidebar — used for single-page sections (e.g. FAQ) whose
   * content lives at the section root (`/docs/faq`) rather than a nested URL.
   */
  href?: string
}

/**
 * Documentation section containing multiple pages
 */
export interface DocSection {
  title: string
  slug: string
  description: string
  icon: LucideIcon
  pages: DocPage[]
}

/**
 * Breadcrumb item for navigation
 */
export interface BreadcrumbItem {
  label: string
  href?: string
}

/**
 * Navigation link for prev/next navigation
 */
export interface NavLink {
  title: string
  url: string
}

/**
 * Table of contents heading
 */
export interface TocItem {
  id: string
  text: string
  level: number
}
