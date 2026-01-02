import Link from 'next/link'
import { ArrowRight, type LucideIcon } from 'lucide-react'

interface DocCardProps {
  title: string
  description: string
  link: string
  icon: LucideIcon
}

/**
 * Card component for documentation section links on the docs home page
 * Displays icon, title, description, and hover effects
 */
export function DocCard({ title, description, link, icon: Icon }: DocCardProps) {
  return (
    <Link
      href={link}
      className="group block p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-[var(--color-primary-500)]/50 hover:shadow-xl hover:shadow-[var(--color-primary-500)]/10 hover:-translate-y-1 transition-all duration-300"
    >
      <div className="flex items-start gap-4">
        {/* Icon with gradient background */}
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-primary-500)]/10 to-[var(--color-accent-500)]/10 flex items-center justify-center group-hover:from-[var(--color-primary-500)] group-hover:to-[var(--color-accent-500)] transition-all duration-300">
          <Icon className="w-6 h-6 text-[var(--color-primary-500)] group-hover:text-white transition-colors" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-[var(--color-primary-600)] dark:group-hover:text-[var(--color-primary-400)] transition-colors">
            {title}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">{description}</p>
          <div className="flex items-center gap-2 mt-4 text-[var(--color-primary-500)] font-semibold text-sm group-hover:gap-3 transition-all">
            Read more
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </Link>
  )
}
