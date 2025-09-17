import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { contentProjects, posts, users, insights as insightsTable } from '@/db/schema'
import { ForbiddenException, NotFoundException, UnprocessableEntityException, ValidationException } from '@/utils/errors'
import type { UpdatePostRequest } from '@content/shared-types'
import { z } from 'zod'
import { generateJson } from '@/modules/ai/ai'
import { buildAttributionPrompt, buildBasePrompt, buildReformatPrompt } from './prompts'
import {
  EMOJI_REGEX,
  HASHTAG_PATTERN,
  MAX_EMOJIS_TOTAL,
  MAX_PARAGRAPH_CHARS,
  MAX_POST_CHARS,
  MAX_SENTENCES_PER_PARAGRAPH,
  MIN_HASHTAGS,
  MAX_HASHTAGS,
  // Generation params
  GENERATE_CONCURRENCY,
  MIN_DRAFTS,
  MAX_DRAFTS,
  DEFAULT_DRAFT_LIMIT,
  GENERATE_TEMPERATURE,
  REFORMAT_TEMPERATURE,
} from './constants'
import PQueue from 'p-queue'
import { logger } from '@/middleware/logging'

export async function listProjectPosts(args: { userId: number; projectId: number; page: number; pageSize: number }) {
  const { userId, projectId, page, pageSize } = args
  const project = await db.query.contentProjects.findFirst({ where: eq(contentProjects.id, projectId) })
  if (!project) throw new NotFoundException('Project not found')
  if (project.userId !== userId) throw new ForbiddenException('You do not have access to this project')

  const offset = (page - 1) * pageSize
  const items = await db.query.posts.findMany({
    where: eq(posts.projectId, projectId),
    limit: pageSize,
    offset,
    // Stable order: newest first by createdAt, then by id as tiebreaker
    orderBy: [desc(posts.createdAt), desc(posts.id)],
  })
  // Count
  const rawCount = (await db.execute(
    `SELECT COUNT(*) as count FROM posts WHERE project_id = ${projectId}`,
  )) as any
  const total = Array.isArray(rawCount)
    ? Number(rawCount[0]?.count || 0)
    : Array.isArray(rawCount?.rows)
      ? Number(rawCount.rows[0]?.count || 0)
      : 0

  return { items, total }
}

function normalizeRows<T = any>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object' && Array.isArray((value as any).rows)) return (value as any).rows as T[]
  return []
}

const SCHEDULE_FIELDS_RESET: Partial<typeof posts.$inferInsert> = {
  scheduledAt: null,
  scheduleStatus: null,
  scheduleError: null,
  scheduleAttemptedAt: null,
}

type MinimalUser = Pick<typeof users.$inferSelect, 'id' | 'linkedinToken' | 'linkedinId'>

async function getUserOrThrow(userId: number) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) throw new NotFoundException('User not found')
  return user
}

