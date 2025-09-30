import { createClient } from '@supabase/supabase-js'
import type { Context } from 'hono'
import { env } from '@/config/env'

// Service role client for privileged server actions (admin/webhooks/background tasks)
export const supabaseService = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { 'X-Client-Info': 'api-service-role' } },
})

// Per-request user client using a Bearer token
export function createUserClient(token: string) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Client-Info': 'api-user-client',
      },
    },
  })
}

// Helper to extract Supabase access token from Authorization header or cookie
export function extractSupabaseToken(c: Context): string | null {
  const auth = c.req.header('authorization') || c.req.header('Authorization')
  if (auth && /^Bearer\s+/i.test(auth)) {
    const tok = auth.replace(/^Bearer\s+/i, '').trim()
    if (tok) return tok
  }
  const cookieHeader = c.req.header('Cookie') || c.req.header('cookie') || ''
  if (cookieHeader) {
    const parts = cookieHeader.split(';').map((p) => p.trim())
    // Common cookie name used by SSR helpers / our client bridge
    const access = parts.find((p) => p.startsWith('sb-access-token='))
    if (access) {
      const val = access.split('=')[1]
      if (val) return decodeURIComponent(val)
    }
  }
  return null
}

