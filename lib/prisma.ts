import { PrismaClient } from '@prisma/client'

declare global {
  var prismaGlobal: PrismaClient | undefined
}

// Build-time check - return a mock if no DATABASE_URL
const createPrismaClient = (): PrismaClient => {
  const databaseUrl = process.env['DATABASE_URL']

  if (!databaseUrl) {
    // Return a proxy for build time - will fail at runtime if actually used
    console.warn('[Prisma] DATABASE_URL not set - using mock client for build')
    return new Proxy({} as PrismaClient, {
      get(target, prop) {
        if (prop === 'then') return undefined
        if (prop === '$connect') return () => Promise.resolve()
        if (prop === '$disconnect') return () => Promise.resolve()

        // Return a chainable proxy for model operations
        return new Proxy(() => {}, {
          get() {
            return () => Promise.reject(new Error('DATABASE_URL is not configured'))
          },
          apply() {
            return Promise.reject(new Error('DATABASE_URL is not configured'))
          }
        })
      }
    })
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

const prisma = globalThis.prismaGlobal ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma
}

export default prisma
