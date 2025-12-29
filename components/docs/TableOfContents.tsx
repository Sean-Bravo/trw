'use client'

import { useEffect, useState } from 'react'
import type { TocItem } from '@/types/docs'


interface TableOfContentsProps {
  content: string
}

export function TableOfContents({ content }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    // Extract headings from markdown content
    const headingRegex = /^(#{2,3})\s+(.+)$/gm
    const matches = [...content.matchAll(headingRegex)]

    const tocItems: TocItem[] = matches.map((match) => {
      const level = match[1].length
      const text = match[2].replace(/[`*_]/g, '') // Remove markdown formatting
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

      return { id, text, level }
    })

    setHeadings(tocItems)
  }, [content])

  useEffect(() => {
    // Track active heading on scroll
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

    return () => observer.disconnect()
  }, [headings])

  if (headings.length === 0) return null

  return (
    <div className="hidden xl:block sticky top-28 max-h-[calc(100vh-8rem)] overflow-auto">
      <div className="text-sm">
        <h4 className="font-semibold text-gray-900 mb-4">On this page</h4>
        <nav>
          <ul className="space-y-2">
            {headings.map((heading) => (
              <li
                key={heading.id}
                className={heading.level === 3 ? 'ml-4' : ''}
              >
                <a
                  href={`#${heading.id}`}
                  className={`block py-1 transition-colors ${
                    activeId === heading.id
                      ? 'text-blue-600 font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {heading.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}
