import { z } from 'zod'
import {
  ContentProjectSchema,
  CreateProjectRequestSchema,
  ListProjectsQuerySchema,
  ProjectsListResponseSchema,
  UpdateProjectRequestSchema,
  UpdateProjectStageRequestSchema,
} from '@content/shared-types'
import { fetchJson, parseWith, API_BASE } from './base'

const ProjectEnvelope = z.object({ project: ContentProjectSchema })

export type ProjectsListQuery = z.infer<typeof ListProjectsQuerySchema>

export async function list(query?: Partial<ProjectsListQuery>) {
  const sp = new URLSearchParams()
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (typeof v === 'undefined' || v === null || v === '') return
      if (Array.isArray(v)) v.forEach((vv) => sp.append(k, String(vv)))
      else sp.set(k, String(v))
    })
  }
  const qs = sp.toString()
  const data = await fetchJson(`/api/projects${qs ? `?${qs}` : ''}`)
  return parseWith(ProjectsListResponseSchema, data)
}

export async function get(id: number) {
  const data = await fetchJson(`/api/projects/${id}`)
  return parseWith(ProjectEnvelope, data)
}

export async function create(req: z.infer<typeof CreateProjectRequestSchema>) {
  const body = JSON.stringify(parseWith(CreateProjectRequestSchema, req))
  const data = await fetchJson('/api/projects', { method: 'POST', body })
  return parseWith(ProjectEnvelope, data)
}

export async function update(
  id: number,
  req: z.infer<typeof UpdateProjectRequestSchema>,
) {
  const body = JSON.stringify(parseWith(UpdateProjectRequestSchema, req))
  const data = await fetchJson(`/api/projects/${id}`, { method: 'PATCH', body })
  return parseWith(ProjectEnvelope, data)
}

export async function updateStage(
  id: number,
  req: z.infer<typeof UpdateProjectStageRequestSchema>,
) {
  const body = JSON.stringify(parseWith(UpdateProjectStageRequestSchema, req))
  const data = await fetchJson(`/api/projects/${id}/stage`, { method: 'PUT', body })
  return parseWith(ProjectEnvelope, data)
}

export async function remove(id: number) {
  await fetchJson(`/api/projects/${id}`, { method: 'DELETE' })
}

// SSE processing stream helper
export type ProjectProcessEvent =
  | { event: 'started'; data: any }
  | { event: 'progress'; data: any }
  | { event: 'insights_ready'; data: any }
  | { event: 'posts_ready'; data: any }
  | { event: 'complete'; data: any }
  | { event: 'timeout'; data: any }
  | { event: 'error'; data: any }
  | { event: 'ping'; data: any }

export async function processStream(
  id: number,
  onEvent: (evt: ProjectProcessEvent) => void,
  signal?: AbortSignal,
) {
  const res = await fetch(`${API_BASE}/api/projects/${id}/process`, {
    method: 'POST',
    headers: new Headers({
      ...(typeof localStorage !== 'undefined' && localStorage.getItem('auth:token')
        ? { Authorization: `Bearer ${localStorage.getItem('auth:token')}` }
        : {}),
    }),
    credentials: 'include',
    signal,
  })

  if (!res.ok || !res.body) throw new Error('Failed to start processing stream')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      const lines = raw.split('\n')
      let event: string | undefined
      let data: string | undefined
      for (const line of lines) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        if (line.startsWith('data:')) data = line.slice(5).trim()
      }
      if (event) {
        try {
          const parsed = data ? JSON.parse(data) : undefined
          onEvent({ event: event as any, data: parsed } as ProjectProcessEvent)
        } catch {
          onEvent({ event: event as any, data } as any)
        }
      }
    }
  }
}
