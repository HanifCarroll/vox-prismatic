import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'
import { withSSRContextFromRequest } from './server-context'

// Current @tanstack/start-server-core expects a handler callback directly
const startFetch = createStartHandler(defaultStreamHandler)

// Normalize/repair request URL in dev to avoid Invalid URL errors
function withValidUrl(request: Request): Request {
  try {
    // If this succeeds, the URL is already absolute/valid
    // eslint-disable-next-line no-new
    new URL(request.url)
    return request
  } catch {
    const raw = request.url
    const path = !raw || raw === 'undefined' ? '/' : raw.startsWith('/') ? raw : `/${raw}`
    const proto = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('host') || 'localhost'
    const url = `${proto}://${host}${path}`
    return new Request(url, request)
  }
}

// Export handler expected by the TanStack Start dev server
export const fetch = (request: Request, opts?: any) =>
  withSSRContextFromRequest(request, () => startFetch(withValidUrl(request), opts as any))

export default { fetch }
