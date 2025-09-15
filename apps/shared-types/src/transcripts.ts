import { z } from 'zod'

export const TranscriptNormalizeRequestSchema = z.object({
  transcript: z.string().min(1, 'Transcript is required'),
})
export type TranscriptNormalizeRequest = z.infer<typeof TranscriptNormalizeRequestSchema>

export const TranscriptNormalizeResponseSchema = z.object({
  transcript: z.string(),
  length: z.number().int().nonnegative(),
})
export type TranscriptNormalizeResponse = z.infer<typeof TranscriptNormalizeResponseSchema>

export const TranscriptUpdateRequestSchema = TranscriptNormalizeRequestSchema
export type TranscriptUpdateRequest = z.infer<typeof TranscriptUpdateRequestSchema>

export const TranscriptGetResponseSchema = z.object({
  transcript: z.string().nullable(),
})
export type TranscriptGetResponse = z.infer<typeof TranscriptGetResponseSchema>
