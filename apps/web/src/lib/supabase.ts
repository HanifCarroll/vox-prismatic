import { createClient, type Session } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: { headers: { 'X-Client-Info': 'web-app' } },
  },
)

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

