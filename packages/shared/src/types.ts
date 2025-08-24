// Core domain types - aligned with database schema
export type TranscriptStatus = 'raw' | 'processing' | 'cleaned' | 'error';
export type TranscriptSourceType = 'recording' | 'upload' | 'manual';

// This matches the database TranscriptRecord exactly
export interface Transcript {
  id: string;
  title: string;
  content: string;
  status: TranscriptStatus;
  sourceType: TranscriptSourceType;
  durationSeconds?: number;
  filePath?: string;
  metadata?: Record<string, any>;
  createdAt: string; // ISO string from database
  updatedAt: string; // ISO string from database
}

// For the web UI, we'll create a unified view type that combines transcript and cleaned_transcript
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
  metadata?: {
    author?: string;
    publishedAt?: Date;
    tags?: string[];
    description?: string;
  };
}

export interface InsightPage {
  id: string;
  title: string;
  score: number;
  status: string;
  postType: PostType | string;
  category?: string;
  summary?: string;
  verbatimQuote?: string;
  transcriptId?: string;
}

// Keep for backward compatibility during migration
export interface TranscriptPage {
  id: string;
  title: string;
  status: string;
}

export interface CleanedTranscriptPage {
  id: string;
  title: string;
  status: string;  // "Ready", "Processed", "Error"
  sourceTranscriptId: string;
  createdTime: string;
}

export interface PostPage {
  id: string;
  title: string;
  platform: string;
  status: string;
  sourceInsightTitle?: string;
  createdTime: string;
  content: string;
  softCTA?: string;
  directCTA?: string;
  scheduledDate?: string;
}

export type PostType = 'Problem' | 'Proof' | 'Framework' | 'Contrarian Take' | 'Mental Model';

export interface Insight {
  title: string;
  quote: string;
  summary: string;
  category: string;
  scores: {
    urgency: number;
    relatability: number;
    specificity: number;
    authority: number;
    total: number;
  };
  postType: PostType | string;
}

export interface GeneratedPost {
  linkedinPost: {
    hook: string;
    body: string;
    cta: string;
    full: string;  // Complete post with hook + body + CTA
  };
  xPost: {
    hook: string;
    body: string;
    cta: string;
    full: string;  // Complete post with hook + body + CTA
  };
}

export interface ProcessingMetrics {
  transcriptId: string;
  transcriptTitle: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  contentLength: number;
  cleaningDuration: number;
  insightExtractionDuration: number;
  insightsGenerated: number;
  estimatedTokensUsed: number;
  estimatedCost: number;
  success: boolean;
  error?: string;
}

export interface PostGenerationMetrics {
  insightId: string;
  insightTitle: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  contentLength: number;
  estimatedTokensUsed: number;
  estimatedCost: number;
  success: boolean;
  error?: string;
}

// Configuration types
export interface AIConfig {
  apiKey: string;
  flashModel: string;
  proModel: string;
}

export interface NotionConfig {
  apiKey: string;
  transcriptsDb: string;
  cleanedTranscriptsDb: string;
  insightsDb: string;
  postsDb: string;
}

export interface PostizConfig {
  apiKey: string;
  baseUrl: string;
}

export interface AppConfig {
  notion: NotionConfig;
  ai: AIConfig;
  postiz: PostizConfig;
}

// Postiz API types
export interface PostizIntegration {
  id: string;
  identifier: string; // 'linkedin', 'x', etc. (actual API field name)
  name: string;
  picture?: string;
  disabled?: boolean;
  profile?: string;
}

export interface PostizPost {
  id?: string;
  content: string;
  publishDate: string;
  releaseURL?: string;
  state: 'QUEUE' | 'PUBLISHED' | 'ERROR' | 'DRAFT';
  integration: PostizIntegration;
}

export interface PostizCreatePostRequest {
  type: 'draft' | 'schedule' | 'now';
  date?: string;
  posts: Array<{
    integration: { id: string };
    value: Array<{
      content: string;
      id?: string;
      image?: Array<{ id: string; path: string }>;
    }>;
    group?: string;
    settings?: Record<string, any>;
  }>;
}

export interface PostizListResponse {
  posts: PostizPost[];
}

// Result types for error handling
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// CLI types
export interface CLIOption {
  key: string;
  label: string;
  description: string;
  action: () => Promise<void>;
}

export interface UserSelection {
  choice: string;
  items: string[];
}

// LinkedIn API types
export interface LinkedInConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  vanityName?: string;
}

export interface LinkedInPage {
  id: string;
  name: string;
  vanityName?: string;
  logoUrl?: string;
}

export interface LinkedInPostData {
  content: string;
  visibility: 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN_MEMBERS';
  author?: string; // Person or organization URN
  images?: string[]; // Asset URNs for uploaded images
  videos?: string[]; // Asset URNs for uploaded videos
}

export interface LinkedInPost {
  id: string;
  content: string;
  publishedAt: string;
  visibility: string;
  author: string;
  socialMetadata?: {
    reactionCount: number;
    commentCount: number;
    shareCount: number;
  };
}

export interface LinkedInAnalytics {
  postId: string;
  impressions: number;
  clicks: number;
  reactions: number;
  comments: number;
  shares: number;
  engagementRate: number;
}

export interface LinkedInMediaUpload {
  asset: string; // Asset URN
  uploadUrl: string;
}

// X/Twitter API types
export interface XConfig {
  apiKey: string;          // Consumer Key
  apiSecret: string;       // Consumer Secret  
  clientId: string;        // OAuth 2.0 Client ID
  clientSecret: string;    // OAuth 2.0 Client Secret
  accessToken?: string;
  refreshToken?: string;
  tokenSecret?: string;    // For OAuth 1.1 (media uploads)
}

export interface XProfile {
  id: string;
  username: string;
  name: string;
  profileImageUrl?: string;
  verified: boolean;
  followersCount: number;
  followingCount: number;
}

export interface XTweetData {
  text: string;
  replyTo?: string;        // Tweet ID to reply to
  quoteTweetId?: string;   // Tweet ID to quote
  mediaIds?: string[];     // Media attachment IDs
  pollOptions?: string[];  // Poll options
}

export interface XTweet {
  id: string;
  text: string;
  createdAt: string;
  authorId: string;
  publicMetrics?: {
    retweetCount: number;
    likeCount: number;
    replyCount: number;
    quoteCount: number;
  };
  contextAnnotations?: any[];
  entities?: any;
}

export interface XAnalytics {
  tweetId: string;
  impressions: number;
  engagements: number;
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  engagementRate: number;
}

export interface XMediaUpload {
  mediaId: string;
  mediaKey: string;
  size: number;
  type: string;
}

// Scheduled post types (shared across platforms)
export interface ScheduledPost {
  id: string;
  platform: 'linkedin' | 'x' | 'postiz';
  content: string;
  scheduledTime: Date;
  status: 'pending' | 'published' | 'failed' | 'cancelled';
  retryCount: number;
  lastAttempt?: Date;
  error?: string;
  metadata?: {
    originalPostId?: string;
    authorUrn?: string;
    visibility?: string;
    images?: string[];
    videos?: string[];
    replyTo?: string;
    quoteTweetId?: string;
    mediaIds?: string[];
  };
}