// Stub Prisma client - all real DB operations go through AWS Lambda
// This exists only for NextAuth compatibility during build

const createStub = (): any => {
  const handler: ProxyHandler<object> = {
    get(_, prop) {
      if (prop === 'then') return undefined
      if (prop === '$connect') return () => Promise.resolve()
      if (prop === '$disconnect') return () => Promise.resolve()
      if (prop === '$on') return () => {}
      if (prop === '$transaction') return (fn: any) => fn(createStub())
      if (typeof prop === 'symbol') return undefined

      // Model proxy (user, account, session, etc.)
      return new Proxy({}, {
        get(_, method) {
          return async (..._args: any[]) => {
            throw new Error(`Database not available. Use Lambda API instead.`)
          }
        }
      })
    }
  }
  return new Proxy({}, handler)
}

export default createStub()
