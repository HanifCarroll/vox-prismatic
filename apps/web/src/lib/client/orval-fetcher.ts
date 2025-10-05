import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import axios from 'axios'

// Use empty string in development to use Vite proxy (same origin)
// Use full URL in production or when VITE_API_URL is explicitly set
export const API_BASE =
  typeof window === 'undefined'
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
    return
  }
  if (!pendingCsrfFetch) {
    pendingCsrfFetch = fetch(`${API_BASE}/api/sanctum/csrf-cookie`, {
      credentials: 'include',
      headers: { Accept: 'application/json, text/plain, */*' },
    })
      .then((response) => {
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
  if (!token) {
    throw new Error('Unable to obtain CSRF token')
  }
}

// Create custom Axios instance with CSRF handling
const axiosInstance = axios.create({
  baseURL: API_BASE,
})

// Request interceptor to ensure CSRF token before non-safe methods
axiosInstance.interceptors.request.use(
  async (config) => {
    // Set default headers
    if (!config.headers.Accept) {
      config.headers.Accept = 'application/json'
    }
    if (!config.headers['X-Requested-With']) {
      config.headers['X-Requested-With'] = 'XMLHttpRequest'
    }

    // Ensure credentials are included
    config.withCredentials = true

    // Handle SSR cookie forwarding
    if (typeof window === 'undefined') {
      try {
        const mod = await import('@/server-context')
        const ctx = mod.getSSRRequestContext?.()
        const cookie = ctx?.cookie
        if (cookie && !config.headers.cookie) {
          config.headers.cookie = cookie
        }
      } catch {}
    }

    // Ensure CSRF token for non-safe methods
    const method = (config.method ?? 'GET').toUpperCase()
    if (typeof window !== 'undefined' && !SAFE_METHODS.has(method)) {
      await ensureCsrfToken()
      if (!config.headers['X-XSRF-TOKEN']) {
        const token = getCookie('XSRF-TOKEN')
        if (token) {
          config.headers['X-XSRF-TOKEN'] = token
        }
      }
    }

    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle errors consistently
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Attempt CSRF recovery on 419 once per request
    const originalConfig = (error?.config ?? {}) as (AxiosRequestConfig & { _csrfRetry?: boolean })
    const status: number | undefined = error?.response?.status
    if (typeof window !== 'undefined' && status === 419 && !originalConfig._csrfRetry) {
      try {
        originalConfig._csrfRetry = true
        // Force refresh CSRF cookie and retry the original request once
        await fetch(`${API_BASE}/api/sanctum/csrf-cookie`, {
          credentials: 'include',
          headers: { Accept: 'application/json, text/plain, */*' },
          cache: 'no-store',
        })
        const token = getCookie('XSRF-TOKEN')
        if (token) {
          originalConfig.headers = originalConfig.headers ?? {}
          if (!originalConfig.headers['X-XSRF-TOKEN']) {
            originalConfig.headers['X-XSRF-TOKEN'] = token
          }
        }
        return axiosInstance.request(originalConfig)
      } catch {
        // Fall through to normalization + redirect handling
      }
    }

    if (error.response) {
      // Transform API error to match the existing ApiError shape
      const { data } = error.response
      const apiError = {
        error: data?.error ?? error.message ?? 'Request failed',
        code: data?.code ?? 'UNKNOWN_ERROR',
        status: status ?? 500,
        ...(data?.details !== undefined ? { details: data.details } : {}),
      }

      // Global 401/419 handling - redirect to login
      if (typeof window !== 'undefined' && (status === 401 || status === 419)) {
        // Clear stale auth data from localStorage
        window.localStorage.removeItem('auth:user')

        // Only redirect if not already on login/register pages
        const currentPath = window.location.pathname
        if (currentPath !== '/login' && currentPath !== '/register') {
          // Use window.location to ensure full page reload and cache clearing
          window.location.href = '/login'
        }
      }

      throw apiError
    }
    throw error
  }
)

// Custom instance for Orval
export const customInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  return axiosInstance.request<T>(config).then((response: AxiosResponse<T>) => response.data)
}

export default customInstance
