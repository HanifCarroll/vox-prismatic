import { z } from 'zod'

export const PostSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  insightId: z.number().nullable().optional(),
  content: z.string(),
  platform: z.literal('LinkedIn'),
  isApproved: z.boolean(),
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
    isApproved: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' })
export type UpdatePostRequest = z.infer<typeof UpdatePostRequestSchema>

export const PublishNowResponseSchema = z.object({ post: PostSchema })
export type PublishNowResponse = z.infer<typeof PublishNowResponseSchema>

// Bulk approvals
export const BulkApprovePostsRequestSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1),
  isApproved: z.boolean(),
})
export type BulkApprovePostsRequest = z.infer<typeof BulkApprovePostsRequestSchema>

export const BulkApprovePostsResponseSchema = z.object({
  updated: z.number().int().nonnegative(),
})
export type BulkApprovePostsResponse = z.infer<typeof BulkApprovePostsResponseSchema>
