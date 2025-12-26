// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback, options) {
    this.callback = callback
    this.options = options
  }

  observe() {
    // Trigger the callback immediately for testing
    this.callback(
      [
        {
          isIntersecting: true,
          target: document.createElement('div'),
          boundingClientRect: {},
          intersectionRatio: 1,
          intersectionRect: {},
          rootBounds: {},
          time: Date.now(),
        },
      ],
      this
    )
  }

  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  useParams: jest.fn(() => ({})),
}))

// Mock crypto.getRandomValues for Node.js environment
if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
  const { webcrypto } = require('crypto')
  global.crypto = webcrypto
}

// Mock Next.js server APIs (Request, Response, Headers, etc.)
global.Request = global.Request || class Request {}
global.Response = global.Response || class Response {
  static json(data, init) {
    return {
      status: init?.status || 200,
      headers: new Map(Object.entries(init?.headers || {})),
      json: async () => data,
    }
  }
}
global.Headers = global.Headers || Map

// Suppress console errors in tests (optional - comment out if you want to see them)
// global.console.error = jest.fn()
// global.console.warn = jest.fn()
