import { GetStyleResponseSchema, UpdateStyleRequestSchema, type WritingStyle } from '@content/shared-types'
import { fetchJson, parseWith } from './base'

export async function getStyle() {
  const data = await fetchJson('/api/settings/style', { method: 'GET' })
  return parseWith(GetStyleResponseSchema, data)
}

export async function updateStyle(style: WritingStyle) {
  const body = JSON.stringify(parseWith(UpdateStyleRequestSchema, style))
  const data = await fetchJson('/api/settings/style', { method: 'PUT', body })
  return parseWith(GetStyleResponseSchema, data)
}

