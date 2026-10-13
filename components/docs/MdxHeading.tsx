import type { ReactNode } from 'react'
import { createHeadingSlugger, getNodeText } from '@/lib/docs-headings'

interface HeadingProps {
  children?: ReactNode
  className?: string
  id?: string
}

/**
 * h2/h3 components for the docs MDX renderer. Each heading gets an `id` that
 * matches the TOC link for it (lib/docs-headings.ts), and `scroll-mt-24` so an
 * anchor jump lands the heading below the 65px sticky site header.
 *
 * Call once per document render: the slugger inside de-duplicates repeated
 * headings in document order, which is the order MDX renders them.
 */
export function createMdxHeadings() {
  const slug = createHeadingSlugger()

  const make = (Tag: 'h2' | 'h3') => {
    function MdxHeading({ children, className, id, ...rest }: HeadingProps) {
      const headingId = id ?? slug(getNodeText(children))
      const classes = className ? `scroll-mt-24 ${className}` : 'scroll-mt-24'
      return (
        <Tag id={headingId} className={classes} {...rest}>
          {children}
        </Tag>
      )
    }
    MdxHeading.displayName = `Mdx${Tag.toUpperCase()}`
    return MdxHeading
  }

  return { h2: make('h2'), h3: make('h3') }
}
