import { isValidElement, type ReactNode } from 'react'
import type { TocItem } from '@/types/docs'

/**
 * Heading ids for the docs pages.
 *
 * The "On this page" table of contents builds its `#anchor` links from the
 * raw markdown, while the rendered <h2>/<h3> elements get their `id` from the
 * MDX renderer. Both MUST derive the id the same way or every TOC link is
 * dead - which is exactly what happened when the contentlayer pipeline (which
 * added heading ids) was replaced by next-mdx-remote-client (which does not).
 * Keep the slug rule in this one place; nothing else may re-implement it.
 */

/** Markdown inline formatting that is stripped before slugging. */
const INLINE_FORMATTING = /[`*_]/g

export function slugifyHeading(text: string): string {
  return text
    .replace(INLINE_FORMATTING, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/**
 * Returns a slug function that de-duplicates within one document: the second
 * "Request" heading becomes `request-2`, the third `request-3`, so repeated
 * section names stay individually addressable.
 */
export function createHeadingSlugger(): (text: string) => string {
  const seen = new Map<string, number>()
  return (text: string) => {
    const base = slugifyHeading(text)
    const count = (seen.get(base) ?? 0) + 1
    seen.set(base, count)
    return count === 1 ? base : `${base}-${count}`
  }
}

/** `##` and `###` headings only - h1 is the page title and h4+ are not in the TOC. */
const HEADING_LINE = /^(#{2,3})\s+(.+)$/gm

/**
 * Headings in a raw markdown document, with the ids the renderer will give
 * them. The TOC renders these; the MDX heading components must agree.
 */
export function getDocHeadings(content: string): TocItem[] {
  const slug = createHeadingSlugger()
  return [...content.matchAll(HEADING_LINE)].map((match) => {
    const level = match[1]?.length ?? 2
    const text = (match[2] ?? '').replace(INLINE_FORMATTING, '').trim()
    return { id: slug(text), text, level }
  })
}

/**
 * Plain text of a rendered heading: "GET `/v1/sources`" arrives from MDX as
 * ['GET ', <code>/v1/sources</code>] and must slug the same as the markdown
 * source the TOC reads, so inline elements are flattened to their text.
 */
export function getNodeText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(getNodeText).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return getNodeText(node.props.children)
  return ''
}
