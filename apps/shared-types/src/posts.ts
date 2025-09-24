import { z } from 'zod'
import { PostTypePresetSchema, WritingStyleSchema } from './style'

export const PostStatusSchema = z.enum(['pending', 'approved', 'rejected', 'published'])
export type PostStatus = z.infer<typeof PostStatusSchema>

export const PostScheduleStatusSchema = z.enum(['scheduled', 'publishing', 'failed'])
export type PostScheduleStatus = z.infer<typeof PostScheduleStatusSchema>

export const PostSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  insightId: z.number().nullable().optional(),
  content: z.string(),
  hashtags: z.array(z.string()).default([]),
  platform: z.literal('LinkedIn'),
  status: PostStatusSchema,
  publishedAt: z.coerce.date().nullable().optional(),
  scheduledAt: z.coerce.date().nullable().optional(),
  scheduleStatus: PostScheduleStatusSchema.nullable().optional(),
  scheduleError: z.string().nullable().optional(),
  scheduleAttemptedAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
})
export type Post = z.infer<typeof PostSchema>

export const ListPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
})
export type ListPostsQuery = z.infer<typeof ListPostsQuerySchema>

export const ListScheduledPostsQuerySchema = ListPostsQuerySchema.extend({
  status: PostScheduleStatusSchema.optional(),
})
export type ListScheduledPostsQuery = z.infer<typeof ListScheduledPostsQuerySchema>

export const UpdatePostRequestSchema = z
  .object({
    content: z.string().min(1).max(3000).optional(),
    hashtags: z.array(z.string()).optional(),
    status: PostStatusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' })
export type UpdatePostRequest = z.infer<typeof UpdatePostRequestSchema>

export const PublishNowResponseSchema = z.object({ post: PostSchema })
export type PublishNowResponse = z.infer<typeof PublishNowResponseSchema>

export const SchedulePostRequestSchema = z.object({
  scheduledAt: z.coerce.date(),
})
export type SchedulePostRequest = z.infer<typeof SchedulePostRequestSchema>

export const SchedulePostResponseSchema = z.object({ post: PostSchema })
export type SchedulePostResponse = z.infer<typeof SchedulePostResponseSchema>

export const UnschedulePostResponseSchema = z.object({ post: PostSchema })
export type UnschedulePostResponse = z.infer<typeof UnschedulePostResponseSchema>

export const ListScheduledPostsResponseSchema = z.object({
  items: z.array(PostSchema),
  meta: z.object({ page: z.number(), pageSize: z.number(), total: z.number() }),
})
export type ListScheduledPostsResponse = z.infer<typeof ListScheduledPostsResponseSchema>

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
  customInstructions: z.string().min(1).max(1200).optional(),
  postType: PostTypePresetSchema.optional(),
  overrides: WritingStyleSchema.partial().optional(),
})
export type BulkRegenerateRequest = z.infer<typeof BulkRegenerateRequestSchema>

export const BulkRegenerateResponseSchema = z.object({
  updated: z.number().int().nonnegative(),
  items: z.array(PostSchema).default([]),
})
export type BulkRegenerateResponse = z.infer<typeof BulkRegenerateResponseSchema>
