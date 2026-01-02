// Prisma client with lazy initialization for Vercel builds
// Prisma 7 requires either an adapter or Accelerate URL

declare global {
  var prismaGlobal: any
}

// Mock client for build time when DATABASE_URL is not available
const createMockClient = () => {
  const handler: ProxyHandler<object> = {
    get(target, prop) {
      if (prop === 'then') return undefined
      if (prop === '$connect') return () => Promise.resolve()
      if (prop === '$disconnect') return () => Promise.resolve()
      if (prop === '$on') return () => {}
      if (prop === '$use') return () => {}
      if (prop === '$extends') return () => createMockClient()
      if (typeof prop === 'symbol') return undefined

      // Return a chainable proxy for model operations
      return new Proxy({}, {
        get(_, method) {
          return (..._args: unknown[]) => {
            console.error(`[Prisma Mock] Called ${String(prop)}.${String(method)} - DATABASE_URL not configured`)
            return Promise.reject(new Error('DATABASE_URL is not configured'))
          }
        }
      })
    }
  }
  return new Proxy({}, handler)
}

let prismaInstance: any = null

const getPrisma = () => {
  if (prismaInstance) return prismaInstance

  const databaseUrl = process.env['DATABASE_URL']

  // No DATABASE_URL - return mock for build time
  if (!databaseUrl) {
    console.warn('[Prisma] DATABASE_URL not set - using mock client')
    prismaInstance = createMockClient()
    return prismaInstance
  }

  // Dynamic import to avoid build-time evaluation
  try {
    const { PrismaClient } = require('@prisma/client')
    const { PrismaPg } = require('@prisma/adapter-pg')
    const { Pool } = require('pg')

    const pool = new Pool({ connectionString: databaseUrl })
    const adapter = new PrismaPg(pool)

    prismaInstance = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
    return prismaInstance
  } catch (e) {
    console.warn('[Prisma] Failed to create client:', e)
    prismaInstance = createMockClient()
    return prismaInstance
  }
}

// Create a proxy that lazily initializes the client on first use
const prisma = new Proxy({} as any, {
  get(target, prop) {
    const client = getPrisma()
    const value = client[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  }
})

export default prisma
