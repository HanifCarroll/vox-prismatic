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

function parseEventData(raw: string | null): unknown {
  if (!raw) {
    return undefined
  }
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

function emitProcessEvent(onEvent: (evt: ProjectProcessEvent) => void, event: string, rawData: string | null) {
  if (!isProjectProcessEventName(event)) {
    return
  }
  const payload = parseEventData(rawData)
  onEvent({ event, data: payload })
}

export async function processStream(
  id: string,
  onEvent: (evt: ProjectProcessEvent) => void,
  signal?: AbortSignal,
) {
  // Step 1: Trigger processing by POSTing to /process
  try {
    await fetchJson(`/api/projects/${id}/process`, { method: 'POST', signal })
  } catch (error) {
    const err = error as ApiError
    if (!err || err.status !== 409) {
      throw error
    }
  }
  // Step 2: Immediately attach to status stream for live updates
  // Whether we get 202 (job dispatched) or 409 (already processing),
  // we always want to listen to the status stream
  return streamStatus(id, onEvent, signal)
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
  if (typeof window !== 'undefined' && typeof window.EventSource !== 'undefined') {
    return new Promise<void>((resolve) => {
      const url = `${API_BASE}/api/projects/${id}/process/stream`
      const es = new EventSource(url, { withCredentials: true })
      let closed = false

      const close = () => {
        if (closed) {
          return
        }
        closed = true
        for (const { eventName, handler } of listeners) {
          es.removeEventListener(eventName, handler as EventListener)
        }
        es.close()
        resolve()
      }

      const listeners = PROCESS_EVENTS.map((eventName) => {
        const handler = (event: MessageEvent) => {
          emitProcessEvent(onEvent, eventName, typeof event.data === 'string' ? event.data : null)
          if (eventName === 'complete' || eventName === 'error' || eventName === 'timeout') {
            close()
          }
        }
        es.addEventListener(eventName, handler as EventListener)
        return { eventName, handler }
      })

      es.onmessage = (event) => {
        emitProcessEvent(onEvent, 'progress', typeof event.data === 'string' ? event.data : null)
      }

      es.onerror = () => {
        emitProcessEvent(onEvent, 'error', null)
        close()
      }

      if (signal) {
        const onAbort = () => {
          close()
        }
        if (signal.aborted) {
          onAbort()
          return
        }
        signal.addEventListener('abort', onAbort, { once: true })
      }
    })
  }

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
      if (event) {
        emitProcessEvent(onEvent, event, data ?? null)
      }
    }
  }
}
