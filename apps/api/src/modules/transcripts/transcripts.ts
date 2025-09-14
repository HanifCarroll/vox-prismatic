import sanitizeHtml from 'sanitize-html'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { contentProjects } from '@/db/schema'
import { ForbiddenException, NotFoundException, ValidationException } from '@/utils/errors'
import type { TranscriptNormalizeRequest, TranscriptUpdateRequest } from '@content/shared-types'

function toPlainText(input: string): string {
  const sanitized = sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} })
  return sanitized.replace(/\s+/g, ' ').trim()
}

async function fetchUrlText(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new ValidationException(`Failed to fetch source URL: ${res.status}`)
  }
  const html = await res.text()
  return toPlainText(html)
}

export async function normalizeTranscript(input: TranscriptNormalizeRequest): Promise<{ transcript: string; length: number }> {
  const preferred = input.transcript && input.transcript.trim().length > 0
  const text = preferred
    ? toPlainText(input.transcript as string)
    : await fetchUrlText(input.sourceUrl as string)

  return { transcript: text, length: text.length }
}

export async function getProjectTranscriptForUser(projectId: number, userId: number): Promise<string | null> {
  const project = await db.query.contentProjects.findFirst({ where: eq(contentProjects.id, projectId) })
  if (!project) throw new NotFoundException('Project not found')
  if (project.userId !== userId) throw new ForbiddenException('You do not have access to this project')
  return project.transcript ?? null
}

export async function updateProjectTranscript(args: {
  id: number
  userId: number
  data: TranscriptUpdateRequest
}) {
  const { id, userId, data } = args
  const project = await db.query.contentProjects.findFirst({ where: eq(contentProjects.id, id) })
  if (!project) throw new NotFoundException('Project not found')
  if (project.userId !== userId) throw new ForbiddenException('You do not have access to this project')

  const { transcript } = await normalizeTranscript(data)

  const [updated] = await db
    .update(contentProjects)
    .set({ transcript, updatedAt: new Date() })
    .where(and(eq(contentProjects.id, id), eq(contentProjects.userId, userId)))
    .returning()

  return updated
}
