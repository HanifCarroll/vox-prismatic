import type { z } from 'zod'

export type ApiError = {
  error: string
  code: string
  status: number
  details?: unknown
}

export const API_BASE = import.meta.env?.VITE_API_URL ?? 'http://localhost:3000'


export async function fetchJson<T>(
  path: string,
  opts: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(opts.headers || {})
  // On the server, forward cookies from the incoming request automatically
  if (typeof window === 'undefined') {
    try {
      const mod = await import('@/server-context')
      const ctx = mod.getSSRRequestContext?.()
      const cookie = ctx?.cookie
      if (cookie && !headers.has('cookie')) {
        headers.set('cookie', cookie)
      }
    } catch {}
  }
  if (!headers.has('Content-Type') && opts.body) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
    credentials: 'include',
  })

  const isJson = res.headers.get('content-type')?.includes('application/json')

  if (!res.ok) {
    let payload: unknown = null
    if (isJson) {
      try {
        payload = await res.json()
      } catch {
        payload = null
      }
    }
    const asObject =
      payload && typeof payload === 'object' ? (payload as { error?: unknown; code?: unknown; details?: unknown }) : undefined
    const err: ApiError = {
      error: typeof asObject?.error === 'string' ? asObject.error : res.statusText || 'Request failed',
      code: typeof asObject?.code === 'string' ? asObject.code : 'UNKNOWN_ERROR',
      status: res.status,
      ...(asObject?.details !== undefined ? { details: asObject.details } : {}),
    }
    throw err
  }

  if (!isJson) {
    return undefined as T
  }
  const data = (await res.json()) as unknown
  return data as T
}

export function parseWith<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data)
}
