import type { TranscriptNormalizeRequest, TranscriptUpdateRequest } from '@content/shared-types'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { contentProjects } from '@/db/schema'
import { FLASH_MODEL, generateJson } from '@/modules/ai/ai'
import { ForbiddenException, NotFoundException, ValidationException } from '@/utils/errors'

const CleanedTranscriptSchema = z.object({
  transcript: z.string().min(1),
  length: z.number().int().nonnegative(),
})

export async function normalizeTranscript(
  input: TranscriptNormalizeRequest,
  context?: { userId?: number; projectId?: number | null },
): Promise<{ transcript: string; length: number }> {
  const text = input.transcript.trim()
  if (!text) throw new ValidationException('Transcript is required')

  const prompt = `You are a text cleaner for meeting transcripts.\n\nClean the transcript by:\n- Removing timestamps and system messages\n- Removing filler words (um, uh) and repeated stutters unless meaningful\n- Converting to plain text (no HTML)\n- Normalizing spaces and line breaks for readability\n- IMPORTANT: If speaker labels like "Me:" and "Them:" are present, PRESERVE them verbatim at the start of each line. Do not invent or rename speakers.\n\nReturn JSON { "transcript": string, "length": number } where length is the character count of transcript.\n\nTranscript:\n"""\n${text}\n"""`

  const out = await generateJson({
    schema: CleanedTranscriptSchema,
    prompt,
    temperature: 0.1,
    model: FLASH_MODEL,
    action: 'transcript.normalize',
    userId: context?.userId,
    projectId: context?.projectId ?? null,
    metadata: { preview: !context?.projectId },
  })
  return out
}

export async function getProjectTranscriptForUser(
  projectId: number,
  userId: number,
): Promise<string | null> {
  const project = await db.query.contentProjects.findFirst({
    where: eq(contentProjects.id, projectId),
  })
  if (!project) throw new NotFoundException('Project not found')
  if (project.userId !== userId)
    throw new ForbiddenException('You do not have access to this project')
  // Return original transcript for UI
  return (project as any).transcriptOriginal ?? null
}

export async function updateProjectTranscript(args: {
  id: number
  userId: number
  data: TranscriptUpdateRequest
}) {
  const { id, userId, data } = args
  const project = await db.query.contentProjects.findFirst({ where: eq(contentProjects.id, id) })
  if (!project) throw new NotFoundException('Project not found')
  if (project.userId !== userId)
    throw new ForbiddenException('You do not have access to this project')

  const original = data.transcript
  const { transcript } = await normalizeTranscript(data, { userId, projectId: id })

  const [updated] = await db
    .update(contentProjects)
    .set({ transcriptOriginal: original, transcriptCleaned: transcript, updatedAt: new Date() })
    .where(and(eq(contentProjects.id, id), eq(contentProjects.userId, userId)))
    .returning()

  return updated
}
