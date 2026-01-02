'use client'

import { useEffect, useState } from 'react'
import type { TocItem } from '@/types/docs'


interface TableOfContentsProps {
  content: string
}

export function TableOfContents({ content }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [readProgress, setReadProgress] = useState(0)

  useEffect(() => {
    // Extract headings from markdown content
    const headingRegex = /^(#{2,3})\s+(.+)$/gm
    const matches = [...content.matchAll(headingRegex)]

    const tocItems: TocItem[] = matches.map((match) => {
      const level = match[1]?.length || 2
      const text = match[2]?.replace(/[`*_]/g, '') || '' // Remove markdown formatting
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

      return { id, text, level }
    })

    setHeadings(tocItems)
  }, [content])

  useEffect(() => {
    // Track active heading and reading progress on scroll
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
      setReadProgress(progress)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: '-80px 0px -80% 0px' }
    )

    const headingElements = document.querySelectorAll('h2, h3')
    headingElements.forEach((el) => observer.observe(el))

    window.addEventListener('scroll', handleScroll)

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', handleScroll)
    }
  }, [headings])

  if (headings.length === 0) return null

  return (
    <div className="hidden xl:block sticky top-36 max-h-[calc(100vh-10rem)] overflow-auto">
      <div className="relative">
        {/* Progress indicator bar */}
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="w-full bg-gradient-to-b from-[var(--color-primary-500)] to-[var(--color-accent-500)] transition-all duration-150"
            style={{ height: `${readProgress}%` }}
          />
        </div>

        <div className="text-sm pl-4">
          <h4 className="font-semibold text-slate-900 dark:text-white mb-4">On this page</h4>
          <nav>
            <ul className="space-y-2">
              {headings.map((heading, index) => {
                const isActive = activeId === heading.id
                const progressToHeading = ((index + 1) / headings.length) * 100

                return (
                  <li
                    key={heading.id}
                    className={heading.level === 3 ? 'ml-3' : ''}
                  >
                    <a
                      href={`#${heading.id}`}
                      className={`block py-1 transition-all duration-200 ${
                        isActive
                          ? 'text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)] font-medium'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {heading.text}
                    </a>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  )
}
