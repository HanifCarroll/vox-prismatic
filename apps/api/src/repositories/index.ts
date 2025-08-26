/**
 * Repository Barrel Export
 * Provides convenient access to all repository classes
 */

export { BaseRepository } from './base-repository';
export { TranscriptRepository } from './transcript-repository';
export { InsightRepository, type InsightView } from './insight-repository';
export { PostRepository, type PostView } from './post-repository';
export { 
  ScheduledPostRepository, 
  type ScheduledPostView, 
  type CalendarEvent 
} from './scheduled-post-repository';

// Re-export types from schema for convenience
export type {
  Transcript,
  NewTranscript,
  Insight,
  NewInsight,
  Post,
  NewPost,
  ScheduledPost,
  NewScheduledPost
} from '../lib/db-schema';

// Create data types (aliases for insert types)
export type CreateTranscriptData = NewTranscript;
export type CreateInsightData = NewInsight;
export type CreatePostData = NewPost;

// Re-export filter types
export type { TranscriptFilter, InsightFilter, PostFilter, ScheduledPostFilter } from '../types/db-filters';

// View types for UI components (transformed from DB types)
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