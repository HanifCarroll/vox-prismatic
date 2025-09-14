import { createRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { RegisterRequestSchema } from '@content/shared-types'
import { useAuth } from '@/auth/AuthContext'

import type { RootRoute } from '@tanstack/react-router'

function RegisterPage() {
  const { signUp } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const parsed = RegisterRequestSchema.safeParse({ name, email, password })
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message || 'Invalid input')
      return
    }
    try {
      setLoading(true)
      await signUp(name, email, password)
      router.navigate({ to: '/projects' })
    } catch (err: any) {
      setError(err?.error || 'Registration failed')
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
        <h1 className="text-xl font-semibold">Create account</h1>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded">
            {error}
          </div>
        )}
        <div className="space-y-1">
          <label className="block text-sm font-medium">Name</label>
          <input
            type="text"
            className="w-full border rounded p-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Lovelace"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            className="w-full border rounded p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium">Password</label>
          <input
            type="password"
            className="w-full border rounded p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white rounded p-2 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Creating…' : 'Create account'}
        </button>
      </form>
    </div>
  )
}

export default (parentRoute: RootRoute) =>
  createRoute({
    path: '/register',
    component: RegisterPage,
    getParentRoute: () => parentRoute,
    beforeLoad: () => {
      const token = localStorage.getItem('auth:token')
      if (token) throw redirect({ to: '/projects' })
    },
  })

