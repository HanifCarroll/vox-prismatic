import { z } from 'zod'
import { UserSchema } from '@content/shared-types'
import { fetchJson, parseWith } from './base'

const MeResponseSchema = z.object({ user: UserSchema })

// Login/register are handled by Supabase on the client.

export async function me(init?: { headers?: HeadersInit }) {
  const data = await fetchJson('/api/auth/me', { method: 'GET', headers: init?.headers })
  return parseWith(MeResponseSchema, data)
}

// Logout is handled by Supabase on the client.
