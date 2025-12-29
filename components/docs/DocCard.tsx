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
      className="group block p-6 border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg hover:bg-blue-50/30 transition-all duration-300"
    >
      <div className="flex items-start gap-4">
        <Icon className="w-10 h-10 text-gray-900" />
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
            {title}
          </h3>
          <p className="text-sm text-gray-600 mt-2">{description}</p>
          <div className="flex items-center gap-2 mt-4 text-blue-600 font-semibold text-sm group-hover:gap-3 transition-all">
            Read more
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </Link>
  )
}
