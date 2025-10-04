import type { AsyncLocalStorage } from 'node:async_hooks'

export type SSRRequestContext = {
  headers?: Headers
  cookie?: string
}

let serverStore: AsyncLocalStorage<SSRRequestContext> | null = null
let serverStorePromise: Promise<AsyncLocalStorage<SSRRequestContext>> | null = null

const clientStore = (() => {
  let current: SSRRequestContext | undefined
  return {
    run<R>(ctx: SSRRequestContext, fn: () => R): R {
      const previous = current
      current = ctx
      try {
        return fn()
      } finally {
        current = previous
      }
    },
    get(): SSRRequestContext | undefined {
      return current
    },
  }
})()

async function ensureServerStore(): Promise<AsyncLocalStorage<SSRRequestContext>> {
  if (serverStore) {
    return serverStore
  }
  if (!serverStorePromise) {
    serverStorePromise = import('node:async_hooks').then(({ AsyncLocalStorage }) => {
      serverStore = new AsyncLocalStorage<SSRRequestContext>()
      return serverStore
    })
  }
  return serverStorePromise
}

export function withSSRContextFromRequest<T>(req: Request, run: () => T): T | Promise<T> {
  const ctx: SSRRequestContext = {
    headers: req.headers,
    cookie: req.headers.get('cookie') || undefined,
  }
  // Treat presence of window as non-SSR; avoid import.meta for CJS builds
  if (typeof window !== 'undefined') {
    return clientStore.run(ctx, run)
  }
  return ensureServerStore().then((store) => store.run(ctx, run))
}

export function getSSRRequestContext(): SSRRequestContext | undefined {
  // Treat presence of window as non-SSR; avoid import.meta for CJS builds
  if (typeof window !== 'undefined') {
    return clientStore.get()
  }
  return serverStore?.getStore()
}
