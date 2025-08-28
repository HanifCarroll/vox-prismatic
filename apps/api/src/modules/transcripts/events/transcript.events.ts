import { TranscriptEntity } from '../entities/transcript.entity';

export const TRANSCRIPT_EVENTS = {
  PROCESSING_COMPLETED: 'transcript.processing.completed',
  UPLOADED: 'transcript.uploaded',
  FAILED: 'transcript.processing.failed'
} as const;

export interface TranscriptProcessingCompletedEvent {
  transcriptId: string;
  transcript: TranscriptEntity;
  status: string;
  timestamp: Date;
}

export interface TranscriptUploadedEvent {
  transcriptId: string;
  transcript: TranscriptEntity;
  timestamp: Date;
}

export interface TranscriptProcessingFailedEvent {
  transcriptId: string;
  transcript?: TranscriptEntity;
  error: string;
  timestamp: Date;
}