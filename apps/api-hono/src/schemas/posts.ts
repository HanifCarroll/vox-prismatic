import { z } from 'zod';
import { BaseFilterSchema, PostStatusSchema, PlatformSchema, IdSchema, FutureDateSchema } from './common';

// Filter schema for listing posts
export const PostFilterSchema = BaseFilterSchema.extend({
  status: z.union([PostStatusSchema, z.literal('all')]).optional(),
  platform: z.union([PlatformSchema, z.literal('all')]).optional(),
  insightId: IdSchema.optional(),
});

// Schema for creating a new post
export const CreatePostSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(10000),
  platform: PlatformSchema,
  insightId: IdSchema,
  postType: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

// Schema for updating an existing post
export const UpdatePostSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).max(10000).optional(),
  status: PostStatusSchema.optional(),
  hashtags: z.array(z.string()).optional(),
  postType: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Schema for scheduling a post
export const SchedulePostSchema = z.object({
  platform: PlatformSchema,
  scheduledTime: FutureDateSchema,
  metadata: z.record(z.any()).optional(),
});

// Path parameters schema for post routes
export const PostParamsSchema = z.object({
  id: IdSchema,
});