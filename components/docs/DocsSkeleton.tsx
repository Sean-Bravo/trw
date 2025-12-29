export function DocsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-8 pb-8 border-b border-gray-200">
        {/* Title skeleton */}
        <div className="h-10 bg-gray-200 rounded w-3/4 mb-4"></div>
        {/* Description skeleton */}
        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>

        {/* Code block skeleton */}
        <div className="h-32 bg-gray-200 rounded w-full mt-6"></div>

        <div className="h-4 bg-gray-200 rounded w-full mt-6"></div>
        <div className="h-4 bg-gray-200 rounded w-4/5"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
  )
}
