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

export const PostAnalyticsQuerySchema = z
  .object({
    days: z.coerce.number().int().min(7).max(180).default(30),
  })
  .default({ days: 30 })
export type PostAnalyticsQuery = z.infer<typeof PostAnalyticsQuerySchema>

export const PostAnalyticsSummarySchema = z.object({
  totalPosts: z.number().int().nonnegative(),
  statusCounts: z.object({
    pending: z.number().int().nonnegative(),
    approved: z.number().int().nonnegative(),
    rejected: z.number().int().nonnegative(),
    published: z.number().int().nonnegative(),
  }),
  scheduledCount: z.number().int().nonnegative(),
  publishedInPeriod: z.number().int().nonnegative(),
  averageTimeToPublishHours: z.number().nonnegative().nullable(),
  rangeDays: z.number().int().positive(),
})
export type PostAnalyticsSummary = z.infer<typeof PostAnalyticsSummarySchema>

export const PostAnalyticsDailyMetricSchema = z.object({
  date: z.string(),
  published: z.number().int().nonnegative(),
})
export type PostAnalyticsDailyMetric = z.infer<typeof PostAnalyticsDailyMetricSchema>

export const PostAnalyticsTopHashtagSchema = z.object({
  tag: z.string(),
  count: z.number().int().nonnegative(),
})
export type PostAnalyticsTopHashtag = z.infer<typeof PostAnalyticsTopHashtagSchema>

export const PostAnalyticsResponseSchema = z.object({
  summary: PostAnalyticsSummarySchema,
  daily: z.array(PostAnalyticsDailyMetricSchema),
  topHashtags: z.array(PostAnalyticsTopHashtagSchema),
})
export type PostAnalyticsResponse = z.infer<typeof PostAnalyticsResponseSchema>

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

export const HookFrameworkSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  example: z.string().optional(),
  tags: z.array(z.string()).default([]),
})
export type HookFramework = z.infer<typeof HookFrameworkSchema>

export const HookWorkbenchHookSchema = z.object({
  id: z.string().min(1),
  frameworkId: z.string().min(1),
  label: z.string().min(1),
  hook: z.string().min(1).max(280),
  curiosity: z.number().int().min(0).max(100),
  valueAlignment: z.number().int().min(0).max(100),
  rationale: z.string().min(1),
})
export type HookWorkbenchHook = z.infer<typeof HookWorkbenchHookSchema>

export const HookWorkbenchResponseSchema = z.object({
  hooks: z.array(HookWorkbenchHookSchema).min(1),
  summary: z.string().optional(),
  recommendedId: z.string().optional(),
  generatedAt: z.coerce.date(),
})
export type HookWorkbenchResponse = z.infer<typeof HookWorkbenchResponseSchema>

export const HookFrameworksResponseSchema = z.object({
  frameworks: z.array(HookFrameworkSchema),
})
export type HookFrameworksResponse = z.infer<typeof HookFrameworksResponseSchema>

export const HookWorkbenchRequestSchema = z
  .object({
    frameworkIds: z.array(z.string().min(1)).min(1).max(5).optional(),
    customFocus: z
      .string()
      .trim()
      .min(6, 'Provide at least a short phrase')
      .max(240, 'Keep focus under 240 characters')
      .optional(),
    count: z.coerce.number().int().min(3).max(5).optional(),
  })
  .strict()
export type HookWorkbenchRequest = z.infer<typeof HookWorkbenchRequestSchema>
