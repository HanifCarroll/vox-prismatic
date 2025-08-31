/**
 * Common shared types across all applications
 * Functional programming patterns and utility types
 */

import type { QueueJob, ProcessingState } from './queue';
import type { 
  Platform, 
  PostType, 
  TranscriptStatus, 
  InsightStatus, 
  PostStatus, 
  ScheduledPostStatus, 
  QueueJobStatus, 
  JobType, 
  SourceType, 
  EntityType 
} from './enums';

// =====================================================================
// FUNCTIONAL PATTERNS
// =====================================================================

export type Result<T, E = string> = 
  | { success: true; data: T }
  | { success: false; error: E };

export type AsyncResult<T, E = string> = Promise<Result<T, E>>;

// Backend internal result type that uses Error objects
export type InternalResult<T> = Result<T, Error>;
export type AsyncInternalResult<T> = Promise<InternalResult<T>>;

// Helper functions for Result type
export const ok = <T>(data: T): Result<T> => ({ success: true, data });
export const err = <E = string>(error: E): Result<never, E> => ({ success: false, error });

// Helper functions for InternalResult type
export const internalOk = <T>(data: T): InternalResult<T> => ({ success: true, data });
export const internalErr = (error: Error): InternalResult<never> => ({ success: false, error });

// Transformation utilities
export const toApiResult = <T>(internalResult: InternalResult<T>): Result<T, string> => {
  if (internalResult.success) {
    return { success: true, data: internalResult.data };
  }
  return { success: false, error: internalResult.error.message };
};

export const toInternalResult = <T>(apiResult: Result<T, string>): InternalResult<T> => {
  if (apiResult.success) {
    return { success: true, data: apiResult.data };
  }
  return { success: false, error: new Error(apiResult.error) };
};

// =====================================================================
// TYPE IMPORTS FROM ENUMS (types are now centralized in enums.ts)
// =====================================================================
// All enum types are now imported from './enums' at the top of this file

// =====================================================================
// API METADATA
// =====================================================================

