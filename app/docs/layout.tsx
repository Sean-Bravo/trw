'use client'

import { useState, useEffect } from 'react'
import { Container } from '@/components/layout/Container'
import Link from 'next/link'
import { Home, Menu, X } from 'lucide-react'
import { DOCS_SECTIONS } from '@/lib/docs-config'
import { SkipLink } from '@/components/docs/SkipLink'
import { DocsSidebar } from '@/components/docs/DocsSidebar'
import { Logo } from '@/components/ui/Logo'

/**
 * Layout component for documentation pages
 * Includes header, sidebar navigation, and main content area
 */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
      setScrollProgress(progress)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close sidebar when route changes (for mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <SkipLink />

      {/* Header with gradient accent bar */}
      <div className="sticky top-0 z-40">
        {/* Progress bar */}
        <div className="h-1 bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-accent-500)] transition-all duration-150"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-700/50">
          <Container>
            <div className="py-3 sm:py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-6">
                {/* Mobile menu button */}
                <button
                  type="button"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
                >
                  {sidebarOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </button>
                <Logo className="h-7 sm:h-8 w-auto" />
                <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-700" />
                <Link
                  href="/"
                  className="hidden sm:flex items-center gap-2 text-sm text-slate-400 dark:text-slate-300 hover:text-[var(--color-primary-500)] transition-colors group"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-accent-500)] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Home className="w-4 h-4 text-white" />
                  </div>
                  Home
                </Link>
              </div>
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[var(--color-primary-500)]/10 text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]">
                  Docs
                </span>
              </div>
            </div>
          </Container>
        </div>
      </div>

      {/* Page Title Section */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <Container>
          <div className="py-6 sm:py-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Documentation</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 text-sm sm:text-base">
              Everything you need to know about TaxFormatter. From uploading your first CSV to exporting tax-ready data.
            </p>
          </div>
        </Container>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed top-0 left-0 z-40 h-full w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <span className="font-semibold text-slate-900 dark:text-white">Navigation</span>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100%-65px)]">
          <DocsSidebar sections={DOCS_SECTIONS} onLinkClick={() => setSidebarOpen(false)} />
        </div>
      </div>

      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 py-8 sm:py-12">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block">
            <DocsSidebar sections={DOCS_SECTIONS} />
          </div>

          {/* Main Content */}
          <main id="main-content" className="lg:col-span-3 min-w-0">
            {children}
          </main>
        </div>
      </Container>
    </div>
  )
}
