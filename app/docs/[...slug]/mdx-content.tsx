'use client'

import { useMDXComponent } from 'next-contentlayer2/hooks'
import type { MDXComponents } from 'mdx/types'

interface MDXContentProps {
  code: string
}

const components: MDXComponents = {
  // You can add custom components here in the future
  // Example:
  // h1: ({ children }) => <h1 className="custom-h1">{children}</h1>,
}

export function MDXContent({ code }: MDXContentProps) {
  const Component = useMDXComponent(code)
  return <Component components={components} />
}
