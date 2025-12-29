import { allPosts } from '.contentlayer/generated'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { format } from 'date-fns'
import { Header } from '@/components/marketing/Header'
import { Footer } from '@/components/marketing/Footer'
import { Container } from '@/components/layout/Container'
import { Calendar, Clock, ArrowLeft, Share2 } from 'lucide-react'
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
    return {
      title: 'Post Not Found',
      description: 'The requested blog post could not be found.',
    }
  }

  return {
    title: `${post.title} | TaxFormatter Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      url: `https://taxformatter.com${post.url}`,
      ...(post.image && {
        images: [
          {
            url: `https://taxformatter.com${post.image}`,
            width: 1200,
            height: 630,
            alt: post.title,
          },
        ],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      ...(post.image && { images: [post.image] }),
    },
    alternates: {
      canonical: `https://taxformatter.com${post.url}`,
    },
  }
}

export default async function BlogPost({ params }: BlogPostProps) {
  const { slug } = await params
  const post = allPosts.find((post) => post.slug === slug)

  if (!post) {
    notFound()
  }

  // Get related posts
  const relatedPosts = allPosts
    .filter(
      (p) =>
        p.slug !== post.slug &&
        p.published &&
        (p.category === post.category || p.tags.some((tag) => post.tags.includes(tag)))
    )
    .slice(0, 3)

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
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-white via-blue-50/20 to-white">
        <Container>
          {/* Back Button */}
          <div className="pt-8 pb-4">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-[#3b82f6] hover:text-[#2563eb] font-semibold transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </Link>
          </div>

          {/* Article Header */}
          <article className="max-w-4xl mx-auto">
            <header className="mb-12 text-center">
              <div className="flex items-center justify-center gap-3 mb-6">
                <span className="px-4 py-1.5 bg-[#3b82f6]/10 text-[#3b82f6] rounded-full text-sm font-semibold uppercase tracking-wide">
                  {post.category}
                </span>
                {post.featured && (
                  <span className="px-4 py-1.5 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                    ⭐ Featured
                  </span>
                )}
              </div>

              <h1 className="font-poppins text-4xl sm:text-5xl font-bold text-[#1a365d] mb-6 leading-tight">
                {post.title}
              </h1>

              <p className="text-xl text-[#4b5563] mb-6 leading-relaxed">
                {post.description}
              </p>

              <div className="flex items-center justify-center gap-6 text-sm text-[#6b7280]">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-[#3b82f6] rounded-full flex items-center justify-center text-white font-bold">
                    {post.author.charAt(0)}
                  </div>
                  <span className="font-semibold text-[#1a365d]">{post.author}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(post.date), 'MMMM d, yyyy')}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {post.readingTime} min read
                </div>
              </div>

              {/* Social Share */}
              <div className="mt-8 flex items-center justify-center gap-4">
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-[#e5e7eb] rounded-full text-[#1a365d] hover:border-[#3b82f6]/50 hover:text-[#3b82f6] transition-all font-semibold">
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
              </div>
            </header>

            {/* Featured Image */}
            {post.image && (
              <div className="mb-12 rounded-2xl overflow-hidden bg-gradient-to-br from-[#3b82f6] to-[#1a365d] h-96 flex items-center justify-center">
                <div className="text-white text-8xl opacity-20">📊</div>
              </div>
            )}

            {/* Article Content */}
            <div className="prose prose-lg prose-slate max-w-none
              prose-headings:font-poppins prose-headings:font-bold prose-headings:text-[#1a365d]
              prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6
              prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4
              prose-h4:text-xl
              prose-p:text-[#4b5563] prose-p:leading-relaxed prose-p:mb-6
              prose-a:text-[#3b82f6] prose-a:no-underline hover:prose-a:underline
              prose-strong:text-[#1a365d] prose-strong:font-bold
              prose-code:text-[#3b82f6] prose-code:bg-blue-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-sm prose-code:before:content-[''] prose-code:after:content-['']
              prose-pre:bg-[#1e293b] prose-pre:text-gray-100
              prose-ul:my-6 prose-li:my-2
              prose-blockquote:border-l-4 prose-blockquote:border-[#3b82f6] prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-[#4b5563]
            ">
              <MDXContent code={post.body.code} />
            </div>

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="mt-12 pt-8 border-t border-[#e5e7eb]">
                <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-4">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-[#f3f4f6] text-[#4b5563] rounded-full text-sm hover:bg-[#3b82f6]/10 hover:text-[#3b82f6] transition-colors cursor-pointer"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Related Articles */}
          {relatedPosts.length > 0 && (
            <section className="max-w-6xl mx-auto py-20 border-t border-[#e5e7eb] mt-20">
              <h2 className="font-poppins text-3xl font-bold text-[#1a365d] mb-8 text-center">
                Related Articles
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                {relatedPosts.map((relatedPost) => (
                  <Link
                    key={relatedPost._id}
                    href={relatedPost.url}
                    className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-[#e5e7eb]"
                  >
                    <div className="p-5">
                      <div className="flex items-center gap-2 text-xs text-[#6b7280] mb-2">
                        <span className="px-2 py-0.5 bg-[#3b82f6]/10 text-[#3b82f6] rounded-full font-semibold">
                          {relatedPost.category}
                        </span>
                        <span>{format(new Date(relatedPost.date), 'MMM d')}</span>
                      </div>
                      <h3 className="font-poppins text-lg font-bold text-[#1a365d] mb-2 group-hover:text-[#3b82f6] transition-colors line-clamp-2">
                        {relatedPost.title}
                      </h3>
                      <p className="text-sm text-[#4b5563] line-clamp-2">
                        {relatedPost.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* CTA Section */}
          <section className="max-w-4xl mx-auto py-16">
            <div className="bg-gradient-to-r from-[#3b82f6] to-[#2563eb] rounded-2xl p-8 md:p-12 text-center text-white">
              <h2 className="font-poppins text-3xl font-bold mb-4">
                Ready to Fix Your CSV Files?
              </h2>
              <p className="text-blue-100 mb-8 text-lg">
                Stop spending hours on manual data cleanup. Try TaxFormatter free.
              </p>
              <Link
                href="/#start"
                className="inline-block px-8 py-4 bg-white text-[#3b82f6] font-bold rounded-full hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                Start Free Audit
              </Link>
            </div>
          </section>
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
