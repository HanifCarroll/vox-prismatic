import { z } from 'zod'
import {
  GetSchedulingPreferencesResponseSchema,
  ListTimeslotsResponseSchema,
  UpdateSchedulingPreferencesRequestSchema,
  UpdateTimeslotsRequestSchema,
} from '@content/shared-types'
import { fetchJson, parseWith } from './base'

export async function getPreferences() {
  const data = await fetchJson('/api/scheduling/preferences')
  return parseWith(GetSchedulingPreferencesResponseSchema, data)
}

export async function updatePreferences(req: z.infer<typeof UpdateSchedulingPreferencesRequestSchema>) {
  const body = JSON.stringify(parseWith(UpdateSchedulingPreferencesRequestSchema, req))
  const data = await fetchJson('/api/scheduling/preferences', { method: 'PUT', body })
  return parseWith(GetSchedulingPreferencesResponseSchema, data)
}

export async function listSlots() {
  const data = await fetchJson('/api/scheduling/slots')
  return parseWith(ListTimeslotsResponseSchema, data)
}

export async function replaceSlots(req: z.infer<typeof UpdateTimeslotsRequestSchema>) {
  const body = JSON.stringify(parseWith(UpdateTimeslotsRequestSchema, req))
  const data = await fetchJson('/api/scheduling/slots', { method: 'PUT', body })
  return parseWith(ListTimeslotsResponseSchema, data)
}
