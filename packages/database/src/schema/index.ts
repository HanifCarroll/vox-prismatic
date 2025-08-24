import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

/**
 * Drizzle Schema for Unified Content Pipeline
 * Single table approach for the entire content creation workflow
 */

// Content type enum
export type ContentType = 'transcript' | 'insight' | 'post' | 'scheduled_post';

// Status enum  
export type ContentStatus = 
  | 'raw' | 'cleaning' | 'cleaned' 
  | 'processing_insights' | 'insights_generated'
  | 'generating_posts' | 'posts_generated'
  | 'needs_review' | 'approved' | 'rejected'
  | 'scheduling' | 'scheduled' | 'published' | 'failed'
  | 'cancelled' | 'archived';

// Platform enum
export type Platform = 'linkedin' | 'x' | 'instagram' | 'facebook' | 'youtube';

// Source type enum
export type SourceType = 'recording' | 'upload' | 'manual' | 'ai_generated';

// =====================================================================
// UNIFIED CONTENT TABLE - Single source of truth for entire pipeline
// =====================================================================
export const content: any = sqliteTable('content', {
  id: text('id').primaryKey(),
  
  // Content Classification
  contentType: text('content_type').$type<ContentType>().notNull(),
  title: text('title').notNull(),
  
  // Pipeline Status
  status: text('status', { 
    enum: ['raw', 'cleaning', 'cleaned', 'processing_insights', 'insights_generated',
           'generating_posts', 'posts_generated', 'needs_review', 'approved', 'rejected',
           'scheduling', 'scheduled', 'published', 'failed', 'cancelled', 'archived']
  }).notNull().default('raw'),
  
  // Content Data
  rawContent: text('raw_content'),
  processedContent: text('processed_content'),
  metadata: text('metadata'), // JSON string
  
  // Relationships
  parentId: text('parent_id').references(() => content.id, { onDelete: 'set null' }),
  rootTranscriptId: text('root_transcript_id').references(() => content.id, { onDelete: 'cascade' }),
  
  // Source Information
  sourceType: text('source_type').$type<SourceType>(),
  sourceUrl: text('source_url'),
  filePath: text('file_path'),
  
  // Content Metrics
  wordCount: integer('word_count').default(0),
  durationSeconds: integer('duration_seconds'),
  
  // Scheduling (for scheduled_post type)
  scheduledTime: text('scheduled_time'),
  platform: text('platform').$type<Platform>(),
  retryCount: integer('retry_count').default(0),
  lastAttempt: text('last_attempt'),
  errorMessage: text('error_message'),
  externalPostId: text('external_post_id'),
  
  // Processing Metadata
  processingDurationMs: integer('processing_duration_ms'),
  estimatedTokens: integer('estimated_tokens'),
  estimatedCost: real('estimated_cost'),
  
  // Timestamps
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
}, (table) => ({
  // Indexes for performance
  contentTypeStatusIdx: index('idx_content_type_status').on(table.contentType, table.status),
  parentIdx: index('idx_content_parent').on(table.parentId),
  rootTranscriptIdx: index('idx_content_root_transcript').on(table.rootTranscriptId),
  createdAtIdx: index('idx_content_created').on(table.createdAt),
  scheduledTimeIdx: index('idx_content_scheduled_time').on(table.scheduledTime),
  platformStatusIdx: index('idx_content_platform_status').on(table.platform, table.status),
}));

// =====================================================================
// CONTENT RELATIONSHIPS - Track the content pipeline flow
// =====================================================================
export const contentRelationships = sqliteTable('content_relationships', {
  id: text('id').primaryKey(),
  parentId: text('parent_id').notNull().references(() => content.id, { onDelete: 'cascade' }),
  childId: text('child_id').notNull().references(() => content.id, { onDelete: 'cascade' }),
  relationshipType: text('relationship_type').notNull().$type<'transcript_to_insight' | 'insight_to_post' | 'post_to_scheduled'>(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString())
}, (table) => ({
  parentIdx: index('idx_relationships_parent').on(table.parentId),
  childIdx: index('idx_relationships_child').on(table.childId),
  typeIdx: index('idx_relationships_type').on(table.relationshipType),
  // Unique constraint on parent_id, child_id, relationship_type
  uniqueRelationship: index('unique_relationship').on(table.parentId, table.childId, table.relationshipType)
}));

// =====================================================================
// PROCESSING_JOBS - Track long-running AI processing tasks
// =====================================================================
export const processingJobs = sqliteTable('processing_jobs', {
  id: text('id').primaryKey(),
  contentId: text('content_id').notNull().references(() => content.id, { onDelete: 'cascade' }),
  jobType: text('job_type').notNull().$type<'clean_transcript' | 'extract_insights' | 'generate_posts'>(),
  status: text('status').notNull().default('pending').$type<'pending' | 'processing' | 'completed' | 'failed'>(),
  progress: integer('progress').default(0), // 0-100
  
  // Processing results
  resultCount: integer('result_count').default(0),
  errorMessage: text('error_message'),
  
  // Performance metrics
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  durationMs: integer('duration_ms'),
  estimatedTokens: integer('estimated_tokens'),
  estimatedCost: real('estimated_cost'),
  
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
}, (table) => ({
  contentIdx: index('idx_jobs_content').on(table.contentId),
  typeStatusIdx: index('idx_jobs_type_status').on(table.jobType, table.status)
}));

// =====================================================================
// ANALYTICS - Track content performance and system metrics
// =====================================================================
export const analyticsEvents = sqliteTable('analytics_events', {
  id: text('id').primaryKey(),
  contentId: text('content_id').notNull().references(() => content.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(),
  eventData: text('event_data'), // JSON string
  value: real('value'), // Numeric value for aggregation
  occurredAt: text('occurred_at').notNull().$defaultFn(() => new Date().toISOString()),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString())
}, (table) => ({
  contentIdx: index('idx_analytics_content').on(table.contentId),
  eventTypeIdx: index('idx_analytics_event_type').on(table.eventType),
  occurredAtIdx: index('idx_analytics_occurred').on(table.occurredAt)
}));

// =====================================================================
// SETTINGS - Application configuration and user preferences
// =====================================================================
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  category: text('category').notNull().default('general'),
  description: text('description'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
});

// =====================================================================
// SCHEMA VERSION TRACKING
// =====================================================================
export const schemaInfo = sqliteTable('schema_info', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
});

// Export types for use in queries
export type Content = typeof content.$inferSelect;
export type NewContent = typeof content.$inferInsert;
export type ContentRelationship = typeof contentRelationships.$inferSelect;
export type NewContentRelationship = typeof contentRelationships.$inferInsert;
export type ProcessingJob = typeof processingJobs.$inferSelect;
export type NewProcessingJob = typeof processingJobs.$inferInsert;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
export type SchemaInfo = typeof schemaInfo.$inferSelect;
export type NewSchemaInfo = typeof schemaInfo.$inferInsert;