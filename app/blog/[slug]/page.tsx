import { allPosts } from 'contentlayer/generated'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { format } from 'date-fns'
import { HeaderWithSession } from '@/components/marketing/HeaderWithSession'
import { Footer } from '@/components/marketing/Footer'
import { Container } from '@/components/layout/Container'
import { Calendar, Clock, ArrowLeft, Hash } from 'lucide-react'
import Link from 'next/link'
import { ArticleSchema } from '@/components/seo/ArticleSchema'
import { MDXContent } from '@/components/blog/MDXContent'

interface BlogPostProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: BlogPostProps): Promise<Metadata> {
  const { slug } = await params
  const post = allPosts.find((post) => post.slug === slug)

  if (!post) {
    return { title: 'Post Not Found' }
  }

  const ogParams = new URLSearchParams({
    title: post.title,
    description: post.description,
    category: post.category,
    readingTime: String(post.readingTime),
  })
  const ogImageUrl = `https://taxformatter.com/api/og?${ogParams.toString()}`

  return {
    title: `${post.title} | TaxFormatter`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      url: `https://taxformatter.com${post.url}`,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: `https://taxformatter.com${post.url}`,
    },
  }
}

export default async function BlogPost({ params }: BlogPostProps) {
  const { slug } = await params
  const post = allPosts.find((post) => post.slug === slug)

  if (!post) notFound()

  return (
    <>
      <ArticleSchema
        title={post.title}
        description={post.description}
        url={post.url}
        datePublished={post.date}
        author={post.author}
        image={post.image}
        category={post.category}
        tags={post.tags}
      />
      <HeaderWithSession />

      <main className="min-h-screen bg-white dark:bg-slate-950">

        {/* Article Header */}
        <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <Container>
            <div className="pt-24 pb-12 max-w-4xl mx-auto">

              {/* Back Link */}
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 font-medium transition-colors mb-8 text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Engineering Blog
              </Link>

              {/* Meta Tags */}
              <div className="flex flex-wrap gap-4 mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide">
                  <Hash className="w-3 h-3" />
                  {post.category}
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-400 text-sm font-medium">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(post.date), 'MMMM d, yyyy')}
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-400 text-sm font-medium">
                  <Clock className="w-4 h-4" />
                  {post.readingTime} min read
                </span>
              </div>

              <h1 className="font-poppins text-3xl sm:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                {post.title}
              </h1>

              <p className="text-xl text-slate-400 leading-relaxed max-w-3xl">
                {post.description}
              </p>
            </div>
          </Container>
        </div>

        <Container>
          <div className="flex flex-col lg:flex-row gap-12 py-12 max-w-6xl mx-auto">

            {/* Main Content */}
            <article className="flex-1 max-w-3xl">
              <div className="prose prose-lg prose-slate dark:prose-invert max-w-none
                prose-p:text-slate-700 dark:prose-p:text-slate-300
                prose-li:text-slate-700 dark:prose-li:text-slate-300
                prose-strong:text-slate-900 dark:prose-strong:text-white
                prose-headings:font-poppins prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-white
                prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                prose-code:text-blue-600 dark:prose-code:text-blue-400 prose-code:bg-blue-50 dark:prose-code:bg-blue-900/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-slate-900 prose-pre:text-slate-50
              ">
                <MDXContent code={post.body.code} />
              </div>
            </article>

            {/* Sticky Sidebar */}
            <aside className="lg:w-64 hidden lg:block">
              <div className="sticky top-24 space-y-8">

                {/* Author Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Written By</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold border border-slate-200">
                      {post.author.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{post.author}</p>
                      <p className="text-xs text-slate-400">TaxFormatter Engineering</p>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {post.tags.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Related Topics</h3>
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map(tag => (
                        <span key={tag} className="px-2.5 py-1 bg-slate-100 text-slate-400 rounded-md text-xs font-medium border border-slate-200">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mini CTA */}
                <div className="bg-slate-900 rounded-xl p-6 text-white text-center">
                  <p className="font-bold mb-2 text-sm">Need to fix your CSV?</p>
                  <p className="text-xs text-slate-400 mb-4">Our engine handles the issues described in this article.</p>
                  <Link href="/signup" className="block w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold transition-colors">
                    Try For Free
                  </Link>
                </div>

              </div>
            </aside>

          </div>
        </Container>
      </main>
      <Footer />
    </>
  )
}

export async function generateStaticParams() {
  return allPosts.map((post) => ({
    slug: post.slug,
  }))
}
