import { allPosts } from '@/lib/content/posts'
import { compareDesc, format } from 'date-fns'
import Link from 'next/link'
import { Metadata } from 'next'
import { HeaderWithSession } from '@/components/marketing/HeaderWithSession'
import { Footer } from '@/components/marketing/Footer'
import { Container } from '@/components/layout/Container'
import { ArrowRight, FileText, TrendingUp, Terminal, BookOpen } from 'lucide-react'

export const metadata: Metadata = {
  alternates: { canonical: '/blog' },
  title: 'Blog - Crypto Tax Tips & Guides',
  description: 'Learn about crypto taxes, CSV file fixes, and tax optimization strategies. Expert guides from the TaxFormatter team.',
  openGraph: {
    title: 'TaxFormatter Blog - Crypto Tax Tips & Guides',
    description: 'Expert guides on crypto taxes, CSV repair, and tax optimization.',
    type: 'website',
    url: 'https://www.taxformatter.com/blog',
  },
}

// Visual Mapping Config
// This assigns specific colors and icons to your categories automatically
const CATEGORY_STYLES: Record<string, { color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  'crypto-tax': { color: 'text-indigo-400', bg: 'bg-indigo-500/10', icon: TrendingUp },
  'guides': { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: BookOpen },
  'tax-tips': { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: FileText },
  'updates': { color: 'text-slate-400', bg: 'bg-slate-500/10', icon: Terminal },
  'bookkeeping': { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: FileText },
  'default': { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: FileText },
}

export default function BlogPage() {
  const posts = allPosts
    .filter((post) => post.published)
    .sort((a, b) => compareDesc(new Date(a.date), new Date(b.date)))

  const featuredPosts = posts.filter((post) => post.featured)
  const recentPosts = posts.filter((post) => !post.featured)

  return (
    <>
      <HeaderWithSession />
      <main className="min-h-screen bg-slate-950">
        <Container>
          {/* Minimalist Hero */}
          <div className="py-20 sm:py-28 max-w-3xl">
            <h1 className="font-poppins text-4xl sm:text-5xl font-bold text-white mb-6 tracking-tight">
              Engineering <span className="text-slate-400">/</span> Blog
            </h1>
            <p className="text-xl text-slate-400 leading-relaxed">
              Technical guides on fixing CSV schemas, understanding IRS formatting, and optimizing crypto tax reporting.
            </p>
          </div>

          {/* Featured Posts (The "Big Cards") */}
          {featuredPosts.length > 0 && (
            <section className="mb-24">
              <div className="grid md:grid-cols-2 gap-8">
                {featuredPosts.map((post) => {
                  const style = CATEGORY_STYLES[post.category] ?? CATEGORY_STYLES['default']!
                  const Icon = style!.icon

                  return (
                    <Link
                      key={post.slug}
                      href={post.url}
                      className="group flex flex-col bg-white/[0.03] rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 hover:shadow-xl transition-all duration-300"
                    >
                      {/* The New "Technical" Header */}
                      <div className={`h-64 ${style.bg} relative overflow-hidden border-b border-white/10`}>
                        {/* Abstract Grid Pattern */}
                        <div className="absolute inset-0 opacity-[0.03]"
                             style={{ backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`, backgroundSize: '24px 24px' }}
                        />

                        {/* Floating Icon */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                          <div className="w-20 h-20 bg-slate-900 border border-white/10 rounded-2xl shadow-sm flex items-center justify-center">
                            <Icon className={`w-10 h-10 ${style.color}`} />
                          </div>
                        </div>

                        {/* "Code" Badge */}
                        <div className="absolute bottom-4 left-4 font-mono text-xs font-medium px-2 py-1 bg-slate-950/80 backdrop-blur rounded text-slate-400 border border-white/10">
                          {post.slug}.mdx
                        </div>
                      </div>

                      <div className="p-8 flex-1 flex flex-col">
                        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
                          <span className={`${style.color}`}>{post.category}</span>
                          <span>•</span>
                          <span>{post.readingTime} min read</span>
                        </div>

                        <h3 className="font-poppins text-2xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
                          {post.title}
                        </h3>

                        <p className="text-slate-400 mb-6 line-clamp-2 leading-relaxed">
                          {post.description}
                        </p>

                        <div className="mt-auto flex items-center text-blue-400 font-semibold group-hover:translate-x-1 transition-transform">
                          Read Guide <ArrowRight className="ml-2 w-4 h-4" />
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* Recent Posts (The "List View") */}
          <section className="pb-24 max-w-4xl">
            <h2 className="font-poppins text-xl font-bold text-white mb-8 pb-4 border-b border-white/10">
              Latest Articles
            </h2>
            <div className="space-y-8">
              {recentPosts.map((post) => {
                const style = CATEGORY_STYLES[post.category] ?? CATEGORY_STYLES['default']!

                return (
                  <Link
                    key={post.slug}
                    href={post.url}
                    className="group block"
                  >
                    <article className="flex flex-col sm:flex-row gap-6 sm:items-start">
                       {/* Date Box */}
                       <div className="hidden sm:flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-white/[0.04] border border-white/10 text-slate-400 shrink-0">
                          <span className="text-xs font-bold uppercase">{format(new Date(post.date), 'MMM')}</span>
                          <span className="text-lg font-bold text-white">{format(new Date(post.date), 'dd')}</span>
                       </div>

                       <div>
                         <div className="flex items-center gap-2 mb-2">
                           <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${style.bg} ${style.color}`}>
                             {post.category}
                           </span>
                           <span className="text-xs text-slate-400 sm:hidden">
                             {format(new Date(post.date), 'MMM dd, yyyy')}
                           </span>
                         </div>

                         <h3 className="font-poppins text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                           {post.title}
                         </h3>
                         <p className="text-slate-400 leading-relaxed mb-3">
                           {post.description}
                         </p>
                         <div className="text-sm font-medium text-slate-400 group-hover:text-blue-400 transition-colors flex items-center gap-2">
                           Read article <ArrowRight className="w-3 h-3" />
                         </div>
                       </div>
                    </article>
                  </Link>
                )
              })}
            </div>
          </section>

        </Container>
      </main>
      <Footer />
    </>
  )
}
