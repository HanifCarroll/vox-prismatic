// TypeScript interfaces matching backend DTOs

// Enums matching backend
export enum ProjectStage {
  RawContent = 'RawContent',
  ProcessingContent = 'ProcessingContent',
  InsightsReady = 'InsightsReady',
  InsightsApproved = 'InsightsApproved',
  PostsGenerated = 'PostsGenerated',
  PostsApproved = 'PostsApproved',
  Scheduled = 'Scheduled',
  Publishing = 'Publishing',
  Published = 'Published',
  Archived = 'Archived'
}

export enum SocialPlatform {
  LinkedIn = 'LinkedIn',
  Twitter = 'Twitter',
  Facebook = 'Facebook',
  Instagram = 'Instagram'
}

export enum PostStatus {
  Draft = 'Draft',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Scheduled = 'Scheduled',
  Published = 'Published',
  Failed = 'Failed',
  Archived = 'Archived'
}

export enum InsightStatus {
  Draft = 'Draft',
  Approved = 'Approved',
  Rejected = 'Rejected'
}

export enum TranscriptStatus {
  Pending = 'Pending',
  Processing = 'Processing',
  Processed = 'Processed',
  Failed = 'Failed'
}

export enum ScheduledPostStatus {
  Pending = 'Pending',
  Processing = 'Processing',
  Published = 'Published',
  Failed = 'Failed',
  Cancelled = 'Cancelled',
  Republishing = 'Republishing',
  Retry = 'Retry'
}

export enum ProjectActivityType {
  StageChanged = 'StageChanged',
  AutomationTriggered = 'AutomationTriggered',
  InsightsReviewed = 'InsightsReviewed',
  InsightsRejected = 'InsightsRejected',
  PostsReviewed = 'PostsReviewed',
  PostsRejected = 'PostsRejected',
  PostsScheduled = 'PostsScheduled',
  PublishResult = 'PublishResult',
  PublishTriggered = 'PublishTriggered',
  ProjectCreated = 'ProjectCreated',
  ProjectArchived = 'ProjectArchived',
  ProjectRestored = 'ProjectRestored'
}

// Project DTOs
export interface AutoApprovalSettings {
  autoApproveInsights: boolean;
  minInsightScore: number;
  autoGeneratePosts: boolean;
  autoSchedulePosts: boolean;
}

export interface PublishingSchedule {
  preferredDays: string[];
  preferredTime: string;
  timeZone: string;
  minimumInterval: number;
}

export interface ProjectSummary {
  insightsTotal: number;
  insightsApproved: number;
  postsTotal: number;
  postsScheduled: number;
  postsPublished: number;
}

export interface TranscriptSummary {
  id: string;
  title: string;
  status: TranscriptStatus;
  wordCount: number;
  duration?: number;
}

export interface InsightSummary {
  id: string;
  title: string;
  category: string;
  postType: string;
  totalScore: number;
  status: InsightStatus;
}

export interface PostSummary {
  id: string;
  insightId: string;
  title: string;
  platform: SocialPlatform;
  status: PostStatus;
  characterCount?: number;
}

export interface ScheduledPostSummary {
  id: string;
  postId: string;
  platform: SocialPlatform;
  scheduledTime: string;
  status: ScheduledPostStatus;
}

export interface ProjectActivity {
  id: string;
  projectId: string;
  activityType: ProjectActivityType;
  description?: string;
  metadata?: string;
  occurredAt: string;
  userId?: string;
}

// Main Project DTOs
export interface ContentProjectDto {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  sourceType: string;
  sourceUrl?: string;
  fileName?: string;
  currentStage: ProjectStage;
  overallProgress: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt?: string;
  autoApprovalSettings: AutoApprovalSettings;
  publishingSchedule: PublishingSchedule;
  targetPlatforms: SocialPlatform[];
  summary: ProjectSummary;
  transcriptId?: string;
  insightIds: string[];
  postIds: string[];
  scheduledPostIds: string[];
}

export interface ContentProjectDetailDto extends ContentProjectDto {
  transcript?: TranscriptSummary;
  insights: InsightSummary[];
  posts: PostSummary[];
  scheduledPosts: ScheduledPostSummary[];
  recentActivities: ProjectActivity[];
}

export interface CreateProjectDto {
  title: string;
  description?: string;
  tags?: string[];
  sourceType: string;
  sourceUrl?: string;
  fileName?: string;
  transcriptContent?: string;
  autoApprovalSettings?: AutoApprovalSettings;
  publishingSchedule?: PublishingSchedule;
  targetPlatforms?: SocialPlatform[];
}

