import { allDocs } from '.contentlayer/generated'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { MDXContent } from './mdx-content'
import { Metadata } from 'next'

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

      <div className="mt-12 pt-8 border-t border-gray-200">
        <Link
          href="/docs"
          className="text-blue-600 hover:underline font-semibold flex items-center gap-2"
        >
          ← View all docs
        </Link>
      </div>
    </article>
  )
}

export async function generateStaticParams() {
  return allDocs.map((doc) => ({
    slug: doc.url.replace('/docs/', '').split('/'),
  }))
}