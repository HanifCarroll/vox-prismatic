/**
 * SSE (Server-Sent Events) Client
 * Handles real-time updates from backend workflow operations
 * Uses @microsoft/fetch-event-source for robust SSE handling with automatic reconnection
 */

import { fetchEventSource } from '@microsoft/fetch-event-source';
import { getApiBaseUrl } from './api-config';
import type { QueueJobStatus, PipelineStatus, PipelineStage, BlockingItem } from '@content-creation/types';

export const API_BASE_URL = getApiBaseUrl();

export interface JobEvent {
  type: 'job.started' | 'job.progress' | 'job.completed' | 'job.failed' | 'job.cancelled' | 'job.stalled';
  jobId: string;
  queueName: string;
  timestamp: string;
  data: {
    progress?: number;
    result?: Record<string, unknown>;
    error?: { message: string; stack?: string };
    duration?: number;
    attemptsMade?: number;
    maxAttempts?: number;
  };
}

export interface PipelineEvent {
  type: 'pipeline.stage_started' | 'pipeline.stage_completed' | 'pipeline.stage_failed' | 'pipeline.blocked' | 'pipeline.completed';
  transcriptId: string;
  pipelineId?: string;
  stage: PipelineStage;
  timestamp: string;
  data: {
    progress?: number;
    estimatedTimeRemaining?: number;
    blockingItems?: BlockingItem[];
    error?: string;
  };
}

export type WorkflowEvent = JobEvent | PipelineEvent;

export interface SSEConnection {
  controller: AbortController;
  cleanup: () => void;
}

/**
 * Custom error classes for SSE handling
 */
class RetriableError extends Error {}
class FatalError extends Error {}

/**
 * Create SSE connection for job monitoring
 */
export function createJobSSEConnection(
  jobId: string,
  onEvent: (event: JobEvent) => void,
  onError?: (error: Error) => void,
  onOpen?: () => void
): SSEConnection {
  const url = `${API_BASE_URL}/api/content-processing/events/${jobId}`;
  const controller = new AbortController();
  let autoCloseTimeout: NodeJS.Timeout | null = null;

  fetchEventSource(url, {
    signal: controller.signal,
    
    async onopen(response) {
      if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
        onOpen?.();
        return; // Connection is good
      } else if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        // Client-side errors are usually non-retriable
        throw new FatalError(`Failed to connect: ${response.status}`);
      } else {
        // Server errors are retriable
        throw new RetriableError(`Server error: ${response.status}`);
      }
    },
    
    onmessage(msg) {
      try {
        const eventData: JobEvent = JSON.parse(msg.data);
        onEvent(eventData);
        
        // Auto-cleanup on job completion/failure
        if (eventData.type === 'job.completed' || eventData.type === 'job.failed') {
          autoCloseTimeout = setTimeout(() => controller.abort(), 1000);
        }
      } catch (error) {
        console.error('Failed to parse SSE event:', error);
      }
    },
    
    onclose() {
      // Connection closed by server, retry
      throw new RetriableError('Connection closed');
    },
    
    onerror(err) {
      if (err instanceof FatalError) {
        onError?.(err);
        throw err; // Stop retrying
      } else {
        onError?.(err);
        // Return nothing to use default retry behavior with exponential backoff
      }
    },
    
    openWhenHidden: true, // Keep connection when tab is in background
  });

  return {
    controller,
    cleanup: () => {
      if (autoCloseTimeout) {
        clearTimeout(autoCloseTimeout);
      }
      controller.abort();
    },
  };
}

/**
 * Create SSE connection for pipeline monitoring
 */
export function createPipelineSSEConnection(
  transcriptId: string,
  onEvent: (event: PipelineEvent) => void,
  onError?: (error: Error) => void,
  onOpen?: () => void
): SSEConnection {
  const url = `${API_BASE_URL}/api/pipelines/transcript/${transcriptId}/events`;
  const controller = new AbortController();
  let autoCloseTimeout: NodeJS.Timeout | null = null;

  fetchEventSource(url, {
    signal: controller.signal,
    
    async onopen(response) {
      if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
        onOpen?.();
        return;
      } else if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new FatalError(`Failed to connect: ${response.status}`);
      } else {
        throw new RetriableError(`Server error: ${response.status}`);
      }
    },
    
    onmessage(msg) {
      try {
        const eventData: PipelineEvent = JSON.parse(msg.data);
        onEvent(eventData);
        
        // Auto-cleanup on pipeline completion
        if (eventData.type === 'pipeline.completed') {
          autoCloseTimeout = setTimeout(() => controller.abort(), 2000);
        }
      } catch (error) {
        console.error('Failed to parse pipeline SSE event:', error);
      }
    },
    
    onclose() {
      throw new RetriableError('Connection closed');
    },
    
    onerror(err) {
      if (err instanceof FatalError) {
        onError?.(err);
        throw err;
      } else {
        onError?.(err);
        // Use default retry with exponential backoff
      }
    },
    
    openWhenHidden: true,
  });

  return {
    controller,
    cleanup: () => {
      if (autoCloseTimeout) {
        clearTimeout(autoCloseTimeout);
      }
      controller.abort();
    },
  };
}

/**
 * Create SSE connection for general workflow events
 */
export function createWorkflowSSEConnection(
  onEvent: (event: WorkflowEvent) => void,
  onError?: (error: Error) => void,
  onOpen?: () => void
): SSEConnection {
  const url = `${API_BASE_URL}/api/content-processing/events`;
  const controller = new AbortController();

  fetchEventSource(url, {
    signal: controller.signal,
    
    async onopen(response) {
      if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
        onOpen?.();
        return;
      } else if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new FatalError(`Failed to connect: ${response.status}`);
      } else {
        throw new RetriableError(`Server error: ${response.status}`);
      }
    },
    
    onmessage(msg) {
      try {
        // Handle both named events and default messages
        const eventData: WorkflowEvent = msg.event 
          ? { type: msg.event as any, ...JSON.parse(msg.data) }
          : JSON.parse(msg.data);
        onEvent(eventData);
      } catch (error) {
        console.error('Failed to parse workflow SSE event:', error);
      }
    },
    
    onclose() {
      // For general workflow events, always retry
      throw new RetriableError('Connection closed');
    },
    
    onerror(err) {
      if (err instanceof FatalError) {
        onError?.(err);
        throw err;
      } else {
        onError?.(err);
        // Always retry for general workflow events
      }
    },
    
    openWhenHidden: true,
  });

  return {
    controller,
    cleanup: () => {
      controller.abort();
    },
  };
}

