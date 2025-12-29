import type { NavLink } from '@/types/docs'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'


interface PrevNextNavProps {
  prev?: NavLink
  next?: NavLink
}

/**
 * Previous/Next page navigation for documentation pages
 * Shows links to adjacent pages in the documentation
 */
export function PrevNextNav({ prev, next }: PrevNextNavProps) {
  if (!prev && !next) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 pt-8 border-t border-gray-200">
      {prev ? (
        <Link
          href={prev.url}
          className="group flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50/30 transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
          <div className="flex-1 text-left">
            <div className="text-xs text-gray-500 mb-1">Previous</div>
            <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {prev.title}
            </div>
          </div>
        </Link>
      ) : (
        <div /> // Empty div to maintain grid layout
      )}

      {next && (
        <Link
          href={next.url}
          className="group flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50/30 transition-all"
        >
          <div className="flex-1 text-right">
            <div className="text-xs text-gray-500 mb-1">Next</div>
            <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {next.title}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
        </Link>
      )}
    </div>
  )
}
