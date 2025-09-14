import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/db'
import { contentProjects, insights, posts } from '@/db/schema'
import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@/utils/errors'
import { env } from '@/config/env'
import type {
  CreateProjectRequest,
  ProjectStage,
  TonePreset,
  UpdateProjectRequest,
} from '@content/shared-types'

export async function createProject(userId: number, data: CreateProjectRequest) {
  const title = data.title.trim()
  const transcript = data.transcript?.trim() || null
  const sourceUrl = data.sourceUrl?.trim() || null
  const tonePreset = data.tonePreset

  const [created] = await db
    .insert(contentProjects)
    .values({
      userId,
      title,
      transcript,
      sourceUrl,
      currentStage: 'processing',
      tonePreset,
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

const stageOrder: ProjectStage[] = ['processing', 'review', 'posts', 'ready']

function isValidTransition(current: ProjectStage, next: ProjectStage) {
  const currentIndex = stageOrder.indexOf(current)
  const nextIndex = stageOrder.indexOf(next)
  return nextIndex === currentIndex + 1
}

export async function updateProjectStage(args: { id: number; userId: number; nextStage: ProjectStage }) {
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
  if (project.userId !== userId) throw new ForbiddenException('You do not have access to this project')

  const title = data.title?.trim()
  const transcript = data.transcript?.trim() ?? data.transcript ?? undefined
  const sourceUrl = data.sourceUrl?.trim() ?? data.sourceUrl ?? undefined

  const updateValues: Partial<typeof contentProjects.$inferInsert> = { updatedAt: new Date() }
  if (typeof title !== 'undefined') updateValues.title = title
  if (typeof transcript !== 'undefined') updateValues.transcript = transcript
  if (typeof sourceUrl !== 'undefined') updateValues.sourceUrl = sourceUrl

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
  if (project.userId !== userId) throw new ForbiddenException('You do not have access to this project')

  await db.delete(contentProjects).where(and(eq(contentProjects.id, id), eq(contentProjects.userId, userId))).returning()
}

export async function processProject(args: { id: number; userId: number }) {
  const { id, userId } = args
  const project = await db.query.contentProjects.findFirst({ where: eq(contentProjects.id, id) })
  if (!project) throw new NotFoundException('Project not found')
  if (project.userId !== userId) throw new ForbiddenException('You do not have access to this project')
  if (project.currentStage !== 'processing') {
    throw new UnprocessableEntityException('Project is not in processing stage')
  }

  // Simple synchronous SSE stream for MVP
  const enc = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
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
        await delay(stepDelay)

        // Step 1: Basic transcript normalization (no-op if already set)
        // TODO [transcripts]: replace with transcripts module service, e.g.
        // const transcript = await transcriptsService.normalize({ projectId: id, sourceUrl: project.sourceUrl, transcript: project.transcript })
        const transcript = (project.transcript || '').toString().trim()
        send('progress', { step: 'normalize_transcript', progress: 10 })
        await delay(stepDelay)

        // Step 2: Extract naive insights from transcript (split sentences, pick up to 5)
        // TODO [insights]: replace with insights module method, e.g.
        // const topInsights = await insightsService.generate({ projectId: id, transcript })
        const sentences = transcript
          .replace(/\s+/g, ' ')
          .split(/(?<=[.!?])\s+/)
          .map((s) => s.trim())
          .filter(Boolean)
        const topInsights = sentences.slice(0, Math.min(10, sentences.length))
        if (topInsights.length > 0) {
          await db
            .insert(insights)
            .values(
              topInsights.map((content, idx) => ({
                projectId: id,
                content,
                quote: content.length > 160 ? `${content.slice(0, 157)}...` : content,
                score: (Math.min(10, 6 + idx) / 10).toString() as any,
                isApproved: false,
              })),
            )
            .returning()
        }
        send('insights_ready', { count: topInsights.length, progress: 50 })
        await delay(stepDelay)

        // Step 3: Generate 5-10 LinkedIn posts from insights with tone presets
        // TODO [posts]: replace with posts module method aware of platform rules.
        const targetCount = Math.max(5, Math.min(10, 7))
        const tone = (project.tonePreset || 'professional') as TonePreset

        const tonePrefix = (t: TonePreset): string => {
          switch (t) {
            case 'friendly':
              return 'Let’s break this down: '
            case 'storytelling':
              return 'Story time: '
            case 'analytical':
              return 'Observation: '
            case 'bold':
              return 'Hot take: '
            case 'empathetic':
              return 'Here’s what I’m hearing: '
            default:
              return ''
          }
        }
        const hookVariants = ['Insight:', 'Takeaway:', 'Pro tip:', 'Consider:', 'Reminder:', 'Lesson:', 'Key point:']
        const toHashtag = (s: string) => '#' + s.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20)
        const baseTags = ['LinkedIn', 'Coaching', 'Insights']
        const tags = baseTags.map(toHashtag).join(' ')

        const makePost = (insight: string, idx: number) => {
          const hook = hookVariants[idx % hookVariants.length]
          const prefix = tonePrefix(tone)
          return `${prefix}${hook} ${insight}\n\n${tags}`.slice(0, 2900)
        }

        const postsBuffer: string[] = []
        for (let i = 0; i < topInsights.length && postsBuffer.length < targetCount; i++) {
          postsBuffer.push(makePost(topInsights[i], i))
        }
        // If not enough, create simple variants from transcript chunks
        if (postsBuffer.length < targetCount) {
          const chunks = transcript.split(/\n{2,}|\.(?:\s|$)/).map((s) => s.trim()).filter(Boolean)
          for (let i = 0; i < chunks.length && postsBuffer.length < targetCount; i++) {
            const c = chunks[i]
            if (!c) continue
            postsBuffer.push(makePost(c, i))
          }
        }

        if (postsBuffer.length > 0) {
          await db
            .insert(posts)
            .values(
              postsBuffer.map((content) => ({
                projectId: id,
                content,
                platform: 'LinkedIn',
                isApproved: false,
              })),
            )
            .returning()
        }
        send('posts_ready', { progress: 80 })
        await delay(stepDelay)

        // Advance to next stage (processing → posts)
        await db
          .update(contentProjects)
          .set({ currentStage: 'posts', updatedAt: new Date() })
          .where(and(eq(contentProjects.id, id), eq(contentProjects.userId, userId)))
          .returning()

        send('complete', { progress: 100 })
        finished = true
        clearTimeout(timeout)
        clearInterval(heartbeat)
        controller.close()
      } catch (err) {
        finished = true
        clearTimeout(timeout)
        clearInterval(heartbeat)
        // Communicate error safely to client, then close
        send('error', { message: 'Processing failed' })
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
