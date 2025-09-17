import { z } from 'zod'

export type ApiError = {
  error: string
  code: string
  status: number
  details?: unknown
}

export const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000'

export const getToken = () => (typeof localStorage !== 'undefined' ? localStorage.getItem('auth:token') : null)

export async function fetchJson<T>(
  path: string,
  opts: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(opts.headers || {})
  if (!headers.has('Content-Type') && opts.body) headers.set('Content-Type', 'application/json')

  const token = !opts.skipAuth ? getToken() : null
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
    credentials: 'include',
  })

  const isJson = res.headers.get('content-type')?.includes('application/json')

  if (!res.ok) {
    let payload: any
    try {
      payload = isJson ? await res.json() : null
    } catch {
      payload = null
    }
    const err: ApiError = {
      error: payload?.error || res.statusText || 'Request failed',
      code: payload?.code || 'UNKNOWN_ERROR',
      status: res.status,
      ...(payload?.details ? { details: payload.details } : {}),
    }
    throw err
  }

  return (isJson ? await res.json() : (undefined as any)) as T
}

export function parseWith<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data)
}

