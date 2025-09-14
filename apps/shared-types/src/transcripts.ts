import { z } from 'zod'

export const TranscriptNormalizeRequestSchema = z
  .object({
    transcript: z.string().optional().nullable(),
    sourceUrl: z.string().url('Invalid URL').optional().nullable(),
  })
  .refine((data) => !!(data.transcript && data.transcript.trim()) || !!(data.sourceUrl && data.sourceUrl.trim()), {
    message: 'Either transcript or sourceUrl is required',
    path: ['transcript'],
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

