import { z } from 'zod';

// Base schemas for common types used across the API
export const PlatformSchema = z.enum(['linkedin', 'x']);
export const PostTypeSchema = z.enum(['Problem', 'Proof', 'Framework', 'Contrarian Take', 'Mental Model']);
export const TranscriptStatusSchema = z.enum(['raw', 'processing', 'cleaned', 'insights_generated', 'posts_created', 'error']);
export const InsightStatusSchema = z.enum(['draft', 'needs_review', 'approved', 'rejected', 'archived']);
export const PostStatusSchema = z.enum(['draft', 'needs_review', 'approved', 'scheduled', 'published', 'failed', 'archived']);
export const ScheduledPostStatusSchema = z.enum(['pending', 'published', 'failed', 'cancelled']);

// Common filters used across multiple endpoints
export const BaseFilterSchema = z.object({
  limit: z.coerce.number().int().positive().max(1000).default(50).optional(),
  offset: z.coerce.number().int().nonnegative().default(0).optional(),
  search: z.string().min(1).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
});

// ID validation - ensures non-empty strings
export const IdSchema = z.string().min(1);
export const OptionalIdSchema = IdSchema.optional();

// Date validation helpers
export const ISODateSchema = z.string().datetime();
export const FutureDateSchema = z.string().datetime().refine(
  (date) => new Date(date) > new Date(),
  { message: 'Date must be in the future' }
);