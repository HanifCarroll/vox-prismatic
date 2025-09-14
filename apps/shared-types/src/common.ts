import { z } from 'zod'

// Error response shared shape
export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  status: z.number(),
  details: z.record(z.string(), z.unknown()).optional(),
})
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>

export const PaginationMetaSchema = z.object({
  page: z.number().int().nonnegative(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
})
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>

