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

let asyncStore: import('node:async_hooks').AsyncLocalStorage<SSRRequestContext> | null = null

async function ensureAsyncStore() {
  if (!asyncStore) {
    const { AsyncLocalStorage } = await import('node:async_hooks')
    asyncStore = new AsyncLocalStorage<SSRRequestContext>()
  }
  return asyncStore
}

export function withSSRContextFromRequest<T>(req: Request, run: () => T): T | Promise<T> {
  const ctx: SSRRequestContext = {
    headers: req.headers,
    cookie: req.headers.get('cookie') || undefined,
  }
  if (!import.meta.env.SSR) {
    return clientStore.run(ctx, run)
  }
  return ensureAsyncStore().then((store) => store.run(ctx, run))
}

export function getSSRRequestContext(): SSRRequestContext | undefined {
  if (!import.meta.env.SSR) {
    return clientStore.getStore()
  }
  return asyncStore?.getStore()
}

