import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

const prismaClientSingleton = () => {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined')
  }

  // For Prisma 7 with Accelerate, pass accelerateUrl to constructor
  if (databaseUrl.startsWith('prisma+postgres://')) {
    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      // @ts-ignore - Prisma 7 types may not be updated yet
      accelerateUrl: databaseUrl,
    })
    return client.$extends(withAccelerate())
  }

  // For standard PostgreSQL, this won't work in Prisma 7 without an adapter
  // We need to use Accelerate for Prisma 7
  throw new Error('Prisma 7 requires Accelerate URL (prisma+postgres://). Please use `npx prisma dev` to start a local database.')
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
