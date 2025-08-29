/**
 * Pipeline Management Types
 * Types for content processing pipeline orchestration
 */

export enum BlockingItemType {
  INSIGHT_REVIEW = 'insight_review',
  POST_REVIEW = 'post_review',
  MANUAL_INTERVENTION = 'manual_intervention',
  ERROR = 'error'
}

export enum PipelineStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum PipelineStage {
  TRANSCRIPT_CLEANING = 'transcript_cleaning',
  INSIGHT_EXTRACTION = 'insight_extraction',
  POST_GENERATION = 'post_generation',
  COMPLETED = 'completed'
}

export interface CreatePipelineOptions {
  transcriptId: string;
  template?: string;
  options?: {
    autoApprove?: boolean;
    platforms?: ('linkedin' | 'x')[];
    skipInsightReview?: boolean;
    skipPostReview?: boolean;
    maxRetries?: number;
  };
  metadata?: Record<string, any>;
}

export interface PipelineProgress {
  pipelineId: string;
  transcriptId: string;
  status: PipelineStatus;
  currentStage: PipelineStage;
  progress: number;
  stages: {
    name: PipelineStage;
    status: string;
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
  }[];
  startedAt?: Date;
  completedAt?: Date;
  estimatedCompletion?: Date;
  metadata?: Record<string, any>;
}

export interface PipelineHistory {
  pipelineId: string;
  transcriptId: string;
  status: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  stages: {
    name: string;
    status: string;
    duration?: number;
  }[];
}

export interface BlockingItem {
  id: string;
  type: BlockingItemType;
  entityId: string;
  entityType: 'transcript' | 'insight' | 'post';
  description: string;
  requiredAction: string;
  createdAt: Date;
}

export interface ManualIntervention {
  pipelineId: string;
  entityId: string;
  entityType: string;
  reason: string;
  requiredAction: string;
  metadata?: Record<string, any>;
}