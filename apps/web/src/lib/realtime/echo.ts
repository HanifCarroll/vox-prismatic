import Echo from 'laravel-echo'
import { API_BASE, fetchJson } from '@/lib/client/base'

let echoInstance: Echo | null = null

const parseBoolean = (value: string | boolean | undefined): boolean => {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
  }
  return false
}

const resolveNumber = (value: string | number | undefined, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return fallback
}

const normalizeScheme = (value: string | undefined, fallback: 'http' | 'https'): 'http' | 'https' => {
  if (typeof value !== 'string' || value.trim() === '') {
    return fallback
  }
  const normalized = value.trim().toLowerCase()
  return normalized === 'https' ? 'https' : 'http'
}

const sanitizePath = (value: string | undefined): string | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

const createEcho = (): Echo => {
  if (typeof window === 'undefined') {
    throw new Error('Realtime connections are only available in the browser')
  }

  const key = import.meta.env.VITE_REVERB_APP_KEY
  if (!key) {
    throw new Error('Missing VITE_REVERB_APP_KEY environment variable')
  }

  const defaultScheme = window.location.protocol === 'https:' ? 'https' : 'http'
  const scheme = normalizeScheme(import.meta.env.VITE_REVERB_SCHEME, defaultScheme)
  const host = import.meta.env.VITE_REVERB_HOST ?? window.location.hostname
  const port = resolveNumber(import.meta.env.VITE_REVERB_PORT, scheme === 'https' ? 443 : 8080)
  const secure = parseBoolean(import.meta.env.VITE_REVERB_FORCE_TLS ?? (scheme === 'https'))
  const path = sanitizePath(import.meta.env.VITE_REVERB_PATH)

  const options = {
    broadcaster: 'reverb',
    key,
    wsHost: host,
    wsPort: port,
    wssPort: port,
    forceTLS: secure,
    enabledTransports: secure ? ['wss'] : ['ws', 'wss'],
    withCredentials: true,
    authEndpoint: `${API_BASE}/broadcasting/auth`,
    authorizer: (channel) => ({
      authorize: async (socketId, callback) => {
        try {
          const response = await fetchJson<Record<string, unknown>>('/broadcasting/auth', {
            method: 'POST',
            body: JSON.stringify({
              socket_id: socketId,
              channel_name: channel.name,
            }),
          })
          callback(null, response)
        } catch (error) {
          callback(error as Error, null)
        }
      },
    }),
  }

  return new Echo(path ? { ...options, wsPath: path } : options)
}

export const getEcho = (): Echo => {
  if (!echoInstance) {
    echoInstance = createEcho()
  }
  return echoInstance
}

export const disconnectEcho = (): void => {
  if (echoInstance) {
    echoInstance.disconnect()
    echoInstance = null
  }
}
