import type {
  CreateProjectRequest,
  ProjectStage,
  UpdateProjectRequest,
} from '@content/shared-types'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { env } from '@/config/env'
import { db } from '@/db'
import { contentProjects } from '@/db/schema'
import { generateJson } from '@/modules/ai/ai'
import { generateAndPersist as generateInsights } from '@/modules/insights/insights'
import { generateDraftsFromInsights } from '@/modules/posts/posts'
import { normalizeTranscript } from '@/modules/transcripts/transcripts'
import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@/utils/errors'
import { logger } from '@/middleware/logging'

const PLACEHOLDER_TITLE = 'Untitled Project'

export async function createProject(userId: number, data: CreateProjectRequest) {
  // Insert immediately. Defer AI work to processing SSE.
  const transcriptOriginal = data.transcript?.trim() || ''
  const title = data.title?.trim() || PLACEHOLDER_TITLE

  const [created] = await db
    .insert(contentProjects)
    .values({
      userId,
      title,
      transcriptOriginal,
      transcriptCleaned: null,
      sourceUrl: null,
      currentStage: 'processing',
    })
    .returning()

  return created
}

export async function listProjects(args: {
  userId: number
  page: number
  pageSize: number
  stages?: ProjectStage[]
  q?: string
}) {
  const { userId, page, pageSize, stages, q } = args
  const offset = (page - 1) * pageSize

  const whereClauses: any[] = [eq(contentProjects.userId, userId)]
  if (stages && stages.length > 0) {
    whereClauses.push(inArray(contentProjects.currentStage, stages as any))
  }
  if (q && q.trim()) {
    const pattern = `%${q.trim().toLowerCase()}%`
    whereClauses.push(sql`lower(${contentProjects.title}) like ${pattern}`)
  }
  const where = and(...(whereClauses as any))

  const items = await db.query.contentProjects.findMany({
    where: where as any,
    limit: pageSize,
    offset,
    orderBy: [desc(contentProjects.createdAt)],
  })

  const [{ count }] = await db
    .select({ count: sql<string>`count(*)` })
    .from(contentProjects)
    .where(where as any)
  const total = Number(count || 0)

  return { items, total }
}

export async function getProjectByIdForUser(id: number, userId: number) {
  const project = await db.query.contentProjects.findFirst({ where: eq(contentProjects.id, id) })
  if (!project) {
    throw new NotFoundException('Project not found')
  }
  if (project.userId !== userId) {
    throw new ForbiddenException('You do not have access to this project')
  }
  return project
}

const stageOrder: ProjectStage[] = ['processing', 'posts', 'ready']

function isValidTransition(current: ProjectStage, next: ProjectStage) {
  const currentIndex = stageOrder.indexOf(current)
  const nextIndex = stageOrder.indexOf(next)
  return nextIndex === currentIndex + 1
}

export async function updateProjectStage(args: {
  id: number
  userId: number
  nextStage: ProjectStage
}) {
  const { id, userId, nextStage } = args

  const project = await getProjectByIdForUser(id, userId)

  if (!isValidTransition(project.currentStage as ProjectStage, nextStage)) {
    throw new UnprocessableEntityException('Invalid stage transition', undefined, {
      from: project.currentStage,
      to: nextStage,
      allowedNext: stageOrder[stageOrder.indexOf(project.currentStage as ProjectStage) + 1] || null,
    })
  }

  const [updated] = await db
    .update(contentProjects)
    .set({ currentStage: nextStage, updatedAt: new Date() })
    .where(and(eq(contentProjects.id, id), eq(contentProjects.userId, userId)))
    .returning()

  return updated
}

export async function updateProject(args: {
  id: number
  userId: number
  data: UpdateProjectRequest
}) {
  const { id, userId, data } = args
  const project = await db.query.contentProjects.findFirst({ where: eq(contentProjects.id, id) })
  if (!project) throw new NotFoundException('Project not found')
  if (project.userId !== userId)
    throw new ForbiddenException('You do not have access to this project')

  const title = data.title?.trim()

  const updateValues: Partial<typeof contentProjects.$inferInsert> = { updatedAt: new Date() }
  if (typeof title !== 'undefined') updateValues.title = title

  const [updated] = await db
    .update(contentProjects)
    .set(updateValues)
    .where(and(eq(contentProjects.id, id), eq(contentProjects.userId, userId)))
    .returning()
  return updated
}

export async function deleteProject(args: { id: number; userId: number }) {
  const { id, userId } = args
  const project = await db.query.contentProjects.findFirst({ where: eq(contentProjects.id, id) })
  if (!project) throw new NotFoundException('Project not found')
  if (project.userId !== userId)
    throw new ForbiddenException('You do not have access to this project')

  await db
    .delete(contentProjects)
    .where(and(eq(contentProjects.id, id), eq(contentProjects.userId, userId)))
    .returning()
}

