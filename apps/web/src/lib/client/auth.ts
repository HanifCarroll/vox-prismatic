import { z } from 'zod'
import { AuthResponseSchema, UserSchema } from '@content/shared-types'
import { fetchJson, parseWith } from './base'

const MeResponseSchema = z.object({ user: UserSchema })

export async function login(email: string, password: string) {
  const body = JSON.stringify({ email, password })
  const data = await fetchJson('/api/auth/login', { method: 'POST', body, skipAuth: true })
  return parseWith(AuthResponseSchema, data)
}

export async function register(name: string, email: string, password: string) {
  const body = JSON.stringify({ name, email, password })
  const data = await fetchJson('/api/auth/register', { method: 'POST', body, skipAuth: true })
  return parseWith(AuthResponseSchema, data)
}

export async function me() {
  const data = await fetchJson('/api/auth/me', { method: 'GET' })
  return parseWith(MeResponseSchema, data)
}

