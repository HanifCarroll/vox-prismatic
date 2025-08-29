/**
 * Queue Job Types
 * Types for tracking background processing jobs and their states
 */

import { QueueJobStatus } from './enums';

export interface QueueJobError {
  message: string;
  stack?: string;
  code?: string;
}

export interface QueueJobTimestamps {
  created: string;
  processed?: string;
  completed?: string;
  failed?: string;
}

export interface QueueJob {
  id: string;
  queueName: string;
  status: QueueJobStatus; // Now imported from enums
  progress: number; // 0-100
  error?: QueueJobError;
  attemptsMade: number;
  maxAttempts: number;
  data?: any;
  result?: any;
  timestamps: QueueJobTimestamps;
}

export interface ProcessingState {
  isProcessing: boolean;
  currentStep?: 'cleaning' | 'extracting' | 'generating' | 'publishing';
  progress: number;
  estimatedTimeRemaining?: number; // seconds
  queueJob?: QueueJob;
}

/**
 * Queue names used in the system
 */
export const QUEUE_NAMES = {
  CLEAN_TRANSCRIPT: 'content:clean-transcript',
  EXTRACT_INSIGHTS: 'content:extract-insights',
  GENERATE_POSTS: 'content:generate-posts',
  PUBLISH_POST: 'publisher:publish-post',
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

/**
 * Helper to determine queue name from job ID
 */
export function getQueueNameFromJobId(jobId: string): QueueName | null {
  if (jobId.startsWith('clean-transcript-')) {
    return QUEUE_NAMES.CLEAN_TRANSCRIPT;
  }
  if (jobId.startsWith('extract-insights-')) {
    return QUEUE_NAMES.EXTRACT_INSIGHTS;
  }
  if (jobId.startsWith('generate-posts-')) {
    return QUEUE_NAMES.GENERATE_POSTS;
  }
  if (jobId.startsWith('publish-post-')) {
    return QUEUE_NAMES.PUBLISH_POST;
  }
  return null;
}

/**
 * Helper to extract entity ID from job ID
 */
export function getEntityIdFromJobId(jobId: string): string | null {
  const patterns = [
    /^clean-transcript-(.+)$/,
    /^extract-insights-(.+)$/,
    /^generate-posts-(.+)$/,
    /^publish-post-(.+)$/,
  ];
  
  for (const pattern of patterns) {
    const match = jobId.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}