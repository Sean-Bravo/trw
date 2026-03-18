'use client'

import { useState } from 'react'

interface BlogImageProps {
  src: string
  alt: string
  fallback: React.ReactNode
}

export function BlogImage({ src, alt, fallback }: BlogImageProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return <>{fallback}</>
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
      onError={() => setFailed(true)}
    />
  )
}
