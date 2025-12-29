'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react'

interface FeedbackWidgetProps {
  pageUrl: string
}

/**
 * Feedback widget for documentation pages
 * Allows users to rate if the page was helpful
 */
export function FeedbackWidget({ pageUrl }: FeedbackWidgetProps) {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleFeedback = async (type: 'positive' | 'negative') => {
    setFeedback(type)
    setSubmitted(true)

    // TODO: Send feedback to analytics or database
    // Example:
    // await fetch('/api/feedback', {
    //   method: 'POST',
    //   body: JSON.stringify({ pageUrl, type }),
    // })

    console.log(`Feedback: ${type} for ${pageUrl}`)
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
        <Check className="w-5 h-5 text-green-600" />
        <span className="text-sm text-green-800 font-medium">
          Thank you for your feedback!
        </span>
      </div>
    )
  }

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          Was this page helpful?
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => handleFeedback('positive')}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-green-100 hover:text-green-700 transition-colors"
            aria-label="Yes, this was helpful"
          >
            <ThumbsUp className="w-4 h-4" />
            Yes
          </button>
          <button
            onClick={() => handleFeedback('negative')}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-red-100 hover:text-red-700 transition-colors"
            aria-label="No, this was not helpful"
          >
            <ThumbsDown className="w-4 h-4" />
            No
          </button>
        </div>
      </div>
    </div>
  )
}
