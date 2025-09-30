import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { UserSchema, type User } from '@content/shared-types'
import { me as apiMe } from '@/lib/client/auth'
import { supabase, setAccessTokenCookie } from '@/lib/supabase'
import { invalidateSessionCache } from '@/lib/session'

type AuthState = {
  user: User | null
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  signOut: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

const USER_KEY = 'auth:user'

export function AuthProvider({ children, initialUser }: { children: React.ReactNode; initialUser?: User | null }) {
  // Initialize from localStorage synchronously on first client render to avoid UI flashes
  const [user, setUser] = useState<User | null>(() => {
    if (typeof initialUser !== 'undefined') {
      return initialUser
    }
    if (typeof window === 'undefined') {
      return null
    }
    try {
      const u = window.localStorage.getItem(USER_KEY)
      if (!u) return null
      const parsed = JSON.parse(u) as unknown
      const result = UserSchema.safeParse(parsed)
      return result.success ? result.data : null
    } catch {
      return null
    }
  })

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    await setAccessTokenCookie(data.session ?? null)
    const { user: nextUser } = await apiMe()
    setUser(nextUser)
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    invalidateSessionCache()
  }, [])

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) throw error
    await setAccessTokenCookie(data.session ?? null)
    const { user: nextUser } = await apiMe()
    setUser(nextUser)
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    invalidateSessionCache()
  }, [])

  const signOut = useCallback(() => {
    setUser(null)
    localStorage.removeItem(USER_KEY)
    supabase.auth.signOut().catch(() => {})
    setAccessTokenCookie(null)
    invalidateSessionCache()
  }, [])

  const refresh = useCallback(async () => {
    const { user: nextUser } = await apiMe()
    const parsed = UserSchema.parse(nextUser)
    setUser(parsed)
    localStorage.setItem(USER_KEY, JSON.stringify(parsed))
    invalidateSessionCache()
  }, [])

  const value = useMemo<AuthState>(
    () => ({ user, isAuthenticated: !!user, signIn, signUp, signOut, refresh }),
    [signIn, signOut, signUp, refresh, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

// Simple guard helper that can be used in components
export function useRequireAuth() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated
}
