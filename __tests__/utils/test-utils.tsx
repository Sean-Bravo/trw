import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'

// Add any providers your app needs here
interface AllProvidersProps {
  children: React.ReactNode
}

const AllProviders = ({ children }: AllProvidersProps) => {
  return <>{children}</>
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllProviders, ...options })

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }

// Helper to wait for async updates
export const waitForLoadingToFinish = () => {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

// Helper to create mock file
export const createMockFile = (
  name: string,
  size: number,
  type: string
): File => {
  const blob = new Blob(['a'.repeat(size)], { type })
  return new File([blob], name, { type })
}

// Helper to mock fetch responses
export const mockFetch = (data: any, ok = true) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
      status: ok ? 200 : 400,
      statusText: ok ? 'OK' : 'Bad Request',
    } as Response)
  )
}

// Helper to mock fetch error
export const mockFetchError = (error: Error) => {
  global.fetch = jest.fn(() => Promise.reject(error))
}

// Helper to create Headers mock
export const createMockHeaders = (headers: Record<string, string>) => {
  const headersInstance = new Headers()
  Object.entries(headers).forEach(([key, value]) => {
    headersInstance.set(key, value)
  })
  return headersInstance
}

// Helper to create NextRequest mock
export const createMockNextRequest = (
  url: string,
  options?: {
    method?: string
    headers?: Record<string, string>
    body?: any
  }
) => {
  const headers = createMockHeaders(options?.headers || {})

  return {
    url,
    method: options?.method || 'GET',
    headers,
    json: () => Promise.resolve(options?.body),
    text: () => Promise.resolve(JSON.stringify(options?.body)),
    body: options?.body,
    nextUrl: new URL(url),
  }
}

// Helper to advance timers and update DOM
export const advanceTimersAndUpdate = async (ms: number) => {
  jest.advanceTimersByTime(ms)
  await waitForLoadingToFinish()
}
