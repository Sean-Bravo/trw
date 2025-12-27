import { allDocs } from '.contentlayer/generated'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { MDXContent } from './mdx-content'

interface DocPageProps {
  params: Promise<{
    slug: string[]
  }>
}

export default async function DocPage({ params }: DocPageProps) {
  const { slug } = await params
  const path = `docs/${slug.join('/')}`
  const doc = allDocs.find(
    (d) => d._raw.flattenedPath === path.replace(/^docs\//, '')
  )

  if (!doc) {
    notFound()
  }

  return (
    <article className="prose prose-sm max-w-none dark:prose-invert">
      <div className="mb-8 pb-8 border-b border-gray-200">
        <Link
          href="/docs"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Docs
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{doc.title}</h1>
        {doc.description && (
          <p className="text-lg text-gray-600">{doc.description}</p>
        )}
      </div>

      <div className="prose prose-sm max-w-none">
        <MDXContent code={doc.body.code} />
      </div>

      <div className="mt-12 pt-8 border-t border-gray-200 flex items-center justify-between">
        <Link
          href="/docs"
          className="text-blue-600 hover:underline font-semibold flex items-center gap-2"
        >
          ← View all docs
        </Link>
        <Link
          href="/docs/support/contact"
          className="text-gray-600 hover:text-gray-900 text-sm"
        >
          Have a question? Contact us
        </Link>
      </div>
    </article>
  )
}

export async function generateStaticParams() {
  return allDocs.map((doc) => ({
    slug: doc._raw.flattenedPath.split('/'),
  }))
}