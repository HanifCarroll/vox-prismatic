// Job data types for different queues

import type { SocialPlatform } from '@content-creation/types';

export interface PublishJobData {
  scheduledPostId: string;
  postId: string;
  platform: SocialPlatform;
  content: string;
  credentials: {
    accessToken: string;
    clientId?: string;
    clientSecret?: string;
  };
  metadata?: {
    retryCount?: number;
    originalScheduledTime?: Date;
    userId?: string;
  };
}

export interface PublishJobResult {
  success: boolean;
  externalPostId?: string;
  publishedAt: Date;
  error?: string;
  platform: SocialPlatform;
}

// Content processing result types
export interface CleanTranscriptJobResult {
  success: boolean;
  transcriptId: string;
  cleanedContent?: string;
  wordCount?: number;
  processingDurationMs?: number;
  error?: string;
}

export interface ExtractInsightsJobResult {
  success: boolean;
  transcriptId: string;
  insightsCreated: number;
  insightIds: string[];
  processingDurationMs?: number;
  error?: string;
}

export interface GeneratePostsJobResult {
  success: boolean;
  insightId: string;
  postsCreated: number;
  postIds: string[];
  platforms: SocialPlatform[];
  processingDurationMs?: number;
  error?: string;
}

// Content processing job types
export interface CleanTranscriptJobData {
  transcriptId: string;
  rawContent: string;
  userId?: string;
  metadata?: {
    title?: string;
    sourceType?: string;
    retryCount?: number;
  };
}

export interface ExtractInsightsJobData {
  transcriptId: string;
  cleanedContent: string;
  userId?: string;
  metadata?: {
    title?: string;
    retryCount?: number;
  };
}

export interface GeneratePostsJobData {
  insightId: string;
  insightContent: string;
  platforms: SocialPlatform[];
  userId?: string;
  metadata?: {
    retryCount?: number;
    category?: string;
  };
}

// Analytics job types
export interface TrackEventJobData {
  eventType: string;
  userId?: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

export type JobData = 
  | PublishJobData 
  | CleanTranscriptJobData
  | ExtractInsightsJobData 
  | GeneratePostsJobData
  | TrackEventJobData;

export type JobResult = 
  | PublishJobResult 
  | CleanTranscriptJobResult
  | ExtractInsightsJobResult
  | GeneratePostsJobResult;