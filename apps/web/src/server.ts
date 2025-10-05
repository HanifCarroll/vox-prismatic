import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'
import type { Register } from '@tanstack/react-start'
import type { RequestOptions } from '@tanstack/start-server-core'
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
export const fetch = (request: Request, opts?: RequestOptions<Register>) => {
  const req = withValidUrl(request)
  // Fast health endpoint that skips SSR work entirely
  try {
    const url = new URL(req.url)
    if (url.pathname === '/_health' || url.pathname === '/health') {
      return new Response(
        JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    }
  } catch {
    // Ignore URL parse issues; fall through to normal handler
  }
  return withSSRContextFromRequest(req, () => startFetch(req, opts))
}

export default { fetch }
