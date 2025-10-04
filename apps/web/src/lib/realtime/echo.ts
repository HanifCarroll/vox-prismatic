import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
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

const createEcho = (): Echo => {
  if (typeof window === 'undefined') {
    throw new Error('Realtime connections are only available in the browser')
  }

  const key = import.meta.env.VITE_PUSHER_APP_KEY
  if (!key) {
    throw new Error('Missing VITE_PUSHER_APP_KEY environment variable')
  }

  const cluster = import.meta.env.VITE_PUSHER_APP_CLUSTER ?? 'mt1'
  const scheme = import.meta.env.VITE_PUSHER_SCHEME ?? (window.location.protocol === 'https:' ? 'https' : 'http')
  const host = import.meta.env.VITE_PUSHER_HOST ?? window.location.hostname
  const port = resolveNumber(import.meta.env.VITE_PUSHER_PORT, scheme === 'https' ? 443 : 6001)
  const secure = parseBoolean(import.meta.env.VITE_PUSHER_USE_TLS ?? (scheme === 'https'))

  const options: Pusher.Options = {
    cluster,
    wsHost: host,
    wsPort: port,
    wssPort: port,
    forceTLS: secure,
    enabledTransports: secure ? ['wss'] : ['ws', 'wss'],
    withCredentials: true,
    authEndpoint: `${API_BASE}/broadcasting/auth`,
    disableStats: true,
  }

  const client = new Pusher(key, options)

  return new Echo({
    broadcaster: 'pusher',
    client,
    withCredentials: true,
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
  })
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
