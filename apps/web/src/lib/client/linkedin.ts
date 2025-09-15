import { z } from 'zod'
import { fetchJson, parseWith } from './base'

const UrlResponse = z.object({ url: z.string().url() })
const LinkedInStatusResponse = z.object({ connected: z.boolean() })

export async function getAuthUrl() {
  const data = await fetchJson('/api/linkedin/auth')
  return parseWith(UrlResponse, data)
}

export async function getStatus() {
  const data = await fetchJson('/api/linkedin/status')
  return parseWith(LinkedInStatusResponse, data)
}

export async function disconnect() {
  const data = await fetchJson('/api/linkedin/disconnect', { method: 'POST' })
  return parseWith(LinkedInStatusResponse, data)
}

