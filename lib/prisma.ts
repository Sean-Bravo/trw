import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

// Lazy initialization to avoid errors at build time
const prismaClientSingleton = () => {
  const databaseUrl = process.env['DATABASE_URL']

  if (!databaseUrl) {
    // Return a proxy that throws on first use, not at import time
    // This allows the build to succeed even without DATABASE_URL
    console.warn('DATABASE_URL is not defined - Prisma client will fail on first use')
    return new Proxy({} as PrismaClient, {
      get(_, prop) {
        if (prop === 'then' || prop === '$connect' || prop === '$disconnect') {
          return undefined
        }
        throw new Error('DATABASE_URL is not defined. Please set it in your environment variables.')
      }
    }) as PrismaClient
  }

  // For Prisma 7 with Accelerate
  if (databaseUrl.startsWith('prisma+postgres://')) {
    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      // @ts-ignore - Prisma 7 types may not be updated yet
      accelerateUrl: databaseUrl,
    })
    return client.$extends(withAccelerate()) as unknown as PrismaClient
  }

  // For standard PostgreSQL URLs
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasourceUrl: databaseUrl,
  })
  return client
}

declare global {
  var prismaGlobal: undefined | PrismaClient
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
