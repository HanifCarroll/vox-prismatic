// Job data types for different queues

export interface PublishJobData {
  scheduledPostId: string;
  postId: string;
  platform: 'linkedin' | 'x';
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
  platform: 'linkedin' | 'x';
}

// Future job types for content processing
export interface ProcessTranscriptJobData {
  transcriptId: string;
  audioFilePath?: string;
  userId: string;
}

export interface ExtractInsightsJobData {
  transcriptId: string;
  content: string;
  userId: string;
}

export interface GeneratePostsJobData {
  insightId: string;
  platforms: ('linkedin' | 'x')[];
  userId: string;
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
  | ProcessTranscriptJobData 
  | ExtractInsightsJobData 
  | GeneratePostsJobData
  | TrackEventJobData;

export type JobResult = PublishJobResult | any;