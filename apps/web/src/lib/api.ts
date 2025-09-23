import { AuthResponseSchema } from '@content/shared-types'

export type ApiError = {
  error: string
  code: string
  status: number
  details?: unknown
}

const API_BASE = import.meta.env?.VITE_API_URL ?? 'http://localhost:3000'

export async function fetchJson<T>(
  path: string,
  opts: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(opts.headers || {})
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