export interface PaginationMetadata {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ApiMetadata {
  pagination: PaginationMetadata;
  counts: Record<string, number>;
}

export interface ApiResponseWithMetadata<T> {
  success: boolean;
  data: T[];
  meta: ApiMetadata;
}

// =====================================================================
// FILTER INTERFACES
// =====================================================================

export interface BaseFilter {
  limit?: number;
  offset?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TranscriptFilter extends BaseFilter {
  status?: TranscriptStatus | 'all';
  sourceType?: SourceType;
}

export interface InsightFilter extends BaseFilter {
  status?: InsightStatus | 'all';
  postType?: PostType;
  category?: string;
  minScore?: number;
  maxScore?: number;
  transcriptId?: string;
}

export interface PostFilter extends BaseFilter {
  status?: PostStatus | 'all';
  platform?: Platform | 'all';
  insightId?: string;
}

export interface ScheduledPostFilter extends BaseFilter {
  status?: ScheduledPostStatus | 'all';
  platform?: Platform | 'all';
  scheduledAfter?: string;
  scheduledBefore?: string;
  postId?: string;
}

// =====================================================================
// VIEW INTERFACES - Extended types with joined data
// =====================================================================

export interface TranscriptView {
  id: string;
  title: string;
  rawContent: string;
  cleanedContent?: string;
  status: TranscriptStatus;
  sourceType?: SourceType;
  sourceUrl?: string;
  fileName?: string;
  duration?: number;
  wordCount: number;
  filePath?: string;
  createdAt: Date;
  updatedAt: Date;
  // Queue processing tracking
  queueJobId?: string;
  queueJob?: QueueJob;
  processingState?: ProcessingState;
}

export interface InsightView {
  id: string;
  cleanedTranscriptId: string;
  title: string;
  summary: string;
  verbatimQuote: string;
  category: string;
  postType: PostType;
  urgencyScore: number;
  relatabilityScore: number;
  specificityScore: number;
  authorityScore: number;
  totalScore: number;
  status: InsightStatus;
  processingDurationMs?: number;
  estimatedTokens?: number;
  estimatedCost?: number;
  createdAt: Date;
  updatedAt: Date;
  // Joined data
  transcriptTitle?: string;
  // Queue processing tracking
  queueJobId?: string;
  queueJob?: QueueJob;
  processingState?: ProcessingState;
}

export interface PostView {
  id: string;
  insightId: string;
  title: string;
  content: string;
  platform: Platform;
  status: PostStatus;
  characterCount?: number;
  scheduledFor?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Joined data
  insightTitle?: string;
  transcriptTitle?: string;
  transcriptId?: string;
  // Queue processing tracking
  queueJobId?: string;
  queueJob?: QueueJob;
  processingState?: ProcessingState;
}

export interface ScheduledPostView {
  id: string;
  postId: string;
  platform: Platform;
  content: string;
  scheduledTime: string;
  status: ScheduledPostStatus;
  retryCount: number;
  lastAttempt?: string | null;
  errorMessage?: string | null;
  externalPostId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================================
// API RESPONSE TYPES
// =====================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiListResponse<T> extends ApiResponse<T[]> {
  meta?: {
    total: number;
    count: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// =====================================================================
// DASHBOARD AND ANALYTICS TYPES
// =====================================================================

export interface StatsResult {
  total: number;
  byStatus: Record<string, number>;
}

export interface ScheduledPostStats extends StatsResult {
  byPlatform: Record<string, number>;
  upcoming24h: number;
}

export interface DashboardCounts {
  transcripts: {
    total: number;
    byStatus: Record<string, number>;
  };
  insights: {
    total: number;
    byStatus: Record<string, number>;
  };
  posts: {
    total: number;
    byStatus: Record<string, number>;
  };
  scheduled: {
    total: number;
    byPlatform: Record<string, number>;
    upcoming24h: number;
  };
}

export interface DashboardActivity {
  id: string;
  type: 'insight_created' | 'post_created' | 'post_scheduled' | 'post_published';
  title: string;
  timestamp: string;
  status: string;
}

export interface DashboardData {
  counts: DashboardCounts;
  activity: DashboardActivity[];
  stats?: any;
  workflowPipeline?: WorkflowPipeline;
}

export interface WorkflowPipeline {
  rawInput: number;
  processing: number;
  insightsReview: number;
  postsReview: number;
  approved: number;
  scheduled: number;
  published: number;
}

export interface DashboardStats {
  upcomingPosts: {
    todayCount: number;
    weekCount: number;
    nextPost?: {
      id: string;
      title: string;
      platform: Platform;
      scheduledTime: string;
    };
  };
  pipeline: {
    rawTranscripts: number;
    cleanedTranscripts: number;
    readyInsights: number;
    generatedPosts: number;
    approvedPosts: number;
    scheduledPosts: number;
  };
  workflowPipeline?: WorkflowPipeline;
}

export interface ActivityItem {
  id: string;
  type: 'insight_approved' | 'insight_rejected' | 'post_generated' | 'post_scheduled' | 'transcript_processed';
  title: string;
  description: string;
  timestamp: string;
  metadata?: {
    platform?: Platform;
    score?: number;
  };
}

export interface RecentActivityResponse {
  activities: ActivityItem[];
  summary: {
    totalToday: number;
    insightsApproved: number;
    postsScheduled: number;
  };
}

// =====================================================================
// BULK OPERATION RESPONSE TYPES
// =====================================================================

export interface BulkInsightsResponse {
  postsGenerated?: number;
  insightsProcessed: number;
  action: string;
}

export interface GenerateInsightsResponse {
  insightIds?: string[];
  count?: number;
}

export interface GeneratePostsResponse {
  count?: number;
  postIds?: string[];
}

// =====================================================================
// SIDEBAR AND CALENDAR TYPES
// =====================================================================

export interface SidebarCounts {
  transcripts: number;
  insights: number;
  posts: number;
}

export interface CalendarEvent {
  id: string;
  postId: string;
  title: string;
  scheduledTime: string | Date;
  platform: string;
  content: string;
  status: string;
  retryCount: number;
  lastAttempt?: string | null;
  error?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// =====================================================================
// TRANSCRIPTION TYPES
// =====================================================================

export interface DeepgramTranscriptionResult {
  transcript: string;
  confidence: number;
  wordCount: number;
  processingTime: number;
  metadata: {
    model: string;
    confidence: number;
    word_count: number;
    processing_time: number;
    audio_format: string;
    sample_rate: number;
    channels: number;
    file_size: number;
  };
}

// Re-export enums for convenience
export {
  EntityType,
  Platform,
  ScheduledPostStatus,
  TranscriptStatus,
  InsightStatus,
  PostStatus,
  QueueJobStatus,
  JobType,
  SourceType,
  PostType,
  // Additional exports for queue types
  isSocialPlatform,
  platformToSocialPlatform,
  socialPlatformToPlatform
} from './enums';

// Re-export type aliases
export type { SocialPlatform } from './enums';