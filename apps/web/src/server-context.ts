import { AsyncLocalStorage } from 'node:async_hooks'

export type SSRRequestContext = {
  headers?: Headers
  cookie?: string
}

const store = new AsyncLocalStorage<SSRRequestContext>()

export function withSSRContextFromRequest<T>(req: Request, run: () => T): T {
  const ctx: SSRRequestContext = {
    headers: req.headers,
    cookie: req.headers.get('cookie') || undefined,
  }
  return store.run(ctx, run)
}

export function getSSRRequestContext(): SSRRequestContext | undefined {
  return store.getStore()
}

