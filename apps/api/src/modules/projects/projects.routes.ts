import {
  CreateProjectRequestSchema,
  ListProjectsQuerySchema,
  UpdateProjectRequestSchema,
  UpdateProjectStageRequestSchema,
} from '@content/shared-types'
import { Hono } from 'hono'
import { apiRateLimit } from '@/middleware/rate-limit'
import { validateRequest } from '@/middleware/validation'
import { authMiddleware } from '@/modules/auth/auth.middleware'
import { logger } from '@/middleware/logging'
import { createUserClient, extractSupabaseToken } from '@/services/supabase'
import { env } from '@/config/env'
import { normalizeTranscript } from '@/modules/transcripts/transcripts'
import { generateJson, FLASH_MODEL } from '@/modules/ai/ai'

export const projectsRoutes = new Hono()

// All projects routes require auth
projectsRoutes.use('*', authMiddleware)

/**
 * POST /projects
 * Create a new content project
 */
projectsRoutes.post(
  '/',
  apiRateLimit,
  validateRequest('json', CreateProjectRequestSchema),
  async (c) => {
    const user = c.get('user')
    const token = extractSupabaseToken(c)
    if (!token) throw new Error('Missing token')
    const userClient = createUserClient(token)
    const body = c.req.valid('json')
    const title = body.title?.trim() || 'Untitled Project'
    const transcript = body.transcript?.trim() || ''
    const { data, error } = await userClient
      .from('content_projects')
      .insert({
        user_id: user.userId,
        title,
        source_url: null,
        transcript_original: transcript,
        transcript_cleaned: null,
        current_stage: 'processing',
        processing_progress: 0,
        processing_step: null,
      })
      .select('id, user_id, title, source_url, current_stage, processing_progress, processing_step, created_at, updated_at')
      .single()
    if (error) {
      return c.json({ error: 'Failed to create project', code: 'CREATE_FAILED', status: 400 }, 400)
    }
    const project = {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      sourceUrl: data.source_url,
      currentStage: data.current_stage,
      processingProgress: data.processing_progress ?? undefined,
      processingStep: data.processing_step ?? undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
    return c.json({ project }, 201)
  },
)

/**
 * GET /projects
 * List projects with pagination and optional stage filter
 */
projectsRoutes.get('/', validateRequest('query', ListProjectsQuerySchema), async (c) => {
  const token = extractSupabaseToken(c)
  if (!token) return c.json({ items: [], meta: { page: 1, pageSize: 0, total: 0 } })
  const userClient = createUserClient(token)
  const { page, pageSize, stage, q } = c.req.valid('query')
  const stages = Array.isArray(stage) ? stage : stage ? [stage] : undefined
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  let qb = userClient
    .from('content_projects')
    .select(
      'id, user_id, title, source_url, current_stage, processing_progress, processing_step, created_at, updated_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to)
  if (stages && stages.length) qb = qb.in('current_stage', stages as string[])
  if (q && q.trim()) qb = qb.ilike('title', `%${q.trim()}%`)
  const { data, error, count } = await qb
  if (error) return c.json({ items: [], meta: { page, pageSize, total: 0 } })
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
  return c.json({ items, meta: { page, pageSize, total: count ?? items.length } })
})

/**
 * GET /projects/:id
 * Get a single project
 */
projectsRoutes.get('/:id', async (c) => {
  const token = extractSupabaseToken(c)
  if (!token) return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED', status: 401 }, 401)
  const userClient = createUserClient(token)
  const id = c.req.param('id')
  const { data, error } = await userClient
    .from('content_projects')
    .select(
      'id, user_id, title, source_url, current_stage, processing_progress, processing_step, created_at, updated_at',
    )
    .eq('id', id)
    .single()
  if (error || !data) return c.json({ error: 'Not found', code: 'NOT_FOUND', status: 404 }, 404)
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
  return c.json({ project })
})

/**
 * GET /projects/:id/status
 * Lightweight status for reconnects/polling
 */
projectsRoutes.get('/:id/status', async (c) => {
  const token = extractSupabaseToken(c)
  if (!token) return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED', status: 401 }, 401)
  const userClient = createUserClient(token)
  const id = c.req.param('id')
  const { data, error } = await userClient
    .from('content_projects')
    .select('current_stage, processing_progress, processing_step')
    .eq('id', id)
    .single()
  if (error || !data) return c.json({ error: 'Not found', code: 'NOT_FOUND', status: 404 }, 404)
  const status = {
    currentStage: data.current_stage,
    processingProgress: data.processing_progress ?? undefined,
    processingStep: data.processing_step ?? undefined,
  }
  return c.json({ project: status })
})

/**
 * PUT /projects/:id/stage
 * Update project stage (enforces allowed transitions)
 */
projectsRoutes.put(
  '/:id/stage',
  validateRequest('json', UpdateProjectStageRequestSchema),
  async (c) => {
    const token = extractSupabaseToken(c)
    if (!token) return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED', status: 401 }, 401)
    const userClient = createUserClient(token)
    const id = c.req.param('id')
    const { nextStage } = c.req.valid('json')
    const stageOrder = ['processing', 'posts', 'ready'] as const
    const { data: current, error } = await userClient
      .from('content_projects')
      .select('current_stage')
      .eq('id', id)
      .single()
    if (error || !current) return c.json({ error: 'Not found', code: 'NOT_FOUND', status: 404 }, 404)
    const curr = current.current_stage as (typeof stageOrder)[number]
    const valid = stageOrder.indexOf(nextStage as any) === stageOrder.indexOf(curr) + 1
    if (!valid) return c.json({ error: 'Invalid stage transition', code: 'INVALID_TRANSITION', status: 422 }, 422)
    const { data: updated, error: upErr } = await userClient
      .from('content_projects')
      .update({ current_stage: nextStage, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(
        'id, user_id, title, source_url, current_stage, processing_progress, processing_step, created_at, updated_at',
      )
      .single()
    if (upErr || !updated) return c.json({ error: 'Update failed', code: 'UPDATE_FAILED', status: 400 }, 400)
    const project = {
      id: updated.id,
      userId: updated.user_id,
      title: updated.title,
      sourceUrl: updated.source_url ?? null,
      currentStage: updated.current_stage,
      processingProgress: updated.processing_progress ?? undefined,
      processingStep: updated.processing_step ?? undefined,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    }
    return c.json({ project })
  },
)

/**
 * PATCH /projects/:id
 * Update editable project fields
 */
projectsRoutes.patch('/:id', validateRequest('json', UpdateProjectRequestSchema), async (c) => {
  const token = extractSupabaseToken(c)
  if (!token) return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED', status: 401 }, 401)
  const userClient = createUserClient(token)
  const id = c.req.param('id')
  const data = c.req.valid('json')
  const updates: any = { updated_at: new Date().toISOString() }
  if (typeof data.title !== 'undefined') updates.title = data.title
  if (typeof data.transcript !== 'undefined') updates.transcript_original = data.transcript
  const { data: updated, error } = await userClient
    .from('content_projects')
    .update(updates)
    .eq('id', id)
    .select(
      'id, user_id, title, source_url, current_stage, processing_progress, processing_step, created_at, updated_at',
    )
    .single()
  if (error || !updated) return c.json({ error: 'Update failed', code: 'UPDATE_FAILED', status: 400 }, 400)
  const project = {
    id: updated.id,
    userId: updated.user_id,
    title: updated.title,
    sourceUrl: updated.source_url ?? null,
    currentStage: updated.current_stage,
    processingProgress: updated.processing_progress ?? undefined,
    processingStep: updated.processing_step ?? undefined,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  }
  return c.json({ project })
})

/**
 * DELETE /projects/:id
 * Delete a project
 */
projectsRoutes.delete('/:id', async (c) => {
  const token = extractSupabaseToken(c)
  if (!token) throw new Error('Missing token')
  const userClient = createUserClient(token)
  const id = c.req.param('id')
  const { error } = await userClient.from('content_projects').delete().eq('id', id)
  if (error) {
    return c.json({ error: 'Failed to delete', code: 'DELETE_FAILED', status: 400 }, 400)
  }
  return c.body(null, 204)
})

/**
 * POST /projects/:id/process (SSE)
 * Synchronous processing with progress SSE
 */
projectsRoutes.post('/:id/process', apiRateLimit, async (c) => {
  const token = extractSupabaseToken(c)
  if (!token)
    return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED', status: 401 }, 401)
  const userClient = createUserClient(token)
  const id = c.req.param('id')
  logger.info({ msg: 'Process endpoint invoked', projectId: id })

  const enc = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data?: unknown) => {
        const lines = [`event: ${event}`]
        if (typeof data !== 'undefined')
          lines.push(`data: ${typeof data === 'string' ? data : JSON.stringify(data)}`)
        lines.push('\n')
        controller.enqueue(enc.encode(lines.join('\n')))
      }
      const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))
      const stepDelay = env.NODE_ENV === 'test' ? 0 : 400
      let finished = false
      const heartbeatMs = env.NODE_ENV === 'test' ? 200 : 15000
      const timeoutMs = 5 * 60 * 1000
      const heartbeat = setInterval(() => {
        if (!finished) send('ping', { t: Date.now() })
      }, heartbeatMs)
      const timeout = setTimeout(() => {
        if (!finished) {
          send('timeout', { message: 'Processing timed out' })
          finished = true
          clearInterval(heartbeat)
          controller.close()
        }
      }, timeoutMs)
      try {
        send('started', { progress: 0 })
        await userClient
          .from('content_projects')
          .update({ processing_progress: 0, processing_step: 'started', updated_at: new Date().toISOString() })
          .eq('id', id)

        // Load current project
        const { data: project } = await userClient
          .from('content_projects')
          .select('title, transcript_original, transcript_cleaned, current_stage')
          .eq('id', id)
          .single()

        // Step 1: normalize transcript
        send('progress', { step: 'normalize_transcript', progress: 10 })
        await userClient
          .from('content_projects')
          .update({ processing_progress: 10, processing_step: 'normalize_transcript' })
          .eq('id', id)
        await delay(stepDelay)
        let cleaned = (project as any)?.transcript_cleaned as string | null
        const original = (project as any)?.transcript_original as string | null
        if (!cleaned || cleaned.trim().length === 0) {
          const result = await normalizeTranscript({ transcript: (original || '').toString() }, { projectId: id as any })
          cleaned = result.transcript
          await userClient
            .from('content_projects')
            .update({ transcript_cleaned: cleaned, updated_at: new Date().toISOString() })
            .eq('id', id)
        }

        // Title generation if placeholder
        if (!project?.title || project.title === 'Untitled Project') {
          const { z } = await import('zod') as any
          const TitleSchema = z.object({ title: z.string().min(1).max(120) })
          const prompt = `You are naming a content project derived from a client call transcript.\n\nTranscript (cleaned):\n"""\n${cleaned}\n"""\n\nGenerate a short, descriptive title (<= 80 chars). Respond as JSON: { "title": "..." }.`
          try {
            const out = await generateJson({ schema: TitleSchema, prompt, temperature: 0.2, model: FLASH_MODEL, action: 'project.title' })
            await userClient
              .from('content_projects')
              .update({ title: (out as any).title, updated_at: new Date().toISOString() })
              .eq('id', id)
          } catch {}
        }

        await delay(stepDelay)

        // Step 2: generate insights
        send('progress', { step: 'insights_generation', progress: 50 })
        await userClient
          .from('content_projects')
          .update({ processing_progress: 50, processing_step: 'insights_generation' })
          .eq('id', id)
        const { default: z } = await import('zod')
        const InsightItemSchema = z.object({ content: z.string().min(1).max(1000), quote: z.string().min(1).max(200), score: z.number().min(0).max(1) })
        const InsightsResponseSchema = z.object({ insights: z.array(InsightItemSchema).min(1) })
        const insightsJson = await generateJson({
          schema: InsightsResponseSchema,
          prompt: [
            'Extract concise insights suitable for LinkedIn thought-leadership from the transcript below.',
            'Return between 5 and 10 items when possible.',
            'Each insight should be a single, self-contained idea (1–2 sentences).',
            'Provide a short, punchy quote and a quality score between 0.0 and 1.0.',
            'Output strictly as JSON in this shape: { "insights": [ { "content": string, "quote": string, "score": number } ] }',
            '\nTranscript:\n',
            cleaned || '',
          ].join('\n'),
          action: 'insight.generate',
        })
        const seen = new Set<string>()
        const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
        const unique = (insightsJson as any).insights
          .map((i: any) => ({ content: i.content.trim(), quote: i.quote.trim(), score: Math.max(0, Math.min(1, i.score ?? 0)) }))
          .filter((i: any) => i.content.length > 0)
          .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
          .filter((i: any) => { const k = normalize(i.content); if (seen.has(k)) return false; seen.add(k); return true })
          .slice(0, 7)
        if (unique.length > 0) {
          await userClient
            .from('insights')
            .insert(unique.map((i: any) => ({ project_id: id, content: i.content, quote: i.quote.slice(0, 200), score: i.score, is_approved: false })))
        }
        send('insights_ready', { count: unique.length, progress: 60 })
        await userClient
          .from('content_projects')
          .update({ processing_progress: 60, processing_step: 'insights_ready' })
          .eq('id', id)
        await delay(stepDelay)

        // Step 3: generate posts (simple)
        send('progress', { step: 'posts_generation', progress: 80 })
        const { data: insights } = await userClient
          .from('insights')
          .select('id, content')
          .eq('project_id', id)
          .order('id', { ascending: true })
        const PostOutSchema = z.object({ content: z.string().min(40).max(3000) })
        const createdPosts: any[] = []
        for (const ins of insights || []) {
          const prompt = `Write a LinkedIn post (no emojis unless needed) based on this insight. Keep to 4-6 short paragraphs.\n\nInsight:\n${ins.content}\n\nReturn JSON { "content": string }.`
          try {
            const out = await generateJson({ schema: PostOutSchema, prompt, temperature: 0.4, model: FLASH_MODEL, action: 'post.generate' })
            createdPosts.push({ project_id: id, insight_id: ins.id, content: (out as any).content, hashtags: [], platform: 'LinkedIn', status: 'pending' })
          } catch {}
        }
        if (createdPosts.length > 0) {
          await userClient.from('posts').insert(createdPosts)
        }
        send('posts_ready', { count: createdPosts.length, progress: 90 })
        await userClient
          .from('content_projects')
          .update({ processing_progress: 90, processing_step: 'posts_ready' })
          .eq('id', id)
        await delay(stepDelay)

        // Complete
        await userClient
          .from('content_projects')
          .update({ current_stage: 'posts', processing_progress: 100, processing_step: 'complete', updated_at: new Date().toISOString() })
          .eq('id', id)
        send('complete', { progress: 100 })
        finished = true
        clearTimeout(timeout)
        clearInterval(heartbeat)
        controller.close()
      } catch (e) {
        finished = true
        clearTimeout(timeout)
        clearInterval(heartbeat)
        send('error', { message: 'Processing failed' })
        await userClient
          .from('content_projects')
          .update({ processing_step: 'error', updated_at: new Date().toISOString() })
          .eq('id', id)
        controller.close()
      }
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } })
})

