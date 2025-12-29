import { allPosts } from '.contentlayer/generated'
import { compareDesc } from 'date-fns'
import Link from 'next/link'
import { Metadata } from 'next'
import { Header } from '@/components/marketing/Header'
import { Footer } from '@/components/marketing/Footer'
import { Container } from '@/components/layout/Container'
import { Calendar, Clock, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'

export const metadata: Metadata = {
  title: 'Blog - Crypto Tax Tips & Guides',
  description: 'Learn about crypto taxes, CSV file fixes, and tax optimization strategies. Expert guides from the TaxFormatter team.',
  openGraph: {
    title: 'TaxFormatter Blog - Crypto Tax Tips & Guides',
    description: 'Expert guides on crypto taxes, CSV repair, and tax optimization.',
    type: 'website',
    url: 'https://taxformatter.com/blog',
  },
}

export default function BlogPage() {
  const posts = allPosts
    .filter((post) => post.published)
    .sort((a, b) => compareDesc(new Date(a.date), new Date(b.date)))

  const featuredPosts = posts.filter((post) => post.featured)
  const recentPosts = posts.filter((post) => !post.featured)

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-white via-blue-50/30 to-white">
        <Container>
          {/* Hero Section */}
          <div className="py-16 sm:py-24 text-center">
            <h1 className="font-poppins text-4xl sm:text-5xl md:text-6xl font-bold text-[#1a365d] mb-6">
              Crypto Tax Blog
            </h1>
            <p className="text-xl text-[#4b5563] max-w-2xl mx-auto mb-8">
              Expert guides, tax tips, and industry insights to help you navigate crypto taxes with confidence.
            </p>

            {/* Category Pills */}
            <div className="flex flex-wrap justify-center gap-3 mb-12">
              {['All Posts', 'Crypto Tax', 'Guides', 'Updates', 'Tax Tips'].map((category) => (
                <button
                  key={category}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    category === 'All Posts'
                      ? 'bg-[#3b82f6] text-white shadow-md'
                      : 'bg-white border-2 border-[#e5e7eb] text-[#1a365d] hover:border-[#3b82f6]/50'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Featured Posts */}
          {featuredPosts.length > 0 && (
            <section className="mb-20">
              <h2 className="font-poppins text-2xl font-bold text-[#1a365d] mb-8">Featured Articles</h2>
              <div className="grid md:grid-cols-2 gap-8">
                {featuredPosts.map((post) => (
                  <Link
                    key={post._id}
                    href={post.url}
                    className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-[#e5e7eb]"
                  >
                    {post.image && (
                      <div className="relative h-64 bg-gradient-to-br from-[#3b82f6] to-[#1a365d] overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-white text-6xl opacity-20">📊</div>
                        </div>
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-center gap-3 text-sm text-[#6b7280] mb-3">
                        <span className="px-3 py-1 bg-[#3b82f6]/10 text-[#3b82f6] rounded-full font-semibold">
                          {post.category}
                        </span>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(post.date), 'MMM d, yyyy')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {post.readingTime} min
                        </div>
                      </div>
                      <h3 className="font-poppins text-2xl font-bold text-[#1a365d] mb-3 group-hover:text-[#3b82f6] transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-[#4b5563] mb-4 line-clamp-2">
                        {post.description}
                      </p>
                      <div className="flex items-center text-[#3b82f6] font-semibold">
                        Read article
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Recent Posts */}
          <section className="pb-24">
            <h2 className="font-poppins text-2xl font-bold text-[#1a365d] mb-8">Recent Articles</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {recentPosts.map((post) => (
                <Link
                  key={post._id}
                  href={post.url}
                  className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-[#e5e7eb]"
                >
                  {post.image && (
                    <div className="relative h-48 bg-gradient-to-br from-[#3b82f6]/10 to-[#1a365d]/10">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-[#3b82f6] text-5xl opacity-30">📝</div>
                      </div>
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-xs text-[#6b7280] mb-2">
                      <span className="px-2 py-0.5 bg-[#3b82f6]/10 text-[#3b82f6] rounded-full font-semibold">
                        {post.category}
                      </span>
                      <span>{format(new Date(post.date), 'MMM d')}</span>
                      <span>·</span>
                      <span>{post.readingTime} min</span>
                    </div>
                    <h3 className="font-poppins text-lg font-bold text-[#1a365d] mb-2 group-hover:text-[#3b82f6] transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-sm text-[#4b5563] line-clamp-3">
                      {post.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Newsletter CTA */}
          <section className="mb-24">
            <div className="bg-gradient-to-r from-[#1a365d] to-[#0f172a] rounded-2xl p-8 md:p-12 text-center text-white">
              <h2 className="font-poppins text-3xl font-bold mb-4">Stay Updated</h2>
              <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
                Get the latest crypto tax tips, guides, and updates delivered to your inbox. No spam, unsubscribe anytime.
              </p>
              <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-3 rounded-full text-[#1a365d] focus:outline-none focus:ring-2 focus:ring-blue-400"
                  required
                />
                <button
                  type="submit"
                  className="px-8 py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold rounded-full transition-colors"
                >
                  Subscribe
                </button>
              </form>
            </div>
          </section>
        </Container>
      </main>
      <Footer />
    </>
  )
}
