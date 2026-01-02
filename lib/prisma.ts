import { PrismaClient } from '@prisma/client'

declare global {
  var prismaGlobal: PrismaClient | undefined
}

// Mock client for build time when DATABASE_URL is not available
const createMockClient = (): PrismaClient => {
  const handler: ProxyHandler<object> = {
    get(target, prop) {
      if (prop === 'then') return undefined
      if (prop === '$connect') return () => Promise.resolve()
      if (prop === '$disconnect') return () => Promise.resolve()
      if (prop === '$on') return () => {}
      if (prop === '$use') return () => {}
      if (prop === '$extends') return () => createMockClient()
      if (typeof prop === 'symbol') return undefined

      // Return a chainable proxy for model operations (user, account, etc.)
      return new Proxy({}, {
        get(_, method) {
          return (...args: unknown[]) => {
            console.error(`[Prisma Mock] Called ${String(prop)}.${String(method)} - DATABASE_URL not configured`)
            return Promise.reject(new Error('DATABASE_URL is not configured'))
          }
        }
      })
    }
  }
  return new Proxy({} as PrismaClient, handler)
}

const createPrismaClient = (): PrismaClient => {
  const databaseUrl = process.env['DATABASE_URL']

  // No DATABASE_URL - return mock for build time
  if (!databaseUrl) {
    console.warn('[Prisma] DATABASE_URL not set - using mock client')
    return createMockClient()
  }

  // Prisma 7 with Accelerate URL
  if (databaseUrl.startsWith('prisma+postgres://') || databaseUrl.startsWith('prisma://')) {
    const { PrismaClient: AccelerateClient } = require('@prisma/client')
    return new AccelerateClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  }

  // Standard PostgreSQL - Prisma 7 requires pg adapter
  try {
    const { PrismaPg } = require('@prisma/adapter-pg')
    const { Pool } = require('pg')

    const pool = new Pool({ connectionString: databaseUrl })
    const adapter = new PrismaPg(pool)

    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  } catch (e) {
    // If adapter not installed, return mock
    console.warn('[Prisma] pg adapter not available, using mock client')
    return createMockClient()
  }
}

const prisma = globalThis.prismaGlobal ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma
}

export default prisma
