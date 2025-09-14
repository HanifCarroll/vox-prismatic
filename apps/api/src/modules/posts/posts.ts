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

const SinglePostResponseSchema = z.object({
  post: z.object({
    content: z.string().min(1).max(3000),
  }),
})

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
  const results: { content: string }[] = []

  await Promise.all(
    selected.map((ins) =>
      queue.add(async () => {
        const prompt = [
          'Draft a single LinkedIn post grounded ONLY in the provided transcript and the specific insight below.',
          'Avoid inventing details not present in the transcript. If the insight lacks context, keep the post high-level.',
          'Constraints: <= 3000 characters, opening hook, clear takeaway, plain language, 2–4 relevant hashtags at the end.',
          'No lists or bullets; output a single text block. No markdown.',
          'Return exactly: { "post": { "content": string } }',
          '\nTranscript:\n',
          transcript,
          '\nInsight:\n',
          ins.content,
        ].join('\n')

        const json = await generateJson({ schema: SinglePostResponseSchema, prompt })
        results.push({ content: json.post.content.trim().slice(0, 3000) })
      }),
    ),
  )

  if (results.length === 0) return { count: 0 }

  const values = results.map((r) => ({
    projectId,
    content: r.content,
    platform: 'LinkedIn' as const,
    status: 'pending' as const,
  }))
  const inserted = await db.insert(posts).values(values).returning({ id: posts.id })
  return { count: inserted.length }
}
