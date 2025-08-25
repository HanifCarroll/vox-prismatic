import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

/**
 * Proper Drizzle Schema with Separate Domain Tables
 * Maintains type safety while properly modeling the content pipeline
 */

export const SCHEMA_VERSION = 2;

// =====================================================================
// TRANSCRIPTS - Raw and processed transcript content
// =====================================================================
export const transcripts = sqliteTable('transcripts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  rawContent: text('raw_content').notNull(),
  cleanedContent: text('cleaned_content'),
  status: text('status', { 
    enum: ['raw', 'processing', 'cleaned', 'insights_generated', 'posts_created', 'error'] 
  }).notNull().default('raw'),
  
  // Source information
  sourceType: text('source_type', {
    enum: ['recording', 'upload', 'manual', 'youtube', 'podcast', 'article']
  }),
  sourceUrl: text('source_url'),
  fileName: text('file_name'),
  duration: integer('duration'), // Duration in seconds
  wordCount: integer('word_count').notNull().default(0),
  filePath: text('file_path'),
  
  // Timestamps
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
}, (table) => ({
  statusIdx: index('idx_transcripts_status').on(table.status),
  createdAtIdx: index('idx_transcripts_created_at').on(table.createdAt)
}));

// =====================================================================
// INSIGHTS - AI-extracted insights from transcripts
// =====================================================================
export const insights = sqliteTable('insights', {
  id: text('id').primaryKey(),
  cleanedTranscriptId: text('cleaned_transcript_id').notNull().references(() => transcripts.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  verbatimQuote: text('verbatim_quote').notNull(),
  
  // Classification
  category: text('category').notNull(),
  postType: text('post_type', {
    enum: ['Problem', 'Proof', 'Framework', 'Contrarian Take', 'Mental Model']
  }).notNull(),
  
  // AI scoring
  urgencyScore: integer('urgency_score').notNull(),
  relatabilityScore: integer('relatability_score').notNull(),
  specificityScore: integer('specificity_score').notNull(),
  authorityScore: integer('authority_score').notNull(),
  totalScore: integer('total_score').notNull(),
  
  // Pipeline status
  status: text('status', {
    enum: ['draft', 'needs_review', 'approved', 'rejected', 'archived']
  }).notNull().default('draft'),
  
  // Processing metadata
  processingDurationMs: integer('processing_duration_ms'),
  estimatedTokens: integer('estimated_tokens'),
  estimatedCost: real('estimated_cost'),
  
  // Timestamps
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
}, (table) => ({
  transcriptIdIdx: index('idx_insights_cleaned_transcript_id').on(table.cleanedTranscriptId),
  statusIdx: index('idx_insights_status').on(table.status),
  totalScoreIdx: index('idx_insights_total_score').on(table.totalScore),
  createdAtIdx: index('idx_insights_created_at').on(table.createdAt)
}));

// =====================================================================
// POSTS - Generated social media posts from insights
// =====================================================================
export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  insightId: text('insight_id').notNull().references(() => insights.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  platform: text('platform', {
    enum: ['linkedin', 'x', 'instagram', 'facebook', 'youtube']
  }).notNull(),
  
  // Post content structure
  hook: text('hook'),
  body: text('body').notNull(),
  softCta: text('soft_cta'),
  directCta: text('direct_cta'),
  fullContent: text('full_content').notNull(),
  
  // Pipeline status
  status: text('status', {
    enum: ['draft', 'needs_review', 'approved', 'scheduled', 'published', 'failed', 'archived']
  }).notNull().default('draft'),
  
  // Content metrics
  characterCount: integer('character_count'),
  estimatedEngagementScore: integer('estimated_engagement_score'),
  hashtags: text('hashtags'), // JSON array
  mentions: text('mentions'), // JSON array
  
  // Processing metadata
  processingDurationMs: integer('processing_duration_ms'),
  estimatedTokens: integer('estimated_tokens'),
  estimatedCost: real('estimated_cost'),
  
  // Timestamps
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
}, (table) => ({
  insightIdIdx: index('idx_posts_insight_id').on(table.insightId),
  platformIdx: index('idx_posts_platform').on(table.platform),
  statusIdx: index('idx_posts_status').on(table.status),
  createdAtIdx: index('idx_posts_created_at').on(table.createdAt)
}));

