import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useAuthMe, useAuthLogin, useAuthRegister, useAuthLogout } from '@/api/auth/auth'
import type { AuthMe200User } from '@/api/generated.schemas'
import { invalidateSessionCache } from '@/lib/session'
import { z } from 'zod'

// Re-export User type from generated schemas
export type User = AuthMe200User

// Create a Zod schema from the generated type for runtime validation
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  createdAt: z.string().nullable(),
  stripeCustomerId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  subscriptionStatus: z.string().nullable(),
  subscriptionCurrentPeriodEnd: z.string().nullable(),
  trialEndsAt: z.string().nullable(),
  trialNotes: z.string().nullable(),
})

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

  // Orval mutation hooks
  const loginMutation = useAuthLogin()
  const registerMutation = useAuthRegister()
  const logoutMutation = useAuthLogout()

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await loginMutation.mutateAsync({ data: { email, password } })
    const nextUser = response.user
    setUser(nextUser)
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    invalidateSessionCache()
  }, [loginMutation])

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const response = await registerMutation.mutateAsync({ data: { name, email, password } })
    const nextUser = response.user
    setUser(nextUser)
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    invalidateSessionCache()
  }, [registerMutation])

  const signOut = useCallback(() => {
    setUser(null)
    localStorage.removeItem(USER_KEY)
    logoutMutation.mutate()
    invalidateSessionCache()
  }, [logoutMutation])

  const refresh = useCallback(async () => {
    // For refresh, we'll use the query directly by calling it from the queryClient
    // This is a workaround since we can't useQuery conditionally inside a callback
    // We'll need to fetch directly using the underlying function
    const { authMe } = await import('@/api/auth/auth')
    const response = await authMe()
    const nextUser = response.user
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
