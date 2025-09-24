import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { getSession } from '@/lib/session'
import { useState } from 'react'
import { LoginRequestSchema } from '@content/shared-types'
import { useAuth } from '@/auth/AuthContext'


function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const parsed = LoginRequestSchema.safeParse({ email, password })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Invalid input')
      return
    }
    try {
      setLoading(true)
      await signIn(email, password)
      navigate({ to: '/projects' })
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'error' in err && typeof (err as { error?: unknown }).error === 'string') {
        setError((err as { error: string }).error)
      } else {
        setError('Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white rounded-xl shadow p-6 space-y-4"
      >
        <h1 className="text-xl font-semibold">Login</h1>
        <a
          href={(import.meta.env?.VITE_API_URL ?? 'http://localhost:3000') + '/api/auth/google'}
          className="w-full inline-flex items-center justify-center border rounded p-2 text-sm hover:bg-gray-50"
        >
          Continue with Google
        </a>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded">
            {error}
          </div>
        )}
        <div className="space-y-1">
          <label className="block text-sm font-medium" htmlFor="login-email">Email</label>
          <input
            type="email"
            className="w-full border rounded p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            id="login-email"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium" htmlFor="login-password">Password</label>
          <input
            type="password"
            className="w-full border rounded p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            id="login-password"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white rounded p-2 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

export const Route = createFileRoute('/login')({
  component: LoginPage,
  beforeLoad: async () => {
    try {
      await getSession()
      throw redirect({ to: '/projects' })
    } catch {}
  },
})
