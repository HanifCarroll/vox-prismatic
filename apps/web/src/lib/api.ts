import { AuthResponseSchema } from '@content/shared-types'

export type ApiError = {
  error: string
  code: string
  status: number
  details?: unknown
}

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000'

const getToken = () => localStorage.getItem('auth:token')

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

// Convenience APIs for auth
export async function login(email: string, password: string) {
  const body = JSON.stringify({ email, password })
  const data = await fetchJson('/api/auth/login', { method: 'POST', body, skipAuth: true })
  return AuthResponseSchema.parse(data)
}

export async function register(name: string, email: string, password: string) {
  const body = JSON.stringify({ name, email, password })
  const data = await fetchJson('/api/auth/register', { method: 'POST', body, skipAuth: true })
  return AuthResponseSchema.parse(data)
}

