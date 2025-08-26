/**
 * Shared filter types for repository queries
 */

export interface BaseFilter {
  limit?: number;
  offset?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TranscriptFilter extends BaseFilter {
  status?: 'raw' | 'processing' | 'cleaned' | 'insights_generated' | 'posts_created' | 'error' | 'all';
  sourceType?: 'recording' | 'upload' | 'manual' | 'youtube' | 'podcast' | 'article';
}

export interface InsightFilter extends BaseFilter {
  status?: 'draft' | 'needs_review' | 'approved' | 'rejected' | 'archived' | 'all';
  postType?: 'Problem' | 'Proof' | 'Framework' | 'Contrarian Take' | 'Mental Model';
  category?: string;
  minScore?: number;
  maxScore?: number;
  transcriptId?: string;
}

export interface PostFilter extends BaseFilter {
  status?: 'draft' | 'needs_review' | 'approved' | 'scheduled' | 'published' | 'failed' | 'archived' | 'all';
  platform?: 'linkedin' | 'x' | 'all';
  insightId?: string;
}

export interface ScheduledPostFilter extends BaseFilter {
  status?: 'pending' | 'published' | 'failed' | 'cancelled' | 'all';
  platform?: 'linkedin' | 'x' | 'all';
  scheduledAfter?: string;
  scheduledBefore?: string;
  postId?: string;
}

export interface StatsResult {
  total: number;
  byStatus: Record<string, number>;
}

export interface ScheduledPostStats extends StatsResult {
  byPlatform: Record<string, number>;
  upcoming24h: number;
}