/**
 * GET /projects/:id/process/stream
 * Read-only SSE stream for status updates (no side effects)
 */
projectsRoutes.get('/:id/process/stream', async (c) => {
  const token = extractSupabaseToken(c)
  if (!token)
    return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED', status: 401 }, 401)
  const userClient = createUserClient(token)
  const id = c.req.param('id')
  const enc = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data?: unknown) => {
        const lines = [`event: ${event}`]
        if (typeof data !== 'undefined') lines.push(`data: ${typeof data === 'string' ? data : JSON.stringify(data)}`)
        lines.push('\n')
        controller.enqueue(enc.encode(lines.join('\n')))
      }
      let finished = false
      const heartbeatMs = env.NODE_ENV === 'test' ? 200 : 15000
      const pollMs = env.NODE_ENV === 'test' ? 100 : 1000
      const heartbeat = setInterval(() => { if (!finished) send('ping', { t: Date.now() }) }, heartbeatMs)
      try {
        const { data, error } = await userClient
          .from('content_projects')
          .select('current_stage, processing_progress, processing_step')
          .eq('id', id)
          .single()
        if (error || !data) {
          send('error', { message: 'Unable to load status' })
          finished = true
          clearInterval(heartbeat)
          controller.close()
          return
        }
        send('progress', { step: data.processing_step || 'snapshot', progress: data.processing_progress ?? 0 })
        if (data.current_stage !== 'processing') {
          send('complete', { progress: 100 })
          finished = true
          clearInterval(heartbeat)
          controller.close()
          return
        }
        let lastProgress = data.processing_progress ?? -1
        let lastStep = data.processing_step || null
        const poll = setInterval(async () => {
          if (finished) return
          const { data: s, error: e2 } = await userClient
            .from('content_projects')
            .select('current_stage, processing_progress, processing_step')
            .eq('id', id)
            .single()
          if (e2 || !s) {
            send('error', { message: 'Status polling failed' })
            finished = true
            clearInterval(poll)
            clearInterval(heartbeat)
            controller.close()
            return
          }
          if (s.current_stage !== 'processing') {
            send('complete', { progress: 100 })
            finished = true
            clearInterval(poll)
            clearInterval(heartbeat)
            controller.close()
            return
          }
          const prog = s.processing_progress ?? 0
          const step = s.processing_step || null
          if (prog !== lastProgress || step !== lastStep) {
            send('progress', { step: step || 'processing', progress: prog })
            lastProgress = prog
            lastStep = step
          }
        }, pollMs)
      } catch {
        send('error', { message: 'Unable to start status stream' })
        finished = true
        clearInterval(heartbeat)
        controller.close()
      }
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } })
})
