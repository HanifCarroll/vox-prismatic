import { z } from 'zod'

export const PostStatusSchema = z.enum(['pending', 'approved', 'rejected'])
export type PostStatus = z.infer<typeof PostStatusSchema>

export const PostSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  insightId: z.number().nullable().optional(),
  content: z.string(),
  platform: z.literal('LinkedIn'),
  status: PostStatusSchema,
  publishedAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
})
export type Post = z.infer<typeof PostSchema>

export const ListPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
})
export type ListPostsQuery = z.infer<typeof ListPostsQuerySchema>

export const UpdatePostRequestSchema = z
  .object({
    content: z.string().min(1).max(3000).optional(),
    status: PostStatusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' })
export type UpdatePostRequest = z.infer<typeof UpdatePostRequestSchema>

export const PublishNowResponseSchema = z.object({ post: PostSchema })
export type PublishNowResponse = z.infer<typeof PublishNowResponseSchema>

// Bulk set status
export const BulkSetStatusRequestSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1),
  status: PostStatusSchema,
})
export type BulkSetStatusRequest = z.infer<typeof BulkSetStatusRequestSchema>

export const BulkSetStatusResponseSchema = z.object({
  updated: z.number().int().nonnegative(),
})
export type BulkSetStatusResponse = z.infer<typeof BulkSetStatusResponseSchema>

// Bulk regenerate posts
export const BulkRegenerateRequestSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1),
})
export type BulkRegenerateRequest = z.infer<typeof BulkRegenerateRequestSchema>

export const BulkRegenerateResponseSchema = z.object({
  updated: z.number().int().nonnegative(),
  items: z.array(PostSchema).default([]),
})
export type BulkRegenerateResponse = z.infer<typeof BulkRegenerateResponseSchema>
