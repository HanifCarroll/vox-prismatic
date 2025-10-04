import type { TranscriptNormalizeRequest } from '@content/shared-types'
import { z } from 'zod'
import { FLASH_MODEL, generateJson } from '@/modules/ai/ai'
import { ValidationException } from '@/utils/errors'

const CleanedTranscriptSchema = z.object({
  transcript: z.string().min(1),
  length: z.number().int().nonnegative(),
})

export async function normalizeTranscript(
  input: TranscriptNormalizeRequest,
  context?: { userId?: number | string; projectId?: number | string | null },
): Promise<{ transcript: string; length: number }> {
  const text = (input.transcript ?? '').trim()
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

// DB-bound helpers moved to routes using Supabase client
