import type { z } from 'zod'

export type ApiError = {
  error: string
  code: string
  status: number
  details?: unknown
}

// Use empty string in development to use Vite proxy (same origin)
// Use full URL in production or when VITE_API_URL is explicitly set
// Compute API base for SSR vs browser
// - Browser: use same-origin and Vite proxy (empty base)
// - SSR (Node): prefer process.env.VITE_API_URL, else Docker default
export const API_BASE = typeof window === 'undefined'
  ? // eslint-disable-next-line no-process-env, @typescript-eslint/no-explicit-any
    (((process as any)?.env?.VITE_API_URL as string | undefined) ?? 'http://api:3000')
  : ''


const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null
  }
  const escaped = name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
  const pattern = new RegExp(`(?:^|; )${escaped}=([^;]*)`)
  const match = document.cookie.match(pattern)
  return match ? decodeURIComponent(match[1]) : null
}

let pendingCsrfFetch: Promise<void> | null = null

async function ensureCsrfToken(): Promise<void> {
  if (typeof window === 'undefined') {
    return
  }
  if (getCookie('XSRF-TOKEN')) {
    console.log('[CSRF] Token already exists')
    return
  }
  console.log('[CSRF] Fetching CSRF cookie from:', `${API_BASE}/sanctum/csrf-cookie`)
  if (!pendingCsrfFetch) {
    pendingCsrfFetch = fetch(`${API_BASE}/sanctum/csrf-cookie`, {
      credentials: 'include',
      headers: { Accept: 'application/json, text/plain, */*' },
    })
      .then((response) => {
        console.log('[CSRF] Response status:', response.status)
        console.log('[CSRF] Response headers:', Object.fromEntries(response.headers.entries()))
        console.log('[CSRF] All cookies after response:', document.cookie)
        if (!response.ok) {
          throw new Error('Failed to fetch CSRF cookie')
        }
      })
      .finally(() => {
        pendingCsrfFetch = null
      })
  }
  await pendingCsrfFetch

  const token = getCookie('XSRF-TOKEN')
  console.log('[CSRF] Token after fetch:', token)
  console.log('[CSRF] All cookies:', document.cookie)
  if (!token) {
    throw new Error('Unable to obtain CSRF token')
  }
}

export async function fetchJson<T>(path: string, opts: RequestInit & { skipAuth?: boolean } = {}): Promise<T> {
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
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }
  if (!headers.has('X-Requested-With')) {
    headers.set('X-Requested-With', 'XMLHttpRequest')
  }

  const method = (opts.method ?? 'GET').toUpperCase()

  if (typeof window !== 'undefined' && !SAFE_METHODS.has(method)) {
    await ensureCsrfToken()
    if (!headers.has('X-XSRF-TOKEN')) {
      const token = getCookie('XSRF-TOKEN')
      if (token) {
        headers.set('X-XSRF-TOKEN', token)
      }
    }
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
