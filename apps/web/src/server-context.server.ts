import { AsyncLocalStorage } from 'node:async_hooks'
import type { SSRRequestContext } from './server-context'

const store = new AsyncLocalStorage<SSRRequestContext>()

export function runWithContext<T>(ctx: SSRRequestContext, run: () => T): T {
  return store.run(ctx, run)
}

export function getContext(): SSRRequestContext | undefined {
  return store.getStore()
}

