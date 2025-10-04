import { z } from 'zod'
import {
  ContentProjectSchema,
  CreateProjectRequestSchema,
  type ListProjectsQuerySchema,
  ProjectsListResponseSchema,
  UpdateProjectRequestSchema,
  UpdateProjectStageRequestSchema,
  ProjectStatusSchema,
} from '@content/shared-types'
import { fetchJson, parseWith } from './base'
import type { ApiError } from './base'

const ProjectEnvelope = z.object({ project: ContentProjectSchema })
const ProjectStatusEnvelope = z.object({ project: ProjectStatusSchema })

export type ProjectsListQuery = z.infer<typeof ListProjectsQuerySchema>

export async function list(query?: Partial<ProjectsListQuery>) {
  const sp = new URLSearchParams()
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (typeof v === 'undefined' || v === null || v === '') {
        continue
      }
      if (Array.isArray(v)) {
        for (const vv of v) {
          sp.append(k, String(vv))
        }
      } else {
        sp.set(k, String(v))
      }
    }
  }
  const qs = sp.toString()
  const data = await fetchJson(`/api/projects${qs ? `?${qs}` : ''}`)
  return parseWith(ProjectsListResponseSchema, data)
}

export async function get(id: string) {
  const data = await fetchJson(`/api/projects/${id}`)
  return parseWith(ProjectEnvelope, data)
}

export async function create(req: z.infer<typeof CreateProjectRequestSchema>) {
  const body = JSON.stringify(parseWith(CreateProjectRequestSchema, req))
  const data = await fetchJson('/api/projects', { method: 'POST', body })
  return parseWith(ProjectEnvelope, data)
}

export async function update(
  id: string,
  req: z.infer<typeof UpdateProjectRequestSchema>,
) {
  const body = JSON.stringify(parseWith(UpdateProjectRequestSchema, req))
  const data = await fetchJson(`/api/projects/${id}`, { method: 'PATCH', body })
  return parseWith(ProjectEnvelope, data)
}

export async function updateStage(
  id: string,
  req: z.infer<typeof UpdateProjectStageRequestSchema>,
) {
  const body = JSON.stringify(parseWith(UpdateProjectStageRequestSchema, req))
  const data = await fetchJson(`/api/projects/${id}/stage`, { method: 'PUT', body })
  return parseWith(ProjectEnvelope, data)
}

export async function remove(id: string) {
  await fetchJson(`/api/projects/${id}`, { method: 'DELETE' })
}

export async function getStatus(id: string) {
  const data = await fetchJson(`/api/projects/${id}/status`)
  return parseWith(ProjectStatusEnvelope, data)
}
const ProjectProcessResponseSchema = z.object({
  queued: z.boolean().optional(),
  project: z.object({
    currentStage: z.string(),
    processingStep: z.string().nullable().optional(),
    processingProgress: z.number().int().nullable().optional(),
  }),
})

export async function startProcessing(id: string) {
  try {
    const data = await fetchJson(`/api/projects/${id}/process`, { method: 'POST' })
    return parseWith(ProjectProcessResponseSchema, data)
  } catch (error) {
    const err = error as ApiError
    if (err?.status === 409) {
      return {
        queued: false,
        project: {
          currentStage: 'processing',
          processingStep: 'queued',
          processingProgress: 0,
        },
      }
    }
    throw error
  }
}
