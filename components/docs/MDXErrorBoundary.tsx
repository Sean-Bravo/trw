'use client'

import { Component, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class MDXErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('MDX Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="my-8 p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Error Loading Content
              </h3>
              <p className="text-sm text-red-700 mb-4">
                There was an error rendering this documentation page. This might be due to
                invalid markdown or a missing component.
              </p>
              {this.state.error && (
                <details className="text-sm text-red-600">
                  <summary className="cursor-pointer font-medium hover:text-red-800">
                    Error details
                  </summary>
                  <pre className="mt-2 p-3 bg-red-100 rounded overflow-auto text-xs">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
