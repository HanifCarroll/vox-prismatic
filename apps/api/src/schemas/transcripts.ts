import { z } from 'zod';
import { BaseFilterSchema, TranscriptStatusSchema, IdSchema } from './common';

// Filter schema for listing transcripts
export const TranscriptFilterSchema = BaseFilterSchema.extend({
  status: z.union([TranscriptStatusSchema, z.literal('all')]).optional(),
  sourceType: z.enum(['recording', 'upload', 'manual', 'youtube', 'podcast', 'article']).optional(),
});

// Schema for creating a new transcript
export const CreateTranscriptSchema = z.object({
  title: z.string().min(1).max(500),
  rawContent: z.string().min(1),
  sourceType: z.enum(['recording', 'upload', 'manual', 'youtube', 'podcast', 'article']).default('manual'),
  sourceUrl: z.string().url().optional(),
  fileName: z.string().optional(),
  duration: z.number().positive().optional(),
});

// Schema for updating an existing transcript
export const UpdateTranscriptSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  rawContent: z.string().min(1).optional(),
  status: TranscriptStatusSchema.optional(),
});

// Path parameters schema for transcript routes
export const TranscriptParamsSchema = z.object({
  id: IdSchema,
});