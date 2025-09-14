import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { contentProjects, posts, users } from '@/db/schema'
import { ForbiddenException, NotFoundException, UnprocessableEntityException, ValidationException } from '@/utils/errors'
import type { UpdatePostRequest } from '@content/shared-types'

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
  if (typeof data.isApproved !== 'undefined') {
    updates.isApproved = data.isApproved
  }

  const [updated] = await db.update(posts).set(updates).where(eq(posts.id, post.id)).returning()
  return updated
}

export async function publishPostNow(args: { userId: number; postId: number }) {
  const { userId, postId } = args
  const post = await getPostByIdForUser({ userId, postId })
  if (!post.isApproved) {
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