// =====================================================================
// SCHEDULED_POSTS - Posts scheduled for publication
// =====================================================================
export const scheduledPosts = sqliteTable('scheduled_posts', {
  id: text('id').primaryKey(),
  postId: text('post_id').references(() => posts.id, { onDelete: 'set null' }),
  
  // Scheduling details
  platform: text('platform', {
    enum: ['linkedin', 'x', 'postiz', 'instagram', 'facebook']
  }).notNull(),
  content: text('content').notNull(),
  scheduledTime: text('scheduled_time').notNull(),
  
  // Publication status
  status: text('status', {
    enum: ['pending', 'published', 'failed', 'cancelled']
  }).notNull().default('pending'),
  
  // Error handling
  retryCount: integer('retry_count').default(0),
  lastAttempt: text('last_attempt'),
  errorMessage: text('error_message'),
  
  // External platform data
  externalPostId: text('external_post_id'),
  
  // Timestamps
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
}, (table) => ({
  postIdIdx: index('idx_scheduled_posts_post_id').on(table.postId),
  platformIdx: index('idx_scheduled_posts_platform').on(table.platform),
  statusIdx: index('idx_scheduled_posts_status').on(table.status),
  scheduledTimeIdx: index('idx_scheduled_posts_scheduled_time').on(table.scheduledTime),
  createdAtIdx: index('idx_scheduled_posts_created_at').on(table.createdAt)
}));

// =====================================================================
// PROCESSING_JOBS - Track long-running AI processing tasks
// =====================================================================
export const processingJobs = sqliteTable('processing_jobs', {
  id: text('id').primaryKey(),
  jobType: text('job_type', {
    enum: ['clean_transcript', 'extract_insights', 'generate_posts']
  }).notNull(),
  sourceId: text('source_id').notNull(),
  status: text('status', {
    enum: ['pending', 'processing', 'completed', 'failed']
  }).notNull().default('pending'),
  progress: integer('progress').default(0),
  
  // Processing results
  resultCount: integer('result_count').default(0),
  errorMessage: text('error_message'),
  
  // Performance metrics
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  durationMs: integer('duration_ms'),
  estimatedTokens: integer('estimated_tokens'),
  estimatedCost: real('estimated_cost'),
  
  // Timestamps
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
}, (table) => ({
  jobTypeStatusIdx: index('idx_jobs_type_status').on(table.jobType, table.status),
  sourceIdIdx: index('idx_jobs_source_id').on(table.sourceId),
  createdAtIdx: index('idx_jobs_created_at').on(table.createdAt)
}));

// =====================================================================
// ANALYTICS - Track content performance and system metrics
// =====================================================================
export const analyticsEvents = sqliteTable('analytics_events', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(),
  entityType: text('entity_type', {
    enum: ['transcript', 'insight', 'post', 'scheduled_post']
  }).notNull(),
  entityId: text('entity_id').notNull(),
  
  // Event data
  eventData: text('event_data'), // JSON
  value: real('value'),
  
  // Timestamps
  occurredAt: text('occurred_at').notNull().$defaultFn(() => new Date().toISOString()),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString())
}, (table) => ({
  entityIdx: index('idx_analytics_entity').on(table.entityType, table.entityId),
  eventTypeIdx: index('idx_analytics_event_type').on(table.eventType),
  occurredAtIdx: index('idx_analytics_occurred_at').on(table.occurredAt)
}));

// =====================================================================
// SETTINGS - Application configuration and user preferences
// =====================================================================
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  category: text('category').notNull().default('general'),
  description: text('description'),
  
  // Timestamps
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
}, (table) => ({
  categoryIdx: index('idx_settings_category').on(table.category)
}));

// Type inference for TypeScript
export type Transcript = typeof transcripts.$inferSelect;
export type NewTranscript = typeof transcripts.$inferInsert;

export type Insight = typeof insights.$inferSelect;
export type NewInsight = typeof insights.$inferInsert;

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;

export type ScheduledPost = typeof scheduledPosts.$inferSelect;
export type NewScheduledPost = typeof scheduledPosts.$inferInsert;

export type ProcessingJob = typeof processingJobs.$inferSelect;
export type NewProcessingJob = typeof processingJobs.$inferInsert;

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;