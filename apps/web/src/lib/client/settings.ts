import { UpdatePasswordRequestSchema, UpdateProfileRequestSchema, ProfileResponseSchema } from '@content/shared-types'
import { fetchJson, parseWith } from './base'
import type { z } from 'zod'

export async function getProfile() {
  const data = await fetchJson('/api/settings/profile')
  return parseWith(ProfileResponseSchema, data)
}

export async function updateProfile(req: z.infer<typeof UpdateProfileRequestSchema>) {
  const body = JSON.stringify(parseWith(UpdateProfileRequestSchema, req))
  const data = await fetchJson('/api/settings/profile', { method: 'PATCH', body })
  return parseWith(ProfileResponseSchema, data)
}

export async function updatePassword(req: z.infer<typeof UpdatePasswordRequestSchema>) {
  const body = JSON.stringify(parseWith(UpdatePasswordRequestSchema, req))
  const data = await fetchJson('/api/settings/password', { method: 'PATCH', body })
  return parseWith(ProfileResponseSchema, data)
}

