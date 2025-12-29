import type { BreadcrumbItem } from '@/types/docs'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'


interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center space-x-2 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={isLast ? 'text-gray-900 font-medium' : 'text-gray-600'}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
