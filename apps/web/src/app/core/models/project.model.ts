export enum ProjectStage {
  RAW_CONTENT = 'RAW_CONTENT',
  PROCESSING_CONTENT = 'PROCESSING_CONTENT',
  INSIGHTS_READY = 'INSIGHTS_READY',
  INSIGHTS_APPROVED = 'INSIGHTS_APPROVED',
  POSTS_GENERATED = 'POSTS_GENERATED',
  POSTS_APPROVED = 'POSTS_APPROVED',
  SCHEDULED = 'SCHEDULED',
  PUBLISHING = 'PUBLISHING',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

export enum SourceType {
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  TEXT = 'TEXT',
  URL = 'URL'
}

export enum Platform {
  LINKEDIN = 'LINKEDIN'
  // Phase 2: Additional platforms will be added here
}

export interface AutoApprovalSettings {
  autoApproveInsights: boolean;
  minInsightScore: number;
  autoGeneratePosts: boolean;
  autoSchedulePosts: boolean;
}

export interface PublishingSchedule {
  timezone: string;
  preferredTimes: string[];
  daysOfWeek: number[];
  spacing: number;
}

export interface ProjectSummary {
  insightsTotal: number;
  insightsApproved: number;
  postsTotal: number;
  postsScheduled: number;
  postsPublished: number;
}

export interface ContentProject {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  
  sourceType: SourceType;
  sourceUrl?: string;
  fileName?: string;
  filePath?: string;
  
  currentStage: ProjectStage;
  overallProgress: number;
  
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  
  autoApprovalSettings?: AutoApprovalSettings;
  targetPlatforms: Platform[];
  publishingSchedule?: PublishingSchedule;
  
  summary?: ProjectSummary;
  
  transcriptId?: string;
  transcript?: Transcript;
  insights?: Insight[];
  posts?: Post[];
  scheduledPosts?: ScheduledPost[];
}

export interface Transcript {
  id: string;
  projectId: string;
  content: string;
  cleanedContent?: string;
  duration?: number;
  wordCount: number;
  speakerLabels?: string[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Insight {
  id: string;
  projectId: string;
  transcriptId: string;
  content: string;
  quote: string;
  score: number;
  category?: string;
  postType?: string;
  isApproved: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Post {
  id: string;
  projectId: string;
  insightId: string;
  platform: Platform;
  content: string;
  mediaUrls?: string[];
  hashtags?: string[];
  characterCount: number;
  isApproved: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduledPost {
  id: string;
  projectId: string;
  postId: string;
  platform: Platform;
  scheduledFor: Date;
  status: 'PENDING' | 'PUBLISHED' | 'FAILED';
  publishedAt?: Date;
  publishUrl?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessingJob {
  id: string;
  projectId: string;
  type: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress?: number;
  error?: string;
  metadata?: any;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}