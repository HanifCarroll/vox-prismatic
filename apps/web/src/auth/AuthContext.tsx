import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { User } from '@content/shared-types'
import { login as apiLogin, register as apiRegister, logout as apiLogout } from '@/lib/client/auth'
import { invalidateSessionCache } from '@/lib/session'

type AuthState = {
  user: User | null
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthState | null>(null)

const USER_KEY = 'auth:user'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  // Initialize from localStorage
  useEffect(() => {
    const u = localStorage.getItem(USER_KEY)
    if (u) {
      try {
        setUser(JSON.parse(u))
      } catch {
        localStorage.removeItem(USER_KEY)
      }
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { user: nextUser } = await apiLogin(email, password)
    setUser(nextUser)
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    invalidateSessionCache()
  }, [])

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const { user: nextUser } = await apiRegister(name, email, password)
    setUser(nextUser)
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    invalidateSessionCache()
  }, [])

  const signOut = useCallback(() => {
    setUser(null)
    localStorage.removeItem(USER_KEY)
    // Fire and forget; cookie cleared server-side
    apiLogout().catch(() => {})
    invalidateSessionCache()
  }, [])

  const value = useMemo<AuthState>(
    () => ({ user, isAuthenticated: !!user, signIn, signUp, signOut }),
    [signIn, signOut, signUp, user],
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
