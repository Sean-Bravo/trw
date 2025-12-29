import { allDocs } from '.contentlayer/generated'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { Suspense } from 'react'
import { DocsSkeleton } from '@/components/docs/DocsSkeleton'
import { Breadcrumbs } from '@/components/docs/Breadcrumbs'
import { TableOfContents } from '@/components/docs/TableOfContents'
import { MDXErrorBoundary } from '@/components/docs/MDXErrorBoundary'
import { PrevNextNav } from '@/components/docs/PrevNextNav'
import { FeedbackWidget } from '@/components/docs/FeedbackWidget'
import { DOCS_SECTIONS } from '@/lib/docs-config'
import { getPrevNextDocs, getReadingTime } from '@/lib/docs-utils'
import { MDXContent } from './mdx-content'
import type { BreadcrumbItem } from '@/types/docs'

interface DocPageProps {
  params: Promise<{
    slug: string[]
  }>
}

export async function generateMetadata({ params }: DocPageProps): Promise<Metadata> {
  const { slug } = await params
  const slugPath = slug.join('/')
  const doc = allDocs.find((doc) => doc.url === `/docs/${slugPath}`)

  if (!doc) {
    return {
      title: 'Page Not Found - TaxFormatter Docs',
      description: 'The requested documentation page could not be found.',
    }
  }

  const title = `${doc.title} - TaxFormatter Docs`
  const description = doc.description || `Learn about ${doc.title} in TaxFormatter documentation`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `https://taxformatter.com${doc.url}`,
      siteName: 'TaxFormatter',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `https://taxformatter.com${doc.url}`,
    },
  }
}

export default async function DocPage({ params }: DocPageProps) {
  const { slug } = await params
  const slugPath = slug.join('/')
  const doc = allDocs.find((doc) => doc.url === `/docs/${slugPath}`)

  if (!doc) {
    notFound()
  }

  // Build breadcrumbs
  const section = DOCS_SECTIONS.find(s =>
    doc.url.includes(`/docs/${s.slug}`)
  )

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Documentation', href: '/docs' },
  ]

  if (section) {
    breadcrumbItems.push({
      label: section.title,
      href: `/docs/${section.slug}`
    })
  }

  breadcrumbItems.push({ label: doc.title })

  // Get prev/next pages
  const { prev, next } = getPrevNextDocs(doc.url)

  // Calculate reading time
  const readingTime = getReadingTime(doc.body.raw)

  return (
    <div className="flex gap-8">
      <article className="flex-1 prose prose-sm max-w-none dark:prose-invert">
        <div className="mb-8 pb-8 border-b border-gray-200">
          <Breadcrumbs items={breadcrumbItems} />
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{doc.title}</h1>
          {doc.description && (
            <p className="text-lg text-gray-600">{doc.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500 mt-4">
            <span>{readingTime} min read</span>
          </div>
        </div>

        <MDXErrorBoundary>
          <Suspense fallback={<DocsSkeleton />}>
            <div>
              <MDXContent code={doc.body.code} />
            </div>
          </Suspense>
        </MDXErrorBoundary>

        <PrevNextNav prev={prev} next={next} />

        <FeedbackWidget pageUrl={doc.url} />

        <div className="mt-8 pt-8 border-t border-gray-200">
          <Link
            href="/docs"
            className="text-blue-600 hover:underline font-semibold flex items-center gap-2"
          >
            ← View all docs
          </Link>
        </div>
      </article>

      <TableOfContents content={doc.body.raw} />
    </div>
  )
}

export async function generateStaticParams() {
  return allDocs.map((doc) => ({
    slug: doc.url.replace('/docs/', '').split('/'),
  }))
}
