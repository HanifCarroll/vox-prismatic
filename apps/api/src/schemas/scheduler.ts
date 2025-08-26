import { z } from 'zod';
import { PlatformSchema, ScheduledPostStatusSchema, IdSchema, FutureDateSchema, ISODateSchema } from './common';

// Filter schema for listing scheduled events
export const SchedulerFilterSchema = z.object({
  status: z.union([ScheduledPostStatusSchema, z.literal('all')]).optional(),
  platform: z.union([PlatformSchema, z.literal('all')]).optional(),
  startDate: ISODateSchema.optional(),
  endDate: ISODateSchema.optional(),
});

// Schema for creating a scheduled event
export const CreateScheduledEventSchema = z.object({
  postId: IdSchema.optional(),
  platform: PlatformSchema,
  content: z.string().min(1).max(10000),
  scheduledTime: FutureDateSchema,
  metadata: z.record(z.any()).optional(),
}).refine(
  (data) => data.postId || data.content,
  { message: 'Either postId or content must be provided' }
);

// Schema for updating a scheduled event
export const UpdateScheduledEventSchema = z.object({
  scheduledTime: FutureDateSchema.optional(),
  content: z.string().min(1).max(10000).optional(),
  platform: PlatformSchema.optional(),
  metadata: z.record(z.any()).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

// Path parameters schema for scheduler routes
export const SchedulerParamsSchema = z.object({
  id: IdSchema,
});

// Query parameters for unscheduling
export const UnscheduleQuerySchema = z.object({
  postId: IdSchema,
});