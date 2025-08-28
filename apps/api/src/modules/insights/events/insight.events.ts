/**
 * Event emitted when an insight state changes
 */
export interface InsightStateChangedEvent {
  insightId: string;
  previousState: string;
  newState: string;
  event: string;
  context: Record<string, any>;
  timestamp: Date;
}

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
 * Event emitted when an insight is rejected
 */
export interface InsightRejectedEvent {
  insightId: string;
  rejectedAt: Date;
  rejectedBy: string;
  reason: string | null;
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

/**
 * Event emitted when insights are extracted from a transcript
 */
export interface InsightExtractedEvent {
  transcriptId: string;
  insightIds: string[];
  count: number;
  timestamp: Date;
}

// Event name constants
export const INSIGHT_EVENTS = {
  STATE_CHANGED: 'insight.state.changed',
  APPROVED: 'insight.approved',
  REJECTED: 'insight.rejected',
  EXTRACTED: 'insight.extracted',
  POSTS_GENERATION_STARTED: 'posts.generation.started',
  POSTS_GENERATION_FAILED: 'posts.generation.failed',
} as const;