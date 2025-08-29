/**
 * Pipeline Context Types for XState v5 Pipeline State Machine
 * Defines the context structure for tracking pipeline state and progress
 */

import { PipelineState } from '@content-creation/types';

export interface PipelineStep {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
  metadata?: Record<string, any>;
}

export interface BlockingItem {
  id: string;
  type: 'insight_review' | 'post_review' | 'manual_intervention';
  entityId: string;
  entityType: 'insight' | 'post' | 'transcript';
  description: string;
  priority?: 'high' | 'medium' | 'low';
  createdAt: Date;
  startedAt?: Date;  // When user started reviewing
  completedAt?: Date; // When user completed review
  completedBy?: string; // Who completed the review
  action?: 'approved' | 'rejected' | 'resolved' | 'skipped';
  metadata?: Record<string, any>;
}

export interface PipelineOptions {
  autoApprove?: boolean;
  platforms?: ('linkedin' | 'x')[];
  skipInsightReview?: boolean;
  skipPostReview?: boolean;
  maxRetries?: number;
  parallelInsights?: number;
  parallelPosts?: number;
  template?: PipelineTemplate;
  notifyOnCompletion?: boolean;
  notifyOnFailure?: boolean;
}

export type PipelineTemplate = 
  | 'standard'      // Full pipeline: transcript → insights → posts → schedule
  | 'fast_track'    // Auto-approve all, minimal review
  | 'podcast'       // Optimized for podcast content
  | 'video'         // Optimized for video content
  | 'article'       // Optimized for article content
  | 'custom';       // Custom pipeline configuration

export interface InsightProcessingState {
  insightId: string;
  status: 'pending' | 'extracting' | 'reviewing' | 'approved' | 'rejected' | 'failed';
  score?: number;
  retryCount: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface PostProcessingState {
  postId: string;
  insightId: string;
  platform: 'linkedin' | 'x';
  status: 'pending' | 'generating' | 'reviewing' | 'approved' | 'rejected' | 'scheduled' | 'failed';
  retryCount: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface PipelineMetrics {
  transcriptProcessingTime?: number;
  insightExtractionTime?: number;
  averageInsightReviewTime?: number;
  postGenerationTime?: number;
  averagePostReviewTime?: number;
  totalProcessingTime?: number;
  successRate?: number;
  failureRate?: number;
}

export interface PipelineContext {
  // Core identifiers
  pipelineId: string;
  transcriptId: string;
  
  // Entity tracking
  insightIds: string[];
  postIds: string[];
  
  // Processing states for parallel tracking
  insights: Map<string, InsightProcessingState>;
  posts: Map<string, PostProcessingState>;
  
  // Step tracking
  currentStep: string | null;
  steps: PipelineStep[];
  totalSteps: number;
  completedSteps: number;
  failedSteps: string[];
  successfulSteps: string[];
  
  // Progress and timing
  progress: number; // 0-100
  startedAt: Date | null;
  pausedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  estimatedCompletion: Date | null;
  actualDuration: number | null;
  
  // Configuration
  options: PipelineOptions;
  template: PipelineTemplate;
  
  // Error handling
  lastError: string | null;
  retryCount: number;
  maxRetries: number;
  
  // Human intervention tracking
  blockingItems: BlockingItem[];
  
  // Performance metrics
  metrics: PipelineMetrics;
  
  // Additional metadata
  metadata: Record<string, any>;
}

/**
 * Pipeline state values now imported from centralized types
 */
// PipelineState enum moved to @content-creation/types

/**
 * Helper type for pipeline state transitions
 */
export type PipelineStateValue = 
  | PipelineState.IDLE
  | PipelineState.INITIALIZING
  | PipelineState.CLEANING_TRANSCRIPT
  | PipelineState.EXTRACTING_INSIGHTS
  | PipelineState.REVIEWING_INSIGHTS
  | PipelineState.GENERATING_POSTS
  | PipelineState.REVIEWING_POSTS
  | PipelineState.READY_TO_SCHEDULE
  | PipelineState.SCHEDULING
  | PipelineState.COMPLETED
  | PipelineState.PARTIALLY_COMPLETED
  | PipelineState.FAILED
  | PipelineState.PAUSED
  | PipelineState.CANCELLED;

/**
 * Factory function to create initial pipeline context
 */
export function createInitialPipelineContext(
  pipelineId: string,
  transcriptId: string,
  options: Partial<PipelineOptions> = {}
): PipelineContext {
  const defaultOptions: PipelineOptions = {
    autoApprove: false,
    platforms: ['linkedin', 'x'],
    skipInsightReview: false,
    skipPostReview: false,
    maxRetries: 3,
    parallelInsights: 3,
    parallelPosts: 5,
    template: 'standard',
    notifyOnCompletion: true,
    notifyOnFailure: true,
    ...options
  };

  return {
    pipelineId,
    transcriptId,
    insightIds: [],
    postIds: [],
    insights: new Map(),
    posts: new Map(),
    currentStep: null,
    steps: [],
    totalSteps: 0,
    completedSteps: 0,
    failedSteps: [],
    successfulSteps: [],
    progress: 0,
    startedAt: null,
    pausedAt: null,
    completedAt: null,
    failedAt: null,
    estimatedCompletion: null,
    actualDuration: null,
    options: defaultOptions,
    template: defaultOptions.template || 'standard',
    lastError: null,
    retryCount: 0,
    maxRetries: defaultOptions.maxRetries || 3,
    blockingItems: [],
    metrics: {},
    metadata: {}
  };
}

/**
 * Helper to calculate pipeline progress percentage
 */
export function calculateProgress(context: PipelineContext): number {
  if (context.totalSteps === 0) return 0;
  return Math.round((context.completedSteps / context.totalSteps) * 100);
}

/**
 * Helper to determine if pipeline can be retried
 */
export function canRetryPipeline(context: PipelineContext): boolean {
  return context.retryCount < context.maxRetries;
}

/**
 * Helper to check if pipeline has blocking items
 */
export function hasBlockingItems(context: PipelineContext): boolean {
  return context.blockingItems.length > 0;
}

/**
 * Helper to get active (non-completed) steps
 */
export function getActiveSteps(context: PipelineContext): PipelineStep[] {
  return context.steps.filter(step => 
    step.status === 'in_progress' || step.status === 'pending'
  );
}