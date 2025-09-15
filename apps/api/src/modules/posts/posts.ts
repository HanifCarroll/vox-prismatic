import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { contentProjects, posts, users, insights as insightsTable } from '@/db/schema'
import { ForbiddenException, NotFoundException, UnprocessableEntityException, ValidationException } from '@/utils/errors'
import type { UpdatePostRequest } from '@content/shared-types'
import { z } from 'zod'
import { generateJson } from '@/modules/ai/ai'
import PQueue from 'p-queue'

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
    orderBy: [desc(posts.createdAt)],
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
  if (typeof data.content !== 'undefined') {
    const content = data.content.trim()
    if (content.length === 0) throw new ValidationException('Content must not be empty')
    if (content.length > 3000) throw new ValidationException('Content exceeds 3000 characters for LinkedIn')
    updates.content = content
  }
  if (typeof (data as any).status !== 'undefined') {
    const status = (data as any).status as 'pending' | 'approved' | 'rejected'
    updates.status = status
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

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) throw new NotFoundException('User not found')
  if (!user.linkedinToken) throw new ValidationException('LinkedIn is not connected')

  // Fetch member id if missing
  let memberId = user.linkedinId as string | undefined
  if (!memberId) {
    const meResp = await fetch('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${user.linkedinToken}` },
    })
    if (!meResp.ok) {
      throw new ValidationException('Failed to fetch LinkedIn profile')
    }
    const me = (await meResp.json()) as any
    memberId = me.id
    if (memberId) {
      await db.update(users).set({ linkedinId: memberId, updatedAt: new Date() }).where(eq(users.id, userId))
    }
  }

  const authorUrn = `urn:li:person:${memberId}`
  const payload = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: post.content },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  }

  const publishResp = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${user.linkedinToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(payload),
  })
  if (!publishResp.ok) {
    throw new ValidationException('LinkedIn publish failed')
  }

  const [updated] = await db
    .update(posts)
    .set({ publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(posts.id, post.id))
    .returning()
  return updated
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
    .set({ status, updatedAt: new Date() })
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

// Note: Formatting is handled by the LLM via structured output; no server-side reformatting here.

export async function generateDraftsFromInsights(args: { userId: number; projectId: number; limit?: number; transcript?: string }) {
  const { userId, projectId, limit = 7, transcript: paramTranscript } = args
  const project = await db.query.contentProjects.findFirst({ where: eq(contentProjects.id, projectId) })
  if (!project) throw new NotFoundException('Project not found')
  if (project.userId !== userId) throw new ForbiddenException('You do not have access to this project')

  const rows = await db.query.insights.findMany({ where: eq(insightsTable.projectId, projectId) })
  if (rows.length === 0) throw new UnprocessableEntityException('No insights available for this project')

  const requested = Math.max(5, Math.min(10, limit))
  // Prefer higher scored insights first; fallback to createdAt order
  const ordered = [...rows].sort((a: any, b: any) => {
    const as = typeof a.score === 'number' ? a.score : parseFloat(a.score as any) || 0
    const bs = typeof b.score === 'number' ? b.score : parseFloat(b.score as any) || 0
    return bs - as
  })

  const transcript = (paramTranscript ?? (project as any).transcriptCleaned ?? '').toString()

  const selected = ordered.slice(0, requested)
  const queue = new PQueue({ concurrency: 3 })
  const results: { content: string; insightId: number | null }[] = []

  // Helper validators/assemblers
  const hashtagPattern = /^#[A-Za-z][A-Za-z0-9_]{1,49}$/
  const emojiRx = /\p{Extended_Pictographic}/gu

  function countEmojis(s: string) {
    return (s.match(emojiRx) || []).length
  }

  function validateStructuredPost(paragraphs: string[], hashtags: string[]) {
    const violations: string[] = []
    // paragraphs 2-8 handled by schema; enforce per-paragraph length and sentence count
    paragraphs.forEach((p, idx) => {
      if (p.length > 220) violations.push(`Paragraph ${idx + 1} exceeds 220 characters`)
      // naive sentence count by punctuation
      const sentences = (p.match(/[.!?](?:\s|$)/g) || []).length || 1
      if (sentences > 2) violations.push(`Paragraph ${idx + 1} has more than 2 sentences`)
      if (/#\w/.test(p)) violations.push(`Paragraph ${idx + 1} contains hashtags; move to end`)
    })
    // emojis
    const totalEmoji = paragraphs.reduce((acc, p) => acc + countEmojis(p), 0)
    if (totalEmoji > 2) violations.push('More than 2 emojis in post')
    if (countEmojis(paragraphs[0] || '') > 0) violations.push('First paragraph contains emojis')
    // hashtags
    if (hashtags.length < 3 || hashtags.length > 5) violations.push('Hashtags count must be 3–5')
    const invalidTags = hashtags.filter((h) => !hashtagPattern.test(h))
    if (invalidTags.length) violations.push(`Invalid hashtags: ${invalidTags.join(', ')}`)
    const dupes = hashtags.filter((h, i, arr) => arr.indexOf(h) !== i)
    if (dupes.length) violations.push(`Duplicate hashtags: ${Array.from(new Set(dupes)).join(', ')}`)
    // assembled length check
    const assembled = assemble(paragraphs, hashtags)
    if (assembled.length > 3000) violations.push('Post exceeds 3000 characters')
    return { ok: violations.length === 0, violations, assembled }
  }

  function assemble(paragraphs: string[], hashtags: string[]) {
    const uniqTags = Array.from(new Set(hashtags))
    const body = paragraphs.map((p) => p.trim()).join('\n\n').trim()
    const tagLine = uniqTags.length ? `\n\n${uniqTags.join(' ')}` : ''
    const out = `${body}${tagLine}`
    return out.length > 3000 ? out.slice(0, 3000) : out
  }

  await Promise.all(
    selected.map((ins) =>
      queue.add(async () => {
        const basePrompt = [
          'You are a LinkedIn post formatter and writer.',
          'Ground the post ONLY in the provided transcript and the specific insight. Do not invent details.',
          'Write for mobile readability with these constraints:',
          '- 2–8 short paragraphs, 1–2 sentences each (<= 220 chars per paragraph).',
          '- Strong opening hook in the first paragraph.',
          '- Plain language; no lists, bullets, or markdown.',
          '- 0–2 emojis total; do NOT use emojis in the first paragraph.',
          '- No hashtags inside paragraphs.',
          '- Add 3–5 relevant hashtags at the very end as an array (each with leading #).',
          'Return JSON only in this shape: { "post": { "paragraphs": string[], "hashtags": string[] } }.',
          '',
          'Transcript:',
          transcript,
          '',
          'Insight:',
          ins.content,
        ].join('\n')

        // First attempt
        let json = await generateJson({ schema: AiLinkedInPostSchema, prompt: basePrompt, temperature: 0.3 })
        let { ok, violations, assembled } = validateStructuredPost(json.post.paragraphs, json.post.hashtags)

        // One reformat-only retry if invalid
        if (!ok) {
          const reformatPrompt = [
            'Reformat the following LinkedIn post to satisfy ALL constraints. Do not add new information.',
            'You may split/merge sentences, remove emojis, move hashtags to the end, and make minimal grammar edits.',
            'Keep the same meaning. Return JSON only in the same schema.',
            '',
            'Violations:',
            ...violations.map((v) => `- ${v}`),
            '',
            'Current draft (JSON):',
            JSON.stringify(json),
          ].join('\n')

          json = await generateJson({ schema: AiLinkedInPostSchema, prompt: reformatPrompt, temperature: 0.2 })
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

  // Fetch posts and validate ownership via project
  const rows = await db
    .select({ id: posts.id, projectId: posts.projectId, insightId: posts.insightId })
    .from(posts)
    .leftJoin(contentProjects, eq(posts.projectId, contentProjects.id))
    .where(inArray(posts.id, ids))

  const owned = rows.filter((r: any) => (r as any).content_projects?.userId === userId || (r as any).contentProjects?.userId === userId)
  const ownedIds = owned.map((r: any) => (r as any).posts?.id ?? r.id).filter((v: any): v is number => typeof v === 'number')
  if (ownedIds.length === 0) return 0

  // Retrieve project/transcript and insight when available; generate per post
  let updatedCount = 0
  const queue = new PQueue({ concurrency: 3 })

  await Promise.all(
    owned.map((row: any) =>
      queue.add(async () => {
        const postId = (row.posts?.id ?? row.id) as number
        const projectId = (row.posts?.projectId ?? row.projectId) as number

        const project = await db.query.contentProjects.findFirst({ where: eq(contentProjects.id, projectId) })
        if (!project || project.userId !== userId) return
        const transcript = ((project as any).transcriptCleaned || (project as any).transcriptOriginal || '').toString()

        let insightText = ''
        const insId = (row.posts?.insightId ?? row.insightId) as number | null
        if (insId) {
          const ins = await db.query.insights.findFirst({ where: eq(insightsTable.id, insId) })
          if (ins) insightText = ins.content
        }
        if (!insightText) {
          // fallback: pick top-scored insight for project
          const insRows = await db.query.insights.findMany({ where: eq(insightsTable.projectId, projectId) })
          const ordered = [...insRows].sort((a: any, b: any) => {
            const as = typeof a.score === 'number' ? a.score : parseFloat(a.score as any) || 0
            const bs = typeof b.score === 'number' ? b.score : parseFloat(b.score as any) || 0
            return bs - as
          })
          insightText = ordered[0]?.content || ''
        }

        const basePrompt = [
          'You are a LinkedIn post formatter and writer.',
          'Ground the post ONLY in the provided transcript and the specific insight. Do not invent details.',
          'Write for mobile readability with these constraints:',
          '- 2–8 short paragraphs, 1–2 sentences each (<= 220 chars per paragraph).',
          '- Strong opening hook in the first paragraph.',
          '- Plain language; no lists, bullets, or markdown.',
          '- 0–2 emojis total; do NOT use emojis in the first paragraph.',
          '- No hashtags inside paragraphs.',
          '- Add 3–5 relevant hashtags at the very end as an array (each with leading #).',
          'Return JSON only in this shape: { "post": { "paragraphs": string[], "hashtags": string[] } }.',
          '',
          'Transcript:',
          transcript,
          '',
          'Insight:',
          insightText,
        ].join('\n')

        // Local helpers for validation (duplicated to keep function self-contained)
        const hashtagPattern = /^#[A-Za-z][A-Za-z0-9_]{1,49}$/
        const emojiRx = /\p{Extended_Pictographic}/gu
        const countEmojis = (s: string) => (s.match(emojiRx) || []).length
        const assemble = (paragraphs: string[], hashtags: string[]) => {
          const uniqTags = Array.from(new Set(hashtags))
          const body = paragraphs.map((p) => p.trim()).join('\n\n').trim()
          const tagLine = uniqTags.length ? `\n\n${uniqTags.join(' ')}` : ''
          const out = `${body}${tagLine}`
          return out.length > 3000 ? out.slice(0, 3000) : out
        }
        const validate = (paragraphs: string[], hashtags: string[]) => {
          const violations: string[] = []
          paragraphs.forEach((p, idx) => {
            if (p.length > 220) violations.push(`Paragraph ${idx + 1} exceeds 220 characters`)
            const sentences = (p.match(/[.!?](?:\s|$)/g) || []).length || 1
            if (sentences > 2) violations.push(`Paragraph ${idx + 1} has more than 2 sentences`)
            if (/#\w/.test(p)) violations.push(`Paragraph ${idx + 1} contains hashtags; move to end`)
          })
          const totalEmoji = paragraphs.reduce((acc, p) => acc + countEmojis(p), 0)
          if (totalEmoji > 2) violations.push('More than 2 emojis in post')
          if (countEmojis(paragraphs[0] || '') > 0) violations.push('First paragraph contains emojis')
          if (hashtags.length < 3 || hashtags.length > 5) violations.push('Hashtags count must be 3–5')
          const invalidTags = hashtags.filter((h) => !hashtagPattern.test(h))
          if (invalidTags.length) violations.push(`Invalid hashtags: ${invalidTags.join(', ')}`)
          const dupes = hashtags.filter((h, i, arr) => arr.indexOf(h) !== i)
          if (dupes.length) violations.push(`Duplicate hashtags: ${Array.from(new Set(dupes)).join(', ')}`)
          const assembled = assemble(paragraphs, hashtags)
          if (assembled.length > 3000) violations.push('Post exceeds 3000 characters')
          return { ok: violations.length === 0, violations, assembled }
        }

        let json = await generateJson({ schema: AiLinkedInPostSchema, prompt: basePrompt, temperature: 0.3 })
        let { ok, violations, assembled } = validate(json.post.paragraphs, json.post.hashtags)
        if (!ok) {
          const reformatPrompt = [
            'Reformat the following LinkedIn post to satisfy ALL constraints. Do not add new information.',
            'You may split/merge sentences, remove emojis, move hashtags to the end, and make minimal grammar edits.',
            'Keep the same meaning. Return JSON only in the same schema.',
            '',
            'Violations:',
            ...violations.map((v) => `- ${v}`),
            '',
            'Current draft (JSON):',
            JSON.stringify(json),
          ].join('\n')
          json = await generateJson({ schema: AiLinkedInPostSchema, prompt: reformatPrompt, temperature: 0.2 })
          const validated = validate(json.post.paragraphs, json.post.hashtags)
          assembled = validated.assembled
        }

        const [u] = await db
          .update(posts)
          .set({ content: assembled, status: 'pending', updatedAt: new Date() })
          .where(eq(posts.id, postId))
          .returning({ id: posts.id })
        if (u?.id) updatedCount += 1
      }),
    ),
  )

  return updatedCount
}
