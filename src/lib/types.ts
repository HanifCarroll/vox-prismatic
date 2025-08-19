// Core domain types
export interface TranscriptPage {
  id: string;
  title: string;
  status: string;
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
  hooks: string[];
}

export interface GeneratedPost {
  linkedinPost: string;
  xPost: string;
  softCTA: string;
  directCTA: string;
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
  providerIdentifier: string; // 'linkedin', 'x', etc.
  name: string;
  picture?: string;
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