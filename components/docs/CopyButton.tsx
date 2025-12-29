'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface CopyButtonProps {
  code: string
}

/**
 * Button to copy code block content to clipboard
 * Shows visual feedback when code is copied
 */
export function CopyButton({ code }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-2 rounded-md bg-gray-800 hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
      title="Copy code"
      aria-label="Copy code to clipboard"
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-400" />
      ) : (
        <Copy className="w-4 h-4 text-gray-300" />
      )}
    </button>
  )
}
