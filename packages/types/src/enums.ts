/**
 * Centralized enums for the content creation platform
 * Single source of truth for all status types and domain enums
 */

// =====================================================================
// STATUS ENUMS
// =====================================================================

/**
 * Transcript processing status
 */
export enum TranscriptStatus {
  RAW = 'raw',
  PROCESSING = 'processing',
  CLEANED = 'cleaned',
  FAILED = 'failed'
}

/**
 * Insight review and approval status
 */
export enum InsightStatus {
  DRAFT = 'draft',
  NEEDS_REVIEW = 'needs_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
  FAILED = 'failed'
}

/**
 * Post lifecycle status
 */
export enum PostStatus {
  DRAFT = 'draft',
  NEEDS_REVIEW = 'needs_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  FAILED = 'failed',
  ARCHIVED = 'archived'
}

/**
 * Scheduled post execution status
 */
export enum ScheduledPostStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  PUBLISHING = 'publishing',
  PUBLISHED = 'published',
  FAILED = 'failed',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

/**
 * Processing job execution status
 */
export enum ProcessingJobStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  PERMANENTLY_FAILED = 'permanently_failed',
  CANCELLED = 'cancelled'
}

// =====================================================================
// PLATFORM ENUMS
// =====================================================================

/**
 * Core social media platforms
 */
export enum Platform {
  LINKEDIN = 'linkedin',
  X = 'x'
}

/**
 * Extended platform list for integrations
 */
export enum ExtendedPlatform {
  LINKEDIN = 'linkedin',
  X = 'x',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  YOUTUBE = 'youtube'
}

/**
 * Publishing platform options
 */
export enum PublishPlatform {
  LINKEDIN = 'linkedin',
  X = 'x',
  ALL = 'all'
}

// =====================================================================
// CONTENT TYPE ENUMS
// =====================================================================

/**
 * Post type categories for content generation
 */
export enum PostType {
  PROBLEM = 'Problem',
  PROOF = 'Proof',
  FRAMEWORK = 'Framework',
  CONTRARIAN_TAKE = 'Contrarian Take',
  MENTAL_MODEL = 'Mental Model'
}

/**
 * Insight categorization
 */
export enum InsightCategory {
  PRODUCT = 'Product',
  MARKETING = 'Marketing',
  SALES = 'Sales',
  ENGINEERING = 'Engineering',
  DESIGN = 'Design',
  LEADERSHIP = 'Leadership',
  CULTURE = 'Culture',
  STRATEGY = 'Strategy',
  OTHER = 'Other'
}

/**
 * Content source types
 */
export enum SourceType {
  RECORDING = 'recording',
  UPLOAD = 'upload',
  MANUAL = 'manual',
  YOUTUBE = 'youtube',
  PODCAST = 'podcast',
  ARTICLE = 'article'
}

// =====================================================================
// PROCESSING ENUMS
// =====================================================================

/**
 * Processing job types
 */
export enum JobType {
  CLEAN_TRANSCRIPT = 'clean_transcript',
  EXTRACT_INSIGHTS = 'extract_insights',
  GENERATE_POSTS = 'generate_posts'
}

/**
 * Entity types in the system
 */
export enum EntityType {
  TRANSCRIPT = 'transcript',
  INSIGHT = 'insight',
  POST = 'post',
  SCHEDULED_POST = 'scheduled_post'
}

/**
 * Queue job status (for BullMQ jobs)
 */
export enum QueueJobStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  WAITING = 'waiting',
  STALLED = 'stalled',
  PAUSED = 'paused'
}

// =====================================================================
// DASHBOARD ENUMS
// =====================================================================

/**
 * Action priority levels for dashboard
 */
export enum ActionPriority {
  URGENT = 'urgent',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

/**
 * Action types for dashboard items
 */
export enum ActionType {
  FIX_FAILED = 'fix_failed',
  REVIEW_INSIGHT = 'review_insight',
  REVIEW_POST = 'review_post',
  PROCESS_TRANSCRIPT = 'process_transcript',
  SCHEDULE_POST = 'schedule_post',
  GENERATE_POSTS = 'generate_posts'
}

// =====================================================================
// PIPELINE ENUMS
// =====================================================================

/**
 * Content processing pipeline states
 */
export enum PipelineState {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  CLEANING_TRANSCRIPT = 'cleaningTranscript',
  EXTRACTING_INSIGHTS = 'extractingInsights',
  REVIEWING_INSIGHTS = 'reviewingInsights',
  GENERATING_POSTS = 'generatingPosts',
  REVIEWING_POSTS = 'reviewingPosts',
  READY_TO_SCHEDULE = 'readyToSchedule',
  SCHEDULING = 'scheduling',
  COMPLETED = 'completed',
  PARTIALLY_COMPLETED = 'partiallyCompleted',
  FAILED = 'failed',
  PAUSED = 'paused',
  CANCELLED = 'cancelled'
}

// =====================================================================
// UI AND MODAL ENUMS
// =====================================================================

/**
 * Modal types for the content management system
 */
export enum ModalType {
  TRANSCRIPT_INPUT = 'transcript_input',
  TRANSCRIPT_VIEW = 'transcript_view',
  TRANSCRIPT_EDIT = 'transcript_edit',
  INSIGHT_VIEW = 'insight_view',
  POST_VIEW = 'post_view',
  POST_SCHEDULE = 'post_schedule',
  BULK_SCHEDULE = 'bulk_schedule',
}

// =====================================================================
// BULK OPERATION ENUMS
// =====================================================================

/**
 * Bulk insight operation actions
 */
export enum BulkInsightAction {
  APPROVE = 'approve',
  REJECT = 'reject',
  ARCHIVE = 'archive',
  NEEDS_REVIEW = 'needs_review',
  RESTORE = 'restore',
  DELETE = 'delete'
}

// =====================================================================
// EVENT PRIORITY ENUMS
// =====================================================================

/**
 * Processing job event priority levels
 */
export enum ProcessingJobEventPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// =====================================================================
// TYPE ALIASES (for backward compatibility during migration)
// =====================================================================

/**
 * Type alias for core social platforms
 * Use this when you need a union type instead of enum
 */
export type SocialPlatform = 'linkedin' | 'x';

/**
 * Type guard for checking if a string is a valid SocialPlatform
 */
export function isSocialPlatform(value: string): value is SocialPlatform {
  return value === 'linkedin' || value === 'x';
}

/**
 * Convert Platform enum to SocialPlatform type
 */
export function platformToSocialPlatform(platform: Platform): SocialPlatform {
  switch (platform) {
    case Platform.LINKEDIN:
      return 'linkedin';
    case Platform.X:
      return 'x';
    default:
      throw new Error(`Invalid platform: ${platform}`);
  }
}

/**
 * Convert SocialPlatform type to Platform enum
 */
export function socialPlatformToPlatform(platform: SocialPlatform): Platform {
  switch (platform) {
    case 'linkedin':
      return Platform.LINKEDIN;
    case 'x':
      return Platform.X;
    default:
      throw new Error(`Invalid social platform: ${platform}`);
  }
}