import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { User } from '@content/shared-types'
import { login as apiLogin, register as apiRegister } from '@/lib/api'

type AuthState = {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthState | null>(null)

const USER_KEY = 'auth:user'
const TOKEN_KEY = 'auth:token'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)

  // Initialize from localStorage
  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY)
    const u = localStorage.getItem(USER_KEY)
    if (t) setToken(t)
    if (u) {
      try {
        setUser(JSON.parse(u))
      } catch {
        localStorage.removeItem(USER_KEY)
      }
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { token, user } = await apiLogin(email, password)
    setToken(token)
    setUser(user)
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }

  const signUp = async (name: string, email: string, password: string) => {
    const { token, user } = await apiRegister(name, email, password)
    setToken(token)
    setUser(user)
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }

  const signOut = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  const value = useMemo<AuthState>(
    () => ({ user, token, isAuthenticated: !!token, signIn, signUp, signOut }),
    [user, token],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

// Simple guard helper that can be used in components
export function useRequireAuth() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated
}

