import { TranscriptEntity } from '../entities/transcript.entity';
import { TranscriptStatus } from '../dto/update-transcript.dto';

/**
 * Event emitted when a new transcript is uploaded
 */
export interface TranscriptUploadedEvent {
  transcriptId: string;
  transcript: TranscriptEntity;
  fileName?: string;
  fileSize?: number;
  uploadedBy?: string;
  timestamp: Date;
}

/**
 * Event emitted when transcript processing starts
 */
export interface TranscriptProcessingStartedEvent {
  transcriptId: string;
  transcript: TranscriptEntity;
  processingType: 'cleaning' | 'title_generation' | 'insight_extraction';
  queueJobId?: string;
  timestamp: Date;
}

/**
 * Event emitted when transcript processing completes successfully
 */
export interface TranscriptProcessingCompletedEvent {
  transcriptId: string;
  transcript: TranscriptEntity;
  status: string;
  processingType?: 'cleaning' | 'title_generation' | 'insight_extraction';
  queueJobId?: string;
  timestamp: Date;
}

/**
 * Event emitted when transcript processing fails
 */
export interface TranscriptProcessingFailedEvent {
  transcriptId: string;
  transcript?: TranscriptEntity;
  error: string;
  processingType?: 'cleaning' | 'title_generation' | 'insight_extraction';
  queueJobId?: string;
  retryCount?: number;
  timestamp: Date;
}

/**
 * Event emitted when a transcript is cleaned/processed
 */
export interface TranscriptCleanedEvent {
  transcriptId: string;
  transcript: TranscriptEntity;
  originalLength: number;
  cleanedLength: number;
  processingTime: number;
  timestamp: Date;
}

/**
 * Event emitted when transcript title is generated
 */
export interface TranscriptTitleGeneratedEvent {
  transcriptId: string;
  transcript: TranscriptEntity;
  oldTitle?: string;
  newTitle: string;
  timestamp: Date;
}

/**
 * Event emitted when transcript status changes
 */
export interface TranscriptStatusChangedEvent {
  transcriptId: string;
  transcript: TranscriptEntity;
  previousStatus: TranscriptStatus;
  newStatus: TranscriptStatus;
  changedBy?: string;
  reason?: string;
  timestamp: Date;
}

/**
 * Event emitted when a transcript is deleted
 */
export interface TranscriptDeletedEvent {
  transcriptId: string;
  title: string;
  status: TranscriptStatus;
  deletedBy?: string;
  timestamp: Date;
}

/**
 * Event emitted when insights are extracted from a transcript
 */
export interface TranscriptInsightsExtractedEvent {
  transcriptId: string;
  transcript: TranscriptEntity;
  insightCount: number;
  extractionTime: number;
  timestamp: Date;
}

// Event name constants for type safety
export const TRANSCRIPT_EVENTS = {
  UPLOADED: 'transcript.uploaded',
  PROCESSING_STARTED: 'transcript.processing.started',
  PROCESSING_COMPLETED: 'transcript.processing.completed',
  FAILED: 'transcript.processing.failed',
  CLEANED: 'transcript.cleaned',
  TITLE_GENERATED: 'transcript.title.generated',
  STATUS_CHANGED: 'transcript.status.changed',
  DELETED: 'transcript.deleted',
  INSIGHTS_EXTRACTED: 'transcript.insights.extracted',
} as const;