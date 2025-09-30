export type SSRRequestContext = {
  headers?: Headers
  cookie?: string
}

type StoreAdapter<T> = {
  run<R>(value: T, fn: () => R): R
  getStore(): T | undefined
}

const clientStore: StoreAdapter<SSRRequestContext> = (() => {
  let current: SSRRequestContext | undefined
  return {
    run<R>(value: SSRRequestContext, fn: () => R): R {
      const prev = current
      current = value
      try {
        return fn()
      } finally {
        current = prev
      }
    },
    getStore() {
      return current
    },
  }
})()

type ServerModule = typeof import('./server-context.server')

let serverModule: ServerModule | undefined
let loadServerModule: () => Promise<ServerModule>

if (import.meta.env.SSR) {
  let serverModulePromise: Promise<ServerModule> | undefined
  loadServerModule = async () => {
    if (serverModule) return serverModule
    if (!serverModulePromise) {
      serverModulePromise = import('./server-context.server').then((mod) => {
        serverModule = mod
        return mod
      })
    }
    return serverModulePromise
  }
} else {
  loadServerModule = async () => {
    throw new Error('Server context is not available in the browser runtime')
  }
}

export function withSSRContextFromRequest<T>(req: Request, run: () => T): T | Promise<T> {
  const ctx: SSRRequestContext = {
    headers: req.headers,
    cookie: req.headers.get('cookie') || undefined,
  }
  if (!import.meta.env.SSR) {
    return clientStore.run(ctx, run)
  }
  return loadServerModule().then((mod) => mod.runWithContext(ctx, run))
}

export function getSSRRequestContext(): SSRRequestContext | undefined {
  if (!import.meta.env.SSR) {
    return clientStore.getStore()
  }
  return serverModule?.getContext()
}
