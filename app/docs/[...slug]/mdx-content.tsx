'use client'

import { useMDXComponent } from 'next-contentlayer2/hooks'
import type { MDXComponents } from 'mdx/types'
import { CopyButton } from '@/components/docs/CopyButton'

interface MDXContentProps {
  code: string
}

/**
 * Custom MDX components with enhanced functionality
 * Adds copy buttons to code blocks
 */
const components: MDXComponents = {
  pre: ({ children, ...props }: any) => {
    // Extract code from children
    const code = children?.props?.children || ''
    
    return (
      <div className="relative group">
        <pre {...props}>{children}</pre>
        <CopyButton code={code} />
      </div>
    )
  },
}

export function MDXContent({ code }: MDXContentProps) {
  const Component = useMDXComponent(code)
  return <Component components={components} />
}
