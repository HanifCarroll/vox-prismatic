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
import { fetchJson, parseWith, API_BASE } from './base'
import { supabase } from '@/lib/supabase'

const ProjectEnvelope = z.object({ project: ContentProjectSchema })
const ProjectStatusEnvelope = z.object({ project: ProjectStatusSchema })

export type ProjectsListQuery = z.infer<typeof ListProjectsQuerySchema>

export async function list(query?: Partial<ProjectsListQuery>) {
  // Try direct DB read via Supabase for performance
  try {
    const page = Number(query?.page ?? 1)
    const pageSize = Number(query?.pageSize ?? 10)
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    let qb = supabase
      .from('content_projects')
      .select(
        'id, user_id, title, source_url, current_stage, processing_progress, processing_step, created_at, updated_at',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(from, to)

    if (query?.stage) {
      const stages = Array.isArray(query.stage) ? query.stage : [query.stage]
      qb = qb.in('current_stage', stages as string[])
    }
    if (query?.q && query.q.trim()) {
      qb = qb.ilike('title', `%${query.q.trim()}%`)
    }
    const { data, error, count } = await qb
    if (error) throw error
    const items = (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      sourceUrl: row.source_url ?? null,
      currentStage: row.current_stage,
      processingProgress: row.processing_progress ?? undefined,
      processingStep: row.processing_step ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
    return parseWith(ProjectsListResponseSchema, {
      items,
      meta: { page, pageSize, total: count ?? items.length },
    })
  } catch {
    // Fallback to API
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
}

export async function get(id: string) {
  try {
    const { data, error } = await supabase
      .from('content_projects')
      .select(
        'id, user_id, title, source_url, current_stage, processing_progress, processing_step, created_at, updated_at',
      )
      .eq('id', id)
      .single()
    if (error) throw error
    const project = {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      sourceUrl: data.source_url ?? null,
      currentStage: data.current_stage,
      processingProgress: data.processing_progress ?? undefined,
      processingStep: data.processing_step ?? undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
    return parseWith(ProjectEnvelope, { project })
  } catch (e) {
    const data = await fetchJson(`/api/projects/${id}`)
    return parseWith(ProjectEnvelope, data)
  }
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
  id: string,
  onEvent: (evt: ProjectProcessEvent) => void,
  signal?: AbortSignal,
) {
  const res = await fetch(`${API_BASE}/api/projects/${id}/process`, {
    method: 'POST',
    headers: new Headers({}),
    credentials: 'include',
    signal,
  })

  // If already processing, pivot to the read-only status stream
  if (res.status === 409) {
    return streamStatus(id, onEvent, signal)
  }

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

export async function getStatus(id: string) {
  const data = await fetchJson(`/api/projects/${id}/status`)
  return parseWith(ProjectStatusEnvelope, data)
}

export async function streamStatus(
  id: string,
  onEvent: (evt: ProjectProcessEvent) => void,
  signal?: AbortSignal,
) {
  const res = await fetch(`${API_BASE}/api/projects/${id}/process/stream`, {
    method: 'GET',
    headers: new Headers({}),
    credentials: 'include',
    signal,
  })

  if (!res.ok || !res.body) {
    throw new Error('Failed to start status stream')
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
