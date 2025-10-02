import { z } from 'zod'
import { AuthResponseSchema, LoginRequestSchema, RegisterRequestSchema, UserSchema } from '@content/shared-types'
import { fetchJson, parseWith } from './base'

const MeResponseSchema = z.object({ user: UserSchema })

export async function me(init?: { headers?: HeadersInit }) {
  const data = await fetchJson('/api/auth/me', { method: 'GET', headers: init?.headers })
  return parseWith(MeResponseSchema, data)
}

export async function login(input: z.infer<typeof LoginRequestSchema>) {
  const body = JSON.stringify(parseWith(LoginRequestSchema, input))
  const data = await fetchJson('/api/auth/login', { method: 'POST', body })
  return parseWith(AuthResponseSchema, data)
}

export async function register(input: z.infer<typeof RegisterRequestSchema>) {
  const body = JSON.stringify(parseWith(RegisterRequestSchema, input))
  const data = await fetchJson('/api/auth/register', { method: 'POST', body })
  return parseWith(AuthResponseSchema, data)
}

export async function logout() {
  await fetchJson('/api/auth/logout', { method: 'POST' })
}
