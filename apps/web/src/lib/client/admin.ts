import {
  AdminUpdateTrialRequestSchema,
  AdminUpdateTrialResponseSchema,
  AdminUsageResponseSchema,
  type AdminUpdateTrialRequest,
} from '@content/shared-types'

import { fetchJson, parseWith } from './base'

export async function getUsage(params?: { from?: string; to?: string }) {
  const search = new URLSearchParams()
  if (params?.from) {
    search.set('from', params.from)
  }
  if (params?.to) {
    search.set('to', params.to)
  }
  const query = search.toString()
  const path = `/api/admin/usage${query ? `?${query}` : ''}`
  const data = await fetchJson(path, { method: 'GET' })
  return parseWith(AdminUsageResponseSchema, data)
}

export async function updateTrial(userId: string, payload: AdminUpdateTrialRequest) {
  const body = JSON.stringify(parseWith(AdminUpdateTrialRequestSchema, payload))
  const data = await fetchJson(`/api/admin/users/${userId}/trial`, { method: 'PATCH', body })
  return parseWith(AdminUpdateTrialResponseSchema, data)
}