export interface UpdateProjectDto {
  title?: string;
  description?: string;
  tags?: string[];
  autoApprovalSettings?: AutoApprovalSettings;
  publishingSchedule?: PublishingSchedule;
}

export interface ProjectFilter {
  stage?: string;
  tags?: string[];
  searchTerm?: string;
  createdAfter?: string;
  createdBefore?: string;
  createdBy?: string;
  hasScheduledPosts?: boolean;
  hasPublishedPosts?: boolean;
  sortBy?: string;
  sortDescending?: boolean;
  page?: number;
  pageSize?: number;
}

// Insight DTOs
export interface InsightDto {
  id: string;
  projectId: string;
  title: string;
  content: string;
  summary: string;
  category: string;
  postType: string;
  verbatimQuote: string;
  tags: string[];
  confidenceScore: number;
  urgencyScore: number;
  relatabilityScore: number;
  specificityScore: number;
  authorityScore: number;
  totalScore: number;
  status: InsightStatus;
  rejectionReason?: string;
  metadata?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApproveInsightDto {
  reviewNote?: string;
}

export interface RejectInsightsDto {
  insightIds: string[];
  rejectionReason?: string;
}

// Post DTOs
export interface PostDto {
  id: string;
  projectId: string;
  insightId: string;
  title: string;
  content: string;
  hashtags?: string[];
  platform: SocialPlatform;
  characterCount: number;
  status: PostStatus;
  rejectionReason?: string;
  metadata?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovePostDto {
  reviewNote?: string;
}

export interface RejectPostsDto {
  postIds: string[];
  rejectionReason?: string;
  regenerateFromInsights?: boolean;
}

export interface GeneratePostsDto {
  insightIds?: string[];
  platforms?: SocialPlatform[];
  generateVariations?: boolean;
}

// Publishing DTOs
export interface ScheduleItem {
  postId: string;
  scheduledTime: string;
}

export interface SchedulePostsDto {
  postIds?: string[];
  startDate?: string;
  intervalHours?: number;
  useOptimalTiming?: boolean;
}

export interface PublishNowDto {
  postIds: string[];
  publishToAllPlatforms?: boolean;
}

// Dashboard DTOs
export interface DashboardDto {
  overview: ProjectOverviewDto;
  actionItems: ActionItemDto[];
  recentActivities: RecentActivityDto[];
}

export interface ProjectOverviewDto {
  totalProjects: number;
  projectsByStage: Record<string, number>;
  insightsNeedingReview: number;
  postsNeedingReview: number;
  postsReadyToSchedule: number;
  postsPublishedToday: number;
}

export interface ActionItemDto {
  projectId: string;
  projectTitle: string;
  actionType: string;
  description: string;
  count: number;
}

export interface RecentActivityDto {
  projectId: string;
  projectTitle: string;
  activityType: string;
  description: string;
  occurredAt: string;
}

// Transcript DTOs
export interface TranscriptDto {
  id: string;
  projectId: string;
  title: string;
  rawContent: string;
  cleanedContent?: string;
  status: TranscriptStatus;
  sourceType: string;
  sourceUrl?: string;
  fileName?: string;
  wordCount: number;
  duration?: number;
  processingDurationMs?: number;
  estimatedTokens?: number;
  estimatedCost?: number;
  queueJobId?: string;
  errorMessage?: string;
  failedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTranscriptDto {
  title: string;
  rawContent: string;
  sourceType?: string;
  sourceUrl?: string;
  fileName?: string;
  duration?: number;
  projectId?: string;
}

export interface UpdateTranscriptDto {
  title?: string;
  rawContent?: string;
  cleanedContent?: string;
  processingDurationMs?: number;
  estimatedTokens?: number;
  estimatedCost?: number;
  queueJobId?: string;
  errorMessage?: string;
  failedAt?: string;
}

// Auth DTOs
export interface UserDto {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

// Processing Job Response
export interface ProcessingJobDto {
  success: boolean;
  message: string;
  jobIds?: string[];
  queuedCount?: number;
}

// List response wrappers
export interface ListProjectsResponse {
  isSuccess: boolean;
  projects?: ContentProjectDto[];
  totalCount?: number;
  page?: number;
  pageSize?: number;
  error?: string;
}