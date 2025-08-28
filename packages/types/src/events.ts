/**
 * Processing Event Types
 * Types for real-time processing event notifications
 */

import { QueueJobStatus } from './queue';

export enum ProcessingEventType {
  JOB_STARTED = 'job.started',
  JOB_PROGRESS = 'job.progress',
  JOB_COMPLETED = 'job.completed',
  JOB_FAILED = 'job.failed',
  JOB_RETRYING = 'job.retrying',
  JOB_STALLED = 'job.stalled'
}

export type EntityType = 'transcript' | 'insight' | 'post';

export interface ProcessingEventPayload {
  status?: QueueJobStatus;
  progress?: number;
  error?: string;
  result?: any;
  message?: string;
}

export interface ProcessingEvent {
  type: ProcessingEventType;
  jobId: string;
  entityType: EntityType;
  entityId: string;
  payload: ProcessingEventPayload;
  timestamp: string;
}

/**
 * Server-Sent Event format for processing updates
 */
export interface ProcessingSSEEvent {
  id?: string;
  event: ProcessingEventType;
  data: ProcessingEvent;
}

/**
 * Notification preferences for processing events
 */
export interface ProcessingNotificationPreferences {
  showStarted: boolean;
  showProgress: boolean;
  showCompleted: boolean;
  showFailed: boolean;
  soundEnabled: boolean;
}

/**
 * Default notification preferences
 */
export const DEFAULT_PROCESSING_NOTIFICATIONS: ProcessingNotificationPreferences = {
  showStarted: false,
  showProgress: false,
  showCompleted: true,
  showFailed: true,
  soundEnabled: false,
};