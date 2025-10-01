import { createClient, type Session } from '@supabase/supabase-js'

// Resolve Supabase env in both SSR and browser contexts.
// - In the browser, Vite injects `import.meta.env.VITE_*` at build time.
// - In SSR (Nitro/Node), Dokploy may only provide `SUPABASE_URL`/`SUPABASE_ANON_KEY` at runtime.
// We support both to avoid "supabaseUrl is required" during SSR.
const VITE = (import.meta as any)?.env ?? {}

const envFromProcess = (globalThis as any)?.process?.env as
  | Record<string, string | undefined>
  | undefined

const SUPABASE_URL =
  VITE.VITE_SUPABASE_URL || envFromProcess?.VITE_SUPABASE_URL || envFromProcess?.SUPABASE_URL
const SUPABASE_ANON_KEY =
  VITE.VITE_SUPABASE_ANON_KEY ||
  envFromProcess?.VITE_SUPABASE_ANON_KEY ||
  envFromProcess?.SUPABASE_ANON_KEY

if (!SUPABASE_URL) {
  // Provide a clearer error to aid deployment setup
  // eslint-disable-next-line no-console
  console.error(
    'Supabase URL missing. Set VITE_SUPABASE_URL (client) and/or SUPABASE_URL (server).',
  )
  throw new Error('SUPABASE_URL is required for the web app')
}

if (!SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.error(
    'Supabase anon key missing. Set VITE_SUPABASE_ANON_KEY (client) and/or SUPABASE_ANON_KEY (server).',
  )
  throw new Error('SUPABASE_ANON_KEY is required for the web app')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: { headers: { 'X-Client-Info': 'web-app' } },
})

export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export async function setAccessTokenCookie(session: Session | null) {
  if (typeof document === 'undefined') return
  const name = 'sb-access-token'
  if (!session?.access_token) {
    // expire
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`
    return
    
  }
  // Non-HTTPOnly cookie for SSR token forwarding to API; short TTL with rolling refresh
  const ttl = Math.max(60 * 30, Math.floor((session.expires_at ?? 0) - Date.now() / 1000)) // 30m min
  document.cookie = `${name}=${encodeURIComponent(session.access_token)}; Path=/; Max-Age=${ttl}; SameSite=Lax`
}