export async function processProject(args: { id: number; userId: number }) {
  const { id, userId } = args
  const project = await db.query.contentProjects.findFirst({ where: eq(contentProjects.id, id) })
  if (!project) throw new NotFoundException('Project not found')
  if (project.userId !== userId)
    throw new ForbiddenException('You do not have access to this project')
  if (project.currentStage !== 'processing') {
    throw new UnprocessableEntityException('Project is not in processing stage')
  }

  const l = logger.child({ module: 'projects.process', projectId: id, userId })

  // Simple synchronous SSE stream for MVP
  const enc = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      l.info({ msg: 'Processing started' })
      const send = (event: string, data?: unknown) => {
        const lines = [`event: ${event}`]
        if (typeof data !== 'undefined') {
          lines.push(`data: ${typeof data === 'string' ? data : JSON.stringify(data)}`)
        }
        lines.push('\n')
        controller.enqueue(enc.encode(lines.join('\n')))
      }

      let finished = false
      const heartbeatMs = env.NODE_ENV === 'test' ? 200 : 15000
      const timeoutMs = 5 * 60 * 1000 // 5 minutes per PRD

      const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))
      const stepDelay = env.NODE_ENV === 'test' ? 0 : 400 // short but visible in dev

      const heartbeat = setInterval(() => {
        if (finished) return
        // Lightweight ping event to keep connection alive
        send('ping', { t: Date.now() })
      }, heartbeatMs)

      const timeout = setTimeout(() => {
        if (finished) return
        send('timeout', { message: 'Processing timed out' })
        finished = true
        clearInterval(heartbeat)
        controller.close()
      }, timeoutMs)

      try {
        send('started', { progress: 0 })
        // Persist initial progress so UI can rehydrate after refresh
        await db
          .update(contentProjects)
          .set({ processingProgress: 0, processingStep: 'started', updatedAt: new Date() })
          .where(and(eq(contentProjects.id, id), eq(contentProjects.userId, userId)))
        await delay(stepDelay)

        // Step 1: Ensure cleaned transcript exists and generate title if placeholder
        l.info({ msg: 'normalize_transcript:start' })
        send('progress', { step: 'normalize_transcript', progress: 10 })
        await db
          .update(contentProjects)
          .set({ processingProgress: 10, processingStep: 'normalize_transcript', updatedAt: new Date() })
          .where(and(eq(contentProjects.id, id), eq(contentProjects.userId, userId)))

        let cleaned = (project as any).transcriptCleaned as string | null
        const original = (project as any).transcriptOriginal as string | null

        if (!cleaned || cleaned.trim().length === 0) {
          l.debug({ msg: 'normalize_transcript:running' })
          const result = await normalizeTranscript({ transcript: (original || '').toString() })
          cleaned = result.transcript
          await db
            .update(contentProjects)
            .set({ transcriptCleaned: cleaned, updatedAt: new Date() })
            .where(and(eq(contentProjects.id, id), eq(contentProjects.userId, userId)))
        }

        if (!project.title || project.title === PLACEHOLDER_TITLE) {
          l.info({ msg: 'title_generation:start' })
          const TitleSchema = z.object({ title: z.string().min(1).max(120) })
          const prompt = `You are naming a content project derived from a client call transcript.\n\nTranscript (cleaned):\n"""\n${cleaned}\n"""\n\nGenerate a short, descriptive title (<= 80 chars) suitable for a project name used to create LinkedIn posts. Be specific, avoid quotes, emojis, trailing punctuation, and hashtags. Respond as JSON: { "title": "..." }.`
          try {
            const out = await generateJson({ schema: TitleSchema, prompt, temperature: 0.2 })
            await db
              .update(contentProjects)
              .set({ title: out.title, updatedAt: new Date() })
              .where(and(eq(contentProjects.id, id), eq(contentProjects.userId, userId)))
            project.title = out.title
          } catch {
            // Keep placeholder on failure
          }
        }

        await delay(stepDelay)

        // Step 2: Generate insights via AI (no fallback)
        l.info({ msg: 'insights_generation:start', target: 7 })
        const insightsResult = await generateInsights({
          projectId: id,
          transcript: cleaned || '',
          target: 7,
        })
        send('insights_ready', { count: insightsResult.count, progress: 50 })
        await db
          .update(contentProjects)
          .set({ processingProgress: 50, processingStep: 'insights_ready', updatedAt: new Date() })
          .where(and(eq(contentProjects.id, id), eq(contentProjects.userId, userId)))
        await delay(stepDelay)

        // Step 3: Generate LinkedIn posts from insights via AI (no fallback)
        l.info({ msg: 'posts_generation:start', limit: 7 })
        const postsResult = await generateDraftsFromInsights({
          userId,
          projectId: id,
          limit: 7,
          transcript: cleaned || '',
        })
        send('posts_ready', { count: postsResult.count, progress: 80 })
        await db
          .update(contentProjects)
          .set({ processingProgress: 80, processingStep: 'posts_ready', updatedAt: new Date() })
          .where(and(eq(contentProjects.id, id), eq(contentProjects.userId, userId)))
        await delay(stepDelay)

        // Advance to next stage (processing → posts)
        l.info({ msg: 'advance_stage:start', nextStage: 'posts' })
        await db
          .update(contentProjects)
          .set({ currentStage: 'posts', processingProgress: 100, processingStep: 'complete', updatedAt: new Date() })
          .where(and(eq(contentProjects.id, id), eq(contentProjects.userId, userId)))
          .returning()

        send('complete', { progress: 100 })
        l.info({ msg: 'Processing complete' })
        finished = true
        clearTimeout(timeout)
        clearInterval(heartbeat)
        controller.close()
      } catch (err) {
        finished = true
        clearTimeout(timeout)
        clearInterval(heartbeat)
        // Communicate error safely to client, then close
        const message = err instanceof Error ? err.message : 'Unknown error'
        l.error({ msg: 'Processing failed', error: message })
        send('error', { message: 'Processing failed' })
        // Best-effort persist error step
        await db
          .update(contentProjects)
          .set({ processingStep: 'error', updatedAt: new Date() })
          .where(and(eq(contentProjects.id, id), eq(contentProjects.userId, userId)))
        controller.close()
      }
    },
    cancel() {
      // Ensure timers are cleared if the client disconnects
      // Note: Scoped variables are not accessible here; timers are cleared on normal completion
    },
  })

  return stream
}
