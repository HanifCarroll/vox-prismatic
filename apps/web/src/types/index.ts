/**
 * Centralized type definitions for the content creation app
 * Single source of truth for all entity types
 */

// Platforms (only LinkedIn and X)
export type Platform = 'linkedin' | 'x';

// Post statuses
export type PostStatus = 'draft' | 'needs_review' | 'approved' | 'scheduled' | 'published' | 'failed' | 'archived';

// Insight statuses  
export type InsightStatus = 'draft' | 'needs_review' | 'approved' | 'rejected' | 'archived';

// Transcript statuses
export type TranscriptStatus = 'raw' | 'processing' | 'cleaned' | 'insights_generated' | 'posts_created' | 'error';

// Post types for insights
export type PostType = 'Problem' | 'Proof' | 'Framework' | 'Contrarian Take' | 'Mental Model';

// Simplified Post (remove overengineered fields)
export interface PostView {
  id: string;
  insightId: string;
  title: string;
  content: string;              // Just the full post text
  platform: Platform;          // Only linkedin or x
  status: PostStatus;
  characterCount?: number;      // Auto-calculated from content.length
  createdAt: Date;
  updatedAt: Date;
  
  // Related data (from joins)
  insightTitle?: string;
  transcriptTitle?: string;
}

// Insight view (keep existing structure - not overengineered)
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
  createdAt: Date;
  updatedAt: Date;
  transcriptTitle?: string;
}

// Transcript view (keep existing structure - not overengineered)
export interface TranscriptView {
  id: string;
  title: string;
  rawContent: string;
  cleanedContent?: string;
  status: TranscriptStatus;
  sourceType: 'upload' | 'manual' | 'recording';
  fileName?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

// Dashboard data types
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
}

// Dashboard Stats (for DashboardWidgets)
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
}

// Activity types for dashboard widgets
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

// Bulk operation response types
export interface BulkInsightsResponse {
  postsGenerated?: number;
  insightsProcessed: number;
  action: string;
}

// Generate insights response
export interface GenerateInsightsResponse {
  insightIds?: string[];
  count?: number;
}

// Generate posts response
export interface GeneratePostsResponse {
  count?: number;
  postIds?: string[];
}

// Sidebar-specific types
export interface SidebarCounts {
  insights: number;
  posts: number;
}

// API response wrapper
export type ApiResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  data?: T;
};

// Re-export scheduler types
export * from './scheduler';