async function ensureLinkedInAuth(user: MinimalUser) {
  if (!user.linkedinToken) throw new ValidationException('LinkedIn is not connected')
  let memberId = user.linkedinId as string | null
  if (!memberId) {
    const infoResp = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${user.linkedinToken}` },
    })
    if (!infoResp.ok) {
      throw new ValidationException('Failed to fetch LinkedIn user info')
    }
    const info = (await infoResp.json()) as any
    memberId = typeof info?.sub === 'string' ? info.sub : null
    if (memberId) {
      await db
        .update(users)
        .set({ linkedinId: memberId, updatedAt: new Date() })
        .where(eq(users.id, user.id))
        .returning({ id: users.id })
    }
  }
  if (!memberId) throw new ValidationException('Unable to resolve LinkedIn member id')
  return { token: user.linkedinToken, memberId }
}

async function publishToLinkedIn(content: string, token: string, memberId: string) {
  const authorUrn = `urn:li:person:${memberId}`
  const payload = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: content },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  }

  const publishResp = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(payload),
  })
  if (!publishResp.ok) {
    throw new ValidationException('LinkedIn publish failed')
  }
}

export async function getPostByIdForUser(args: { userId: number; postId: number }) {
  const { userId, postId } = args
  const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) })
  if (!post) throw new NotFoundException('Post not found')
  const project = await db.query.contentProjects.findFirst({ where: eq(contentProjects.id, post.projectId) })
  if (!project) throw new NotFoundException('Project not found')
  if (project.userId !== userId) throw new ForbiddenException('You do not have access to this post')
  return post
}

export async function updatePostForUser(args: { userId: number; postId: number; data: UpdatePostRequest }) {
  const { userId, postId, data } = args
  const post = await getPostByIdForUser({ userId, postId })

  const updates: Partial<typeof posts.$inferInsert> = { updatedAt: new Date() }
  let shouldResetSchedule = false
  if (typeof data.content !== 'undefined') {
    const content = data.content.trim()
    if (content.length === 0) throw new ValidationException('Content must not be empty')
    if (content.length > 3000) throw new ValidationException('Content exceeds 3000 characters for LinkedIn')
    updates.content = content
    shouldResetSchedule = true
  }
  if (typeof (data as any).status !== 'undefined') {
    const status = (data as any).status as 'pending' | 'approved' | 'rejected'
    updates.status = status
    shouldResetSchedule = true
  }

  if (shouldResetSchedule) {
    Object.assign(updates, SCHEDULE_FIELDS_RESET)
  }

  const [updated] = await db.update(posts).set(updates).where(eq(posts.id, post.id)).returning()
  return updated
}

export async function publishPostNow(args: { userId: number; postId: number }) {
  const { userId, postId } = args
  const post = await getPostByIdForUser({ userId, postId })
  if ((post as any).status !== 'approved') {
    throw new UnprocessableEntityException('Post must be approved before publishing')
  }

  const user = await getUserOrThrow(userId)
  const { token, memberId } = await ensureLinkedInAuth({
    id: user.id,
    linkedinToken: user.linkedinToken,
    linkedinId: user.linkedinId,
  })

  await publishToLinkedIn(post.content, token, memberId)

  const now = new Date()
  const [updated] = await db
    .update(posts)
    .set({
      publishedAt: now,
      updatedAt: now,
      ...SCHEDULE_FIELDS_RESET,
    })
    .where(eq(posts.id, post.id))
    .returning()
  return updated
}

export async function schedulePostForUser(args: { userId: number; postId: number; scheduledAt: Date }) {
  const { userId, postId } = args
  const scheduledAt = new Date(args.scheduledAt)
  const timestamp = scheduledAt.getTime()
  if (!Number.isFinite(timestamp)) {
    throw new ValidationException('Invalid scheduledAt value')
  }
  if (timestamp <= Date.now()) {
    throw new ValidationException('Scheduled time must be in the future')
  }

  const post = await getPostByIdForUser({ userId, postId })
  if ((post as any).status !== 'approved') {
    throw new UnprocessableEntityException('Post must be approved before scheduling')
  }

  const user = await getUserOrThrow(userId)
  if (!user.linkedinToken) {
    throw new ValidationException('LinkedIn is not connected')
  }

  const [updated] = await db
    .update(posts)
    .set({
      scheduledAt,
      scheduleStatus: 'scheduled',
      scheduleError: null,
      scheduleAttemptedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, post.id))
    .returning()
  return updated
}

export async function unschedulePostForUser(args: { userId: number; postId: number }) {
  const { userId, postId } = args
  await getPostByIdForUser({ userId, postId })
  const [updated] = await db
    .update(posts)
    .set({
      ...SCHEDULE_FIELDS_RESET,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, postId))
    .returning()
  return updated
}

export async function listScheduledPosts(args: {
  userId: number
  page: number
  pageSize: number
  status?: 'scheduled' | 'publishing' | 'failed'
}) {
  const { userId, page, pageSize, status } = args
  const offset = (page - 1) * pageSize
  const statusClause = status ? ` AND p.schedule_status = '${status}'` : ''

  const itemsResult = await db.execute(`
    SELECT p.*
    FROM posts p
    INNER JOIN content_projects cp ON p.project_id = cp.id
    WHERE cp.user_id = ${userId}
      AND p.schedule_status IS NOT NULL
      AND p.scheduled_at IS NOT NULL
      ${statusClause}
    ORDER BY p.scheduled_at ASC NULLS LAST, p.id DESC
    LIMIT ${pageSize}
    OFFSET ${offset}
  `)
  const rawItems = normalizeRows<any>(itemsResult)
  const items = rawItems.map((row) => ({
    id: Number(row.id),
    projectId: Number(row.project_id),
    insightId: row.insight_id === null || typeof row.insight_id === 'undefined' ? null : Number(row.insight_id),
    content: row.content,
    platform: row.platform,
    status: row.status,
    publishedAt: row.published_at ? new Date(row.published_at) : null,
    scheduledAt: row.scheduled_at ? new Date(row.scheduled_at) : null,
    scheduleStatus: row.schedule_status ?? null,
    scheduleError: row.schedule_error ?? null,
    scheduleAttemptedAt: row.schedule_attempted_at ? new Date(row.schedule_attempted_at) : null,
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
  }))

  const countResult = await db.execute(`
    SELECT COUNT(*) as count
    FROM posts p
    INNER JOIN content_projects cp ON p.project_id = cp.id
    WHERE cp.user_id = ${userId}
      AND p.schedule_status IS NOT NULL
      AND p.scheduled_at IS NOT NULL
      ${statusClause}
  `)
  const countRows = normalizeRows<{ count: string }>(countResult)
  const total = countRows.length ? Number(countRows[0].count) || 0 : 0

  return { items, total }
}

export async function publishDueScheduledPosts(args: { limit?: number } = {}) {
  const limit = Math.max(1, args.limit ?? 10)
  const dueResult = await db.execute(`
    SELECT p.*, cp.user_id as owner_id, u.linkedin_token, u.linkedin_id
    FROM posts p
    INNER JOIN content_projects cp ON p.project_id = cp.id
    INNER JOIN users u ON cp.user_id = u.id
    WHERE p.schedule_status = 'scheduled'
      AND p.scheduled_at IS NOT NULL
      AND p.scheduled_at <= NOW()
      AND p.status = 'approved'
    ORDER BY p.scheduled_at ASC
    LIMIT ${limit}
  `)

  const rows = normalizeRows<any>(dueResult)
  const summary = { attempted: 0, published: 0, failed: 0 }

  for (const row of rows) {
    const postId = Number(row.id)
    if (!postId) continue
    summary.attempted += 1

    const attemptAt = new Date()
    const [locked] = await db
      .update(posts)
      .set({ scheduleStatus: 'publishing', scheduleAttemptedAt: attemptAt, updatedAt: attemptAt })
      .where(and(eq(posts.id, postId), eq(posts.scheduleStatus, 'scheduled')))
      .returning()

    if (!locked) {
      continue
    }

    const minimalUser: MinimalUser = {
      id: Number(row.owner_id),
      linkedinToken: row.linkedin_token ?? null,
      linkedinId: row.linkedin_id ?? null,
    }

    if (!Number.isFinite(minimalUser.id)) {
      summary.failed += 1
      logger.error({ msg: 'Scheduled post missing owner id', postId })
      continue
    }

    try {
      const { token, memberId } = await ensureLinkedInAuth(minimalUser)
      await publishToLinkedIn(locked.content, token, memberId)
      const finishedAt = new Date()
      await db
        .update(posts)
        .set({
          publishedAt: finishedAt,
          scheduledAt: null,
          scheduleStatus: null,
          scheduleError: null,
          scheduleAttemptedAt: finishedAt,
          updatedAt: finishedAt,
        })
        .where(eq(posts.id, locked.id))
        .returning({ id: posts.id })
      summary.published += 1
      logger.info({ msg: 'Scheduled post published', postId: locked.id })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      const failedAt = new Date()
      await db
        .update(posts)
        .set({
          scheduledAt: null,
          scheduleStatus: 'failed',
          scheduleError: message,
          scheduleAttemptedAt: failedAt,
          updatedAt: failedAt,
        })
        .where(eq(posts.id, locked.id))
        .returning({ id: posts.id })
      summary.failed += 1
      logger.error({ msg: 'Scheduled post failed', postId: locked.id, error: message })
    }
  }

  return summary
}

export async function updatePostsBulkStatus(args: { userId: number; ids: number[]; status: 'pending' | 'approved' | 'rejected' }) {
  const { userId, ids, status } = args
  if (!Array.isArray(ids) || ids.length === 0) return 0

  // Determine which post IDs are owned by this user via project ownership
  const rows = await db
    .select({ id: posts.id })
    .from(posts)
    .leftJoin(contentProjects, eq(posts.projectId, contentProjects.id))
    .where(and(inArray(posts.id, ids), eq(contentProjects.userId, userId)))

  const allowedIds = rows.map((r) => r.id).filter((v): v is number => typeof v === 'number')
  if (allowedIds.length === 0) return 0

  const updated = await db
    .update(posts)
    .set({ status, updatedAt: new Date(), ...SCHEDULE_FIELDS_RESET })
    .where(inArray(posts.id, allowedIds))
    .returning({ id: posts.id })

  return updated.length
}

// Structured AI output: paragraphs + hashtags
const AiLinkedInPostSchema = z.object({
  post: z.object({
    paragraphs: z.array(z.string().min(1)).min(2).max(8),
    hashtags: z.array(z.string().min(2).max(52)).min(3).max(5), // with leading '#'
  }),
})

// Helpers for attribution using Me/Them labels
function extractSpeakerTexts(input: string) {
  const me: string[] = []
  const them: string[] = []
  const lines = (input || '').split(/\r?\n/)
  for (const raw of lines) {
    const line = raw.trim()
    const m = line.match(/^Me\s*:\s*(.*)$/i)
    if (m) {
      if (m[1]) me.push(m[1].trim())
      continue
    }
    const t = line.match(/^Them\s*:\s*(.*)$/i)
    if (t) {
      if (t[1]) them.push(t[1].trim())
      continue
    }
  }
  return { meText: me.join('\n'), themText: them.join('\n'), hasLabels: me.length + them.length > 0 }
}

function usesFirstPerson(text: string) {
  // Focus on singular first-person to avoid false positives
  return /(\bI\b|\bI'm\b|\bI’ve\b|\bI've\b|\bI'd\b|\bme\b|\bmy\b|\bmine\b)/i.test(text)
}

// Note: Formatting is handled by the LLM via structured output; no server-side reformatting here.
// Shared validation utilities

function countEmojis(s: string) {
  return (s.match(EMOJI_REGEX) || []).length
}

export function assemble(paragraphs: string[], hashtags: string[]) {
  const uniqTags = Array.from(new Set(hashtags))
  const body = paragraphs.map((p) => p.trim()).join('\n\n').trim()
  const tagLine = uniqTags.length ? `\n\n${uniqTags.join(' ')}` : ''
  const out = `${body}${tagLine}`
  return out.length > 3000 ? out.slice(0, 3000) : out
}

export function validateStructuredPost(paragraphs: string[], hashtags: string[]) {
  const violations: string[] = []
  paragraphs.forEach((p, idx) => {
    if (p.length > MAX_PARAGRAPH_CHARS) violations.push(`Paragraph ${idx + 1} exceeds ${MAX_PARAGRAPH_CHARS} characters`)
    const sentences = (p.match(/[.!?](?:\s|$)/g) || []).length || 1
    if (sentences > MAX_SENTENCES_PER_PARAGRAPH) violations.push(`Paragraph ${idx + 1} has more than ${MAX_SENTENCES_PER_PARAGRAPH} sentences`)
    if (/#\w/.test(p)) violations.push(`Paragraph ${idx + 1} contains hashtags; move to end`)
  })
  const totalEmoji = paragraphs.reduce((acc, p) => acc + countEmojis(p), 0)
  if (totalEmoji > MAX_EMOJIS_TOTAL) violations.push(`More than ${MAX_EMOJIS_TOTAL} emojis in post`)
  if (countEmojis(paragraphs[0] || '') > 0) violations.push('First paragraph contains emojis')
  if (hashtags.length < MIN_HASHTAGS || hashtags.length > MAX_HASHTAGS) violations.push(`Hashtags count must be ${MIN_HASHTAGS}–${MAX_HASHTAGS}`)
  const invalidTags = hashtags.filter((h) => !HASHTAG_PATTERN.test(h))
  if (invalidTags.length) violations.push(`Invalid hashtags: ${invalidTags.join(', ')}`)
  const dupes = hashtags.filter((h, i, arr) => arr.indexOf(h) !== i)
  if (dupes.length) violations.push(`Duplicate hashtags: ${Array.from(new Set(dupes)).join(', ')}`)
  const assembled = assemble(paragraphs, hashtags)
  if (assembled.length > MAX_POST_CHARS) violations.push(`Post exceeds ${MAX_POST_CHARS} characters`)
  return { ok: violations.length === 0, violations, assembled }
}

async function applyAttributionGuardIfNeeded(json: any, transcript: string) {
  const { meText } = extractSpeakerTexts(transcript)
  const draftAll = Array.isArray(json?.post?.paragraphs) ? json.post.paragraphs.join(' ') : ''
  if (usesFirstPerson(draftAll)) {
    const prompt = buildAttributionPrompt(meText, json)
    return await generateJson({ schema: AiLinkedInPostSchema, prompt, temperature: REFORMAT_TEMPERATURE })
  }
  return json
}

export async function generateDraftsFromInsights(args: { userId: number; projectId: number; limit?: number; transcript?: string }) {
  const { userId, projectId, limit = DEFAULT_DRAFT_LIMIT, transcript: paramTranscript } = args
  const project = await db.query.contentProjects.findFirst({ where: eq(contentProjects.id, projectId) })
  if (!project) throw new NotFoundException('Project not found')
  if (project.userId !== userId) throw new ForbiddenException('You do not have access to this project')

  const rows = await db.query.insights.findMany({ where: eq(insightsTable.projectId, projectId) })
  if (rows.length === 0) throw new UnprocessableEntityException('No insights available for this project')

  const requested = Math.max(MIN_DRAFTS, Math.min(MAX_DRAFTS, limit))
  // Prefer higher scored insights first; fallback to createdAt order
  const ordered = [...rows].sort((a: any, b: any) => {
    const as = typeof a.score === 'number' ? a.score : parseFloat(a.score as any) || 0
    const bs = typeof b.score === 'number' ? b.score : parseFloat(b.score as any) || 0
    return bs - as
  })

  const transcript = (paramTranscript ?? (project as any).transcriptCleaned ?? '').toString()

  const selected = ordered.slice(0, requested)
  const queue = new PQueue({ concurrency: GENERATE_CONCURRENCY })
  const results: { content: string; insightId: number | null }[] = []

  await Promise.all(
    selected.map((ins) =>
      queue.add(async () => {
        const basePrompt = buildBasePrompt({ transcript, insight: ins.content })

        // First attempt
        let json = await generateJson({ schema: AiLinkedInPostSchema, prompt: basePrompt, temperature: GENERATE_TEMPERATURE })
        json = await applyAttributionGuardIfNeeded(json, transcript)
        let { ok, violations, assembled } = validateStructuredPost(json.post.paragraphs, json.post.hashtags)

        // One reformat-only retry if invalid
        if (!ok) {
          const reformatPrompt = buildReformatPrompt(violations, json)
          json = await generateJson({ schema: AiLinkedInPostSchema, prompt: reformatPrompt, temperature: REFORMAT_TEMPERATURE })
          const validated = validateStructuredPost(json.post.paragraphs, json.post.hashtags)
          ok = validated.ok
          violations = validated.violations
          assembled = validated.assembled
        }

        // Accept the assembled content even if minor violations remain after retry
        results.push({ content: assembled, insightId: (ins as any).id ?? null })
      }),
    ),
  )

  if (results.length === 0) return { count: 0 }

  const values = results.map((r) => ({
    projectId,
    content: r.content,
    platform: 'LinkedIn' as const,
    status: 'pending' as const,
    insightId: r.insightId ?? null,
  }))
  const inserted = await db.insert(posts).values(values).returning({ id: posts.id })
  return { count: inserted.length }
}

export async function regeneratePostsBulk(args: { userId: number; ids: number[] }) {
  const { userId, ids } = args
  if (!Array.isArray(ids) || ids.length === 0) return 0

  // Fetch posts owned by the user via project ownership
  const rows = await db
    .select({ id: posts.id, projectId: posts.projectId, insightId: posts.insightId })
    .from(posts)
    .leftJoin(contentProjects, eq(posts.projectId, contentProjects.id))
    .where(and(inArray(posts.id, ids), eq(contentProjects.userId, userId)))

  if (rows.length === 0) return 0

  // Retrieve project/transcript and insight when available; generate per post
  let updatedCount = 0
  const updatedItems: any[] = []
  const queue = new PQueue({ concurrency: GENERATE_CONCURRENCY })

  await Promise.all(
    rows.map((row: any) =>
      queue.add(async () => {
        const postId = row.id as number
        const projectId = row.projectId as number

        const project = await db.query.contentProjects.findFirst({ where: eq(contentProjects.id, projectId) })
        if (!project || project.userId !== userId) return
        const transcript = ((project as any).transcriptCleaned || (project as any).transcriptOriginal || '').toString()

        const insId = row.insightId as number | null
        if (!insId) {
          throw new UnprocessableEntityException('Post missing insightId')
        }
        const ins = await db.query.insights.findFirst({ where: eq(insightsTable.id, insId) })
        if (!ins) throw new NotFoundException('Insight not found for post')
        const insightText = ins.content

        const basePrompt = buildBasePrompt({ transcript, insight: insightText })

        let json = await generateJson({ schema: AiLinkedInPostSchema, prompt: basePrompt, temperature: GENERATE_TEMPERATURE })
        json = await applyAttributionGuardIfNeeded(json, transcript)
        let { ok, violations, assembled } = validateStructuredPost(json.post.paragraphs, json.post.hashtags)
        if (!ok) {
          const reformatPrompt = buildReformatPrompt(violations, json)
          json = await generateJson({ schema: AiLinkedInPostSchema, prompt: reformatPrompt, temperature: REFORMAT_TEMPERATURE })
          const validated = validateStructuredPost(json.post.paragraphs, json.post.hashtags)
          assembled = validated.assembled
        }

        const [u] = await db
          .update(posts)
          .set({ content: assembled, status: 'pending', updatedAt: new Date(), ...SCHEDULE_FIELDS_RESET })
          .where(eq(posts.id, postId))
          .returning()
        if (u?.id) {
          updatedCount += 1
          updatedItems.push(u)
        }
      }),
    ),
  )

  return { updated: updatedCount, items: updatedItems }
}
