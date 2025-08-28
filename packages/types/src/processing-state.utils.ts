/**
 * Processing State Utilities
 * Helper functions for computing and checking processing states
 */

import type { QueueJob, ProcessingState } from './queue';
import { QueueJobStatus } from './queue';

/**
 * Compute processing state from a queue job
 */
export function computeProcessingState(job?: QueueJob | null): ProcessingState | undefined {
  if (!job) return undefined;
  
  const isProcessing = job.status === QueueJobStatus.ACTIVE;
  
  let currentStep: ProcessingState['currentStep'];
  if (job.queueName.includes('clean')) {
    currentStep = 'cleaning';
  } else if (job.queueName.includes('extract')) {
    currentStep = 'extracting';
  } else if (job.queueName.includes('generate')) {
    currentStep = 'generating';
  } else if (job.queueName.includes('publish')) {
    currentStep = 'publishing';
  }
  
  // Calculate estimated time based on progress
  // TODO: Implement based on historical data
  let estimatedTimeRemaining: number | undefined;
  if (isProcessing && job.progress > 0 && job.progress < 100) {
    // Simple estimation: if we're at X% progress after Y seconds
    // then total time is Y / (X/100) seconds
    const processingTime = job.timestamps.processed 
      ? (Date.now() - new Date(job.timestamps.processed).getTime()) / 1000
      : 0;
    
    if (processingTime > 0 && job.progress > 0) {
      const totalEstimatedTime = processingTime / (job.progress / 100);
      estimatedTimeRemaining = Math.max(0, totalEstimatedTime - processingTime);
    }
  }
  
  return {
    isProcessing,
    currentStep,
    progress: job.progress,
    estimatedTimeRemaining,
    queueJob: job
  };
}

/**
 * Check if an entity is currently being processed
 */
export function isEntityProcessing(entity: { queueJob?: QueueJob | null }): boolean {
  return entity.queueJob?.status === QueueJobStatus.ACTIVE;
}

/**
 * Check if an entity has failed processing
 */
export function isEntityFailed(entity: { queueJob?: QueueJob | null; status?: string }): boolean {
  // Check both queue job status and entity status
  return entity.queueJob?.status === QueueJobStatus.FAILED || entity.status === 'failed';
}

/**
 * Check if an entity is waiting in queue
 */
export function isEntityWaiting(entity: { queueJob?: QueueJob | null }): boolean {
  return entity.queueJob?.status === QueueJobStatus.WAITING || 
         entity.queueJob?.status === QueueJobStatus.PENDING;
}

/**
 * Check if an entity has completed processing
 */
export function isEntityCompleted(entity: { queueJob?: QueueJob | null }): boolean {
  return entity.queueJob?.status === QueueJobStatus.COMPLETED;
}

/**
 * Get a human-readable status message
 */
export function getProcessingStatusMessage(state?: ProcessingState): string {
  if (!state) return '';
  
  if (!state.isProcessing) {
    if (state.queueJob?.status === QueueJobStatus.FAILED) {
      return 'Processing failed';
    }
    if (state.queueJob?.status === QueueJobStatus.COMPLETED) {
      return 'Processing complete';
    }
    if (state.queueJob?.status === QueueJobStatus.WAITING) {
      return 'Waiting in queue';
    }
    return 'Ready';
  }
  
  switch (state.currentStep) {
    case 'cleaning':
      return `Cleaning transcript... ${state.progress}%`;
    case 'extracting':
      return `Extracting insights... ${state.progress}%`;
    case 'generating':
      return `Generating posts... ${state.progress}%`;
    case 'publishing':
      return `Publishing... ${state.progress}%`;
    default:
      return `Processing... ${state.progress}%`;
  }
}

/**
 * Get error message from a failed job
 */
export function getJobErrorMessage(job?: QueueJob | null): string | undefined {
  if (!job || job.status !== QueueJobStatus.FAILED) {
    return undefined;
  }
  
  return job.error?.message || 'Processing failed';
}