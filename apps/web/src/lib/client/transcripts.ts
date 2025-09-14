import {
  TranscriptGetResponseSchema,
  TranscriptNormalizeRequestSchema,
  TranscriptNormalizeResponseSchema,
  TranscriptUpdateRequestSchema,
  ContentProjectSchema,
} from '@content/shared-types'
import { fetchJson, parseWith } from './base'
import { z } from 'zod'

const ProjectEnvelope = z.object({ project: ContentProjectSchema })

export async function preview(req: z.infer<typeof TranscriptNormalizeRequestSchema>) {
  const body = JSON.stringify(parseWith(TranscriptNormalizeRequestSchema, req))
  const data = await fetchJson('/api/transcripts/preview', { method: 'POST', body })
  return parseWith(TranscriptNormalizeResponseSchema, data)
}

export async function get(projectId: number) {
  const data = await fetchJson(`/api/transcripts/${projectId}`)
  return parseWith(TranscriptGetResponseSchema, data)
}

export async function update(projectId: number, req: z.infer<typeof TranscriptUpdateRequestSchema>) {
  const body = JSON.stringify(parseWith(TranscriptUpdateRequestSchema, req))
  const data = await fetchJson(`/api/transcripts/${projectId}`, { method: 'PUT', body })
  return parseWith(ProjectEnvelope, data)
}

