/**
 * Event emitted when an insight is approved
 */
export interface InsightApprovedEvent {
  insightId: string;
  platforms: string[];
  approvedAt: Date;
  approvedBy: string;
}

/**
 * Event emitted when post generation starts for an insight
 */
export interface PostsGenerationStartedEvent {
  insightId: string;
  jobId: string;
  platforms: string[];
}

/**
 * Event emitted when post generation fails
 */
export interface PostsGenerationFailedEvent {
  insightId: string;
  error: string;
  platforms: string[];
}

// Event name constants
export const INSIGHT_EVENTS = {
  APPROVED: 'insight.approved',
  POSTS_GENERATION_STARTED: 'posts.generation.started',
  POSTS_GENERATION_FAILED: 'posts.generation.failed',
} as const;