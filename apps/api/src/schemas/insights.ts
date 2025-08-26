import { z } from 'zod';
import { BaseFilterSchema, InsightStatusSchema, PostTypeSchema, IdSchema } from './common';

// Filter schema for listing insights
export const InsightFilterSchema = BaseFilterSchema.extend({
  status: z.union([InsightStatusSchema, z.literal('all')]).optional(),
  postType: PostTypeSchema.optional(),
  category: z.string().optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
  maxScore: z.coerce.number().min(0).max(100).optional(),
  transcriptId: IdSchema.optional(),
});

// Schema for updating an existing insight
export const UpdateInsightSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  summary: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  status: InsightStatusSchema.optional(),
});

// Schema for bulk operations on insights
export const BulkInsightOperationSchema = z.object({
  action: z.enum(['approve', 'reject', 'archive', 'needs_review']),
  insightIds: z.array(IdSchema).min(1).max(100),
});

// Path parameters schema for insight routes
export const InsightParamsSchema = z.object({
  id: IdSchema,
});