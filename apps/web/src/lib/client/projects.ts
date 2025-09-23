import { z } from 'zod'
import {
  ContentProjectSchema,
  CreateProjectRequestSchema,
  type ListProjectsQuerySchema,
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
const PROCESS_EVENTS = [
  'started',
  'progress',
  'insights_ready',
  'posts_ready',
  'complete',
  'timeout',
  'error',
  'ping',
] as const

type ProjectProcessEventName = (typeof PROCESS_EVENTS)[number]

const isProjectProcessEventName = (value: string): value is ProjectProcessEventName =>
  (PROCESS_EVENTS as readonly string[]).includes(value)

export type ProjectProcessEvent = {
  event: ProjectProcessEventName
  data: unknown
}

export async function processStream(
  id: number,
  onEvent: (evt: ProjectProcessEvent) => void,
  signal?: AbortSignal,
) {
  const res = await fetch(`${API_BASE}/api/projects/${id}/process`, {
    method: 'POST',
    headers: new Headers({}),
    credentials: 'include',
    signal,
  })

  if (!res.ok || !res.body) {
    throw new Error('Failed to start processing stream')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }
    buffer += decoder.decode(value, { stream: true })
    let idx: number
    while (true) {
      idx = buffer.indexOf('\n\n')
      if (idx === -1) {
        break
      }
      const raw = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      const lines = raw.split('\n')
      let event: string | undefined
      let data: string | undefined
      for (const line of lines) {
        if (line.startsWith('event:')) {
          event = line.slice(6).trim()
        }
        if (line.startsWith('data:')) {
          data = line.slice(5).trim()
        }
      }
      if (event && isProjectProcessEventName(event)) {
        let payload: unknown = undefined
        if (data) {
          try {
            payload = JSON.parse(data)
          } catch {
            payload = data
          }
        }
        onEvent({ event, data: payload })
      }
    }
  }
}
