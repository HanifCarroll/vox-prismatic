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
    // Proxy API and Sanctum requests to the backend instead of SSR
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/sanctum')) {
      // Prefer explicit VITE_API_URL when set; otherwise fall back to Docker service URL
      const apiBase = (import.meta as any)?.env?.VITE_API_URL || process.env.VITE_API_URL || 'http://api:3000'
      const target = `${apiBase}${url.pathname}${url.search}`
      // Preserve method, headers, and body (including cookies) to support authenticated requests
      const upstreamReq = new Request(target, req)
      return globalThis.fetch(upstreamReq)
    }
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
