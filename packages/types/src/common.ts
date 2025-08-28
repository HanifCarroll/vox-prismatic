/**
 * Common shared types across all applications
 * Functional programming patterns and utility types
 */

// =====================================================================
// FUNCTIONAL PATTERNS
// =====================================================================

export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// Helper functions for Result type
export const ok = <T>(data: T): Result<T> => ({ success: true, data });
export const err = <E = Error>(error: E): Result<never, E> => ({ success: false, error });

// =====================================================================
// ENUMS AND CONSTANTS
// =====================================================================

export type Platform = 'linkedin' | 'x';

export type PostType = 'Problem' | 'Proof' | 'Framework' | 'Contrarian Take' | 'Mental Model';

export type TranscriptStatus = 'raw' | 'cleaned';

export type InsightStatus = 'draft' | 'needs_review' | 'approved' | 'rejected' | 'archived';

export type PostStatus = 'draft' | 'needs_review' | 'approved' | 'scheduled' | 'published' | 'failed' | 'archived';

export type ScheduledPostStatus = 'pending' | 'published' | 'failed' | 'cancelled';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type JobType = 'clean_transcript' | 'extract_insights' | 'generate_posts';

export type SourceType = 'recording' | 'upload' | 'manual' | 'youtube' | 'podcast' | 'article';

export type EntityType = 'transcript' | 'insight' | 'post' | 'scheduled_post';

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
}

export interface InsightView {
  id: string;
  cleanedTranscriptId: string;
  title: string;
  summary: string;
  verbatimQuote: string;
  category: string;
  postType: PostType;
  scores: {
    urgency: number;
    relatability: number;
    specificity: number;
    authority: number;
    total: number;
  };
  status: InsightStatus;
  processingDurationMs?: number;
  estimatedTokens?: number;
  estimatedCost?: number;
  createdAt: Date;
  updatedAt: Date;
  // Joined data
  transcriptTitle?: string;
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
  scheduledTime: string;
  platform: string;
  content: string;
  status: string;
  retryCount: number;
  lastAttempt?: string | null;
  error?: string | null;
}