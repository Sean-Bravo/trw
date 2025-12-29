import * as Sentry from '@sentry/nextjs'

/**
 * Capture an exception and send it to Sentry
 */
export function captureException(error: unknown, context?: Record<string, any>) {
  if (context) {
    Sentry.setContext('additional', context)
  }
  Sentry.captureException(error)
}

/**
 * Capture a message and send it to Sentry
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  Sentry.captureMessage(message, level)
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    data,
    level: 'info',
  })
}

/**
 * Set user context for Sentry
 */
export function setUser(user: { id: string; email?: string; username?: string }) {
  Sentry.setUser(user)
}

/**
 * Clear user context
 */
export function clearUser() {
  Sentry.setUser(null)
}

/**
 * Add custom context to error reports
 */
export function setContext(key: string, context: Record<string, any>) {
  Sentry.setContext(key, context)
}

/**
 * Wrap async operations with error tracking
 */
export async function withErrorTracking<T>(
  operation: () => Promise<T>,
  operationName: string,
  context?: Record<string, any>
): Promise<T> {
  try {
    addBreadcrumb(`Starting ${operationName}`, context)
    const result = await operation()
    addBreadcrumb(`Completed ${operationName}`)
    return result
  } catch (error) {
    captureException(error, { operation: operationName, ...context })
    throw error
  }
}
