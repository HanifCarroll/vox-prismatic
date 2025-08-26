/**
 * Database types for Next.js web app
 * These mirror the exact types from the database package for consistency
 * The web app communicates with the API server instead of directly with the database
 */

// Base filter interface
export interface BaseFilter {
  limit?: number;
  offset?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Result pattern from database package
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Post Type enum
export type PostType = 'Problem' | 'Proof' | 'Framework' | 'Contrarian Take' | 'Mental Model';

// Transcript Types
export interface TranscriptView {
  id: string;
  title: string;
  status: 'raw' | 'processing' | 'cleaned' | 'insights_generated' | 'posts_created' | 'error';
  sourceType: 'recording' | 'upload' | 'manual' | 'youtube' | 'podcast' | 'article';
  sourceUrl?: string;
  fileName?: string;
  rawContent: string;
  cleanedContent?: string;
  wordCount: number;
  duration?: number; // In seconds for audio/video
  createdAt: Date;
  updatedAt: Date;
}

export interface TranscriptFilter extends BaseFilter {
  status?: 'raw' | 'processing' | 'cleaned' | 'insights_generated' | 'posts_created' | 'error' | 'all';
  sourceType?: 'recording' | 'upload' | 'manual' | 'youtube' | 'podcast' | 'article';
}

// Insight Types
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
  status: "draft" | "needs_review" | "approved" | "rejected" | "archived";
  processingDurationMs?: number;
  estimatedTokens?: number;
  estimatedCost?: number;
  createdAt: Date;
  updatedAt: Date;
  transcriptTitle?: string;
}

export interface InsightFilter extends BaseFilter {
  status?: 'draft' | 'needs_review' | 'approved' | 'rejected' | 'archived' | 'all';
  postType?: PostType;
  category?: string;
  minScore?: number;
  maxScore?: number;
  transcriptId?: string;
}

// Post Types
export interface PostView {
  id: string;
  insightId: string;
  title: string;
  content: string;
  platform: "linkedin" | "x";
  status: "draft" | "needs_review" | "approved" | "scheduled" | "published" | "failed" | "archived";
  characterCount?: number;
  createdAt: Date;
  updatedAt: Date;
  insightTitle?: string;
  transcriptTitle?: string;
}

export interface PostFilter extends BaseFilter {
  status?: 'draft' | 'needs_review' | 'approved' | 'scheduled' | 'published' | 'failed' | 'archived' | 'all';
  platform?: 'linkedin' | 'x' | 'all';
  insightId?: string;
}

// Scheduled Post Types
export interface ScheduledPostView {
  id: string;
  postId: string;
  platform: "linkedin" | "x";
  content: string;
  scheduledTime: string;
  status: "pending" | "published" | "failed" | "cancelled";
  retryCount: number;
  lastAttempt?: string | null;
  errorMessage?: string | null;
  externalPostId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduledPostFilter extends BaseFilter {
  status?: 'pending' | 'published' | 'failed' | 'cancelled' | 'all';
  platform?: 'linkedin' | 'x' | 'all';
  scheduledAfter?: string;
  scheduledBefore?: string;
  postId?: string;
}

// Calendar Event interface (for scheduler)
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

// Stats Types
export interface StatsResult {
  total: number;
  byStatus: Record<string, number>;
}

export interface ScheduledPostStats extends StatsResult {
  byPlatform: Record<string, number>;
  upcoming24h: number;
}

// API Response Types
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