import { allDocs } from '@/lib/content/docs'

/**
 * Get the previous and next documents based on current URL
 * Orders documents by section order and page order
 */
export function getPrevNextDocs(currentUrl: string) {
  // Sort all docs by their order in the documentation structure
  const sortedDocs = [...allDocs].sort((a, b) => {
    // Simple alphabetical sort by URL for now
    // You can customize this based on your needs
    return a.url.localeCompare(b.url)
  })

  const currentIndex = sortedDocs.findIndex(doc => doc.url === currentUrl)

  if (currentIndex === -1) {
    return { prev: undefined, next: undefined }
  }

  const prev = currentIndex > 0 ? sortedDocs[currentIndex - 1] : undefined
  const next = currentIndex < sortedDocs.length - 1 ? sortedDocs[currentIndex + 1] : undefined

  return {
    prev: prev ? { title: prev.title, url: prev.url } : undefined,
    next: next ? { title: next.title, url: next.url } : undefined,
  }
}

/**
 * Calculate estimated reading time based on word count
 * Assumes average reading speed of 200 words per minute
 */
export function getReadingTime(content: string): number {
  const wordsPerMinute = 200
  const words = content.trim().split(/\s+/).length
  const minutes = Math.ceil(words / wordsPerMinute)
  return minutes
